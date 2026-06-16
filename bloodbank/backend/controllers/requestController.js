// controllers/requestController.js

const { all, get, run, db } = require('../db/dbHelpers');

const VALID_BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const VALID_URGENCY = ['low','medium','critical'];
const VALID_STATUSES = ['pending','fulfilled','partially_fulfilled','rejected'];

// GET /api/requests
async function getAllRequests(req, res) {
    try {
        const { status, urgency_level, blood_type } = req.query;
        let sql = `
            SELECT r.*, h.name AS hospital_name
            FROM emergency_requests r
            JOIN hospitals h ON h.hospital_id = r.hospital_id
            WHERE 1=1
        `;
        const params = [];

        if (status) { sql += ' AND r.status = ?'; params.push(status); }
        if (urgency_level) { sql += ' AND r.urgency_level = ?'; params.push(urgency_level); }
        if (blood_type) { sql += ' AND r.blood_type = ?'; params.push(blood_type); }

        sql += ' ORDER BY r.request_date DESC';

        const requests = await all(sql, params);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/requests/pending
async function getPendingRequests(req, res) {
    try {
        const sql = `
            SELECT r.*, h.name AS hospital_name
            FROM emergency_requests r
            JOIN hospitals h ON h.hospital_id = r.hospital_id
            WHERE r.status = 'pending'
            ORDER BY
                CASE r.urgency_level WHEN 'critical' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                r.request_date ASC
        `;
        const requests = await all(sql);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/requests/:id
async function getRequestById(req, res) {
    try {
        const request = await get(
            `SELECT r.*, h.name AS hospital_name
             FROM emergency_requests r JOIN hospitals h ON h.hospital_id = r.hospital_id
             WHERE r.request_id = ?`,
            [req.params.id]
        );
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Include allocated units for this request
        const allocations = await all(
            `SELECT f.fulfillment_id, f.unit_id, f.allocated_at, i.blood_type, i.volume_ml, i.expiry_date
             FROM request_fulfillment f JOIN blood_inventory i ON i.unit_id = f.unit_id
             WHERE f.request_id = ?`,
            [req.params.id]
        );

        res.json({ ...request, allocations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/requests
async function createRequest(req, res) {
    try {
        const { hospital_id, blood_type, units_requested, urgency_level, notes } = req.body;

        if (!hospital_id || !blood_type || !units_requested || !urgency_level) {
            return res.status(400).json({ error: 'hospital_id, blood_type, units_requested, urgency_level are required' });
        }
        if (!VALID_BLOOD_TYPES.includes(blood_type)) {
            return res.status(400).json({ error: 'Invalid blood_type' });
        }
        if (!VALID_URGENCY.includes(urgency_level)) {
            return res.status(400).json({ error: 'Invalid urgency_level' });
        }

        const hospital = await get('SELECT * FROM hospitals WHERE hospital_id = ?', [hospital_id]);
        if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

        const result = await run(
            `INSERT INTO emergency_requests (hospital_id, blood_type, units_requested, urgency_level, status, notes)
             VALUES (?, ?, ?, ?, 'pending', ?)`,
            [hospital_id, blood_type, units_requested, urgency_level, notes || null]
        );

        const newRequest = await get(
            `SELECT r.*, h.name AS hospital_name
             FROM emergency_requests r JOIN hospitals h ON h.hospital_id = r.hospital_id
             WHERE r.request_id = ?`,
            [result.lastID]
        );
        res.status(201).json(newRequest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// PUT /api/requests/:id/reject
async function rejectRequest(req, res) {
    try {
        const { id } = req.params;
        const request = await get('SELECT * FROM emergency_requests WHERE request_id = ?', [id]);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'pending') {
            return res.status(400).json({ error: `Cannot reject a request with status '${request.status}'` });
        }

        await run(
            `UPDATE emergency_requests SET status = 'rejected', resolved_date = CURRENT_TIMESTAMP WHERE request_id = ?`,
            [id]
        );

        const updated = await get('SELECT * FROM emergency_requests WHERE request_id = ?', [id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// =====================================================
// "STORED PROCEDURE" A: process_emergency_request
// Atomic transaction:
//   1. Check availability of requested blood type
//   2. Allocate (deduct) available units up to units_requested
//   3. Log each allocation in request_fulfillment
//      (trigger auto-marks inventory as 'Used' and updates request status)
//   4. If insufficient stock -> allocate what's available, mark 'partially_fulfilled'
//      If zero available -> leave 'pending' and report shortage
// =====================================================
// POST /api/requests/:id/fulfill
async function fulfillRequest(req, res) {
    const { id } = req.params;

    try {
        const request = await get('SELECT * FROM emergency_requests WHERE request_id = ?', [id]);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        if (request.status === 'fulfilled' || request.status === 'rejected') {
            return res.status(400).json({ error: `Request already has status '${request.status}'` });
        }

        const alreadyAllocated = await get(
            'SELECT COUNT(*) AS cnt FROM request_fulfillment WHERE request_id = ?',
            [id]
        );
        const remainingNeeded = request.units_requested - alreadyAllocated.cnt;

        if (remainingNeeded <= 0) {
            return res.status(400).json({ error: 'Request already fully allocated' });
        }

        // Step 1: Check availability (FIFO by soonest-expiring first)
        const availableUnits = await all(
            `SELECT unit_id FROM blood_inventory
             WHERE blood_type = ? AND status = 'Available'
             ORDER BY expiry_date ASC
             LIMIT ?`,
            [request.blood_type, remainingNeeded]
        );

        if (availableUnits.length === 0) {
            return res.status(200).json({
                message: 'No available units in inventory for this blood type. Request remains pending.',
                request_id: Number(id),
                units_allocated: 0,
                units_still_needed: remainingNeeded,
                status: request.status
            });
        }

        // Step 2 & 3: Run as a transaction - insert into request_fulfillment for each unit.
        // The trg_fulfillment_update_inventory trigger marks each unit as 'Used'
        // and recomputes the request's status (fulfilled / partially_fulfilled).
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                let hadError = false;
                let pending = availableUnits.length;

                if (pending === 0) {
                    db.run('COMMIT', () => resolve());
                    return;
                }

                for (const unit of availableUnits) {
                    db.run(
                        'INSERT INTO request_fulfillment (request_id, unit_id) VALUES (?, ?)',
                        [id, unit.unit_id],
                        (err) => {
                            if (err && !hadError) {
                                hadError = true;
                                db.run('ROLLBACK', () => reject(err));
                                return;
                            }
                            pending--;
                            if (pending === 0 && !hadError) {
                                db.run('COMMIT', (commitErr) => {
                                    if (commitErr) reject(commitErr);
                                    else resolve();
                                });
                            }
                        }
                    );
                }
            });
        });

        const updatedRequest = await get('SELECT * FROM emergency_requests WHERE request_id = ?', [id]);
        const allocatedCount = availableUnits.length;
        const stillNeeded = remainingNeeded - allocatedCount;

        res.json({
            message: stillNeeded > 0
                ? `Partially fulfilled: ${allocatedCount} unit(s) allocated, ${stillNeeded} unit(s) still needed.`
                : `Request fully fulfilled with ${allocatedCount} unit(s).`,
            request_id: Number(id),
            units_allocated: allocatedCount,
            units_still_needed: Math.max(stillNeeded, 0),
            status: updatedRequest.status,
            allocated_unit_ids: availableUnits.map(u => u.unit_id)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllRequests,
    getPendingRequests,
    getRequestById,
    createRequest,
    rejectRequest,
    fulfillRequest
};
