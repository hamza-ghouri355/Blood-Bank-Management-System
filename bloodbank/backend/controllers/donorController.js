// controllers/donorController.js

const { all, get, run } = require('../db/dbHelpers');

const ELIGIBILITY_GAP_DAYS = 90;

// Helper: compute eligibility status based on last_donation_date
function computeEligibility(lastDonationDate) {
    if (!lastDonationDate) return 'Eligible';
    const last = new Date(lastDonationDate);
    const now = new Date();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    return diffDays >= ELIGIBILITY_GAP_DAYS ? 'Eligible' : 'Not Eligible';
}

// GET /api/donors
async function getAllDonors(req, res) {
    try {
        const { blood_type, eligibility_status } = req.query;
        let sql = 'SELECT * FROM donors WHERE 1=1';
        const params = [];

        if (blood_type) {
            sql += ' AND blood_type = ?';
            params.push(blood_type);
        }
        if (eligibility_status) {
            sql += ' AND eligibility_status = ?';
            params.push(eligibility_status);
        }
        sql += ' ORDER BY donor_id DESC';

        const donors = await all(sql, params);
        res.json(donors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/donors/:id
async function getDonorById(req, res) {
    try {
        const donor = await get('SELECT * FROM donors WHERE donor_id = ?', [req.params.id]);
        if (!donor) return res.status(404).json({ error: 'Donor not found' });
        res.json(donor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/donors
async function createDonor(req, res) {
    try {
        const { full_name, blood_type, gender, date_of_birth, phone, email, address, last_donation_date } = req.body;

        if (!full_name || !blood_type || !phone) {
            return res.status(400).json({ error: 'full_name, blood_type, and phone are required' });
        }

        const validTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
        if (!validTypes.includes(blood_type)) {
            return res.status(400).json({ error: 'Invalid blood_type' });
        }

        const eligibility_status = computeEligibility(last_donation_date);

        const result = await run(
            `INSERT INTO donors
                (full_name, blood_type, gender, date_of_birth, phone, email, address, last_donation_date, eligibility_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, blood_type, gender || null, date_of_birth || null, phone, email || null, address || null, last_donation_date || null, eligibility_status]
        );

        const newDonor = await get('SELECT * FROM donors WHERE donor_id = ?', [result.lastID]);
        res.status(201).json(newDonor);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'A donor with this phone or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
}

// PUT /api/donors/:id
async function updateDonor(req, res) {
    try {
        const { id } = req.params;
        const existing = await get('SELECT * FROM donors WHERE donor_id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'Donor not found' });

        const {
            full_name = existing.full_name,
            blood_type = existing.blood_type,
            gender = existing.gender,
            date_of_birth = existing.date_of_birth,
            phone = existing.phone,
            email = existing.email,
            address = existing.address,
            last_donation_date = existing.last_donation_date
        } = req.body;

        const eligibility_status = computeEligibility(last_donation_date);

        await run(
            `UPDATE donors SET
                full_name = ?, blood_type = ?, gender = ?, date_of_birth = ?,
                phone = ?, email = ?, address = ?, last_donation_date = ?, eligibility_status = ?
             WHERE donor_id = ?`,
            [full_name, blood_type, gender, date_of_birth, phone, email, address, last_donation_date, eligibility_status, id]
        );

        const updated = await get('SELECT * FROM donors WHERE donor_id = ?', [id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// DELETE /api/donors/:id
async function deleteDonor(req, res) {
    try {
        const result = await run('DELETE FROM donors WHERE donor_id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Donor not found' });
        res.json({ message: 'Donor deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/donors/:id/recalculate-eligibility
// Implements "stored procedure" b: calculate donor eligibility based on last donation date
async function recalculateEligibility(req, res) {
    try {
        const { id } = req.params;
        const donor = await get('SELECT * FROM donors WHERE donor_id = ?', [id]);
        if (!donor) return res.status(404).json({ error: 'Donor not found' });

        const eligibility_status = computeEligibility(donor.last_donation_date);

        await run('UPDATE donors SET eligibility_status = ? WHERE donor_id = ?', [eligibility_status, id]);

        const updated = await get('SELECT * FROM donors WHERE donor_id = ?', [id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllDonors,
    getDonorById,
    createDonor,
    updateDonor,
    deleteDonor,
    recalculateEligibility,
    computeEligibility
};
