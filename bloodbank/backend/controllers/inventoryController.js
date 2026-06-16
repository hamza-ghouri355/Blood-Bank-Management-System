// controllers/inventoryController.js

const { all, get, run } = require('../db/dbHelpers');

const VALID_BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const VALID_STATUSES = ['Available','Reserved','Expired','Used'];

// GET /api/inventory
async function getAllInventory(req, res) {
    try {
        const { blood_type, status } = req.query;
        let sql = 'SELECT * FROM blood_inventory WHERE 1=1';
        const params = [];

        if (blood_type) {
            sql += ' AND blood_type = ?';
            params.push(blood_type);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        sql += ' ORDER BY expiry_date ASC';

        const units = await all(sql, params);
        res.json(units);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/inventory/:id
async function getInventoryById(req, res) {
    try {
        const unit = await get('SELECT * FROM blood_inventory WHERE unit_id = ?', [req.params.id]);
        if (!unit) return res.status(404).json({ error: 'Inventory unit not found' });
        res.json(unit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/inventory
async function createInventory(req, res) {
    try {
        const { blood_type, volume_ml, collection_date, expiry_date, storage_location, status, donor_id } = req.body;

        if (!blood_type || !volume_ml || !collection_date || !expiry_date || !storage_location) {
            return res.status(400).json({ error: 'blood_type, volume_ml, collection_date, expiry_date, storage_location are required' });
        }
        if (!VALID_BLOOD_TYPES.includes(blood_type)) {
            return res.status(400).json({ error: 'Invalid blood_type' });
        }
        if (new Date(expiry_date) <= new Date(collection_date)) {
            return res.status(400).json({ error: 'expiry_date must be after collection_date' });
        }
        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await run(
            `INSERT INTO blood_inventory
                (blood_type, volume_ml, collection_date, expiry_date, storage_location, status, donor_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [blood_type, volume_ml, collection_date, expiry_date, storage_location, status || 'Available', donor_id || null]
        );

        const newUnit = await get('SELECT * FROM blood_inventory WHERE unit_id = ?', [result.lastID]);
        res.status(201).json(newUnit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// PUT /api/inventory/:id
async function updateInventory(req, res) {
    try {
        const { id } = req.params;
        const existing = await get('SELECT * FROM blood_inventory WHERE unit_id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'Inventory unit not found' });

        const {
            blood_type = existing.blood_type,
            volume_ml = existing.volume_ml,
            collection_date = existing.collection_date,
            expiry_date = existing.expiry_date,
            storage_location = existing.storage_location,
            status = existing.status,
            donor_id = existing.donor_id
        } = req.body;

        if (new Date(expiry_date) <= new Date(collection_date)) {
            return res.status(400).json({ error: 'expiry_date must be after collection_date' });
        }

        await run(
            `UPDATE blood_inventory SET
                blood_type = ?, volume_ml = ?, collection_date = ?, expiry_date = ?,
                storage_location = ?, status = ?, donor_id = ?
             WHERE unit_id = ?`,
            [blood_type, volume_ml, collection_date, expiry_date, storage_location, status, donor_id, id]
        );

        const updated = await get('SELECT * FROM blood_inventory WHERE unit_id = ?', [id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// DELETE /api/inventory/:id
async function deleteInventory(req, res) {
    try {
        const result = await run('DELETE FROM blood_inventory WHERE unit_id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Inventory unit not found' });
        res.json({ message: 'Inventory unit deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/inventory/summary/available  -> uses available_blood_summary view
async function getAvailableSummary(req, res) {
    try {
        const rows = await all('SELECT * FROM available_blood_summary ORDER BY blood_type');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/inventory/summary/expiring  -> uses expiring_soon view
async function getExpiringSoon(req, res) {
    try {
        const rows = await all('SELECT * FROM expiring_soon ORDER BY expiry_date ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/inventory/check-expiry
// Manually triggers an expiry sweep (since SQLite has no cron).
// Marks all 'Available' units past their expiry date as 'Expired'.
async function runExpiryCheck(req, res) {
    try {
        const result = await run(
            `UPDATE blood_inventory
             SET status = 'Expired'
             WHERE status = 'Available' AND date(expiry_date) < date('now')`
        );
        res.json({ message: 'Expiry check complete', units_marked_expired: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllInventory,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory,
    getAvailableSummary,
    getExpiringSoon,
    runExpiryCheck
};
