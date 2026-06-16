// controllers/hospitalController.js

const { all, get, run } = require('../db/dbHelpers');

// GET /api/hospitals
async function getAllHospitals(req, res) {
    try {
        const hospitals = await all('SELECT * FROM hospitals ORDER BY hospital_id DESC');
        res.json(hospitals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/hospitals/:id
async function getHospitalById(req, res) {
    try {
        const hospital = await get('SELECT * FROM hospitals WHERE hospital_id = ?', [req.params.id]);
        if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
        res.json(hospital);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/hospitals
async function createHospital(req, res) {
    try {
        const { name, contact_person, phone, email, address } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: 'name and phone are required' });
        }

        const result = await run(
            `INSERT INTO hospitals (name, contact_person, phone, email, address)
             VALUES (?, ?, ?, ?, ?)`,
            [name, contact_person || null, phone, email || null, address || null]
        );

        const newHospital = await get('SELECT * FROM hospitals WHERE hospital_id = ?', [result.lastID]);
        res.status(201).json(newHospital);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'A hospital with this name, phone, or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
}

// PUT /api/hospitals/:id
async function updateHospital(req, res) {
    try {
        const { id } = req.params;
        const existing = await get('SELECT * FROM hospitals WHERE hospital_id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'Hospital not found' });

        const {
            name = existing.name,
            contact_person = existing.contact_person,
            phone = existing.phone,
            email = existing.email,
            address = existing.address
        } = req.body;

        await run(
            `UPDATE hospitals SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?
             WHERE hospital_id = ?`,
            [name, contact_person, phone, email, address, id]
        );

        const updated = await get('SELECT * FROM hospitals WHERE hospital_id = ?', [id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// DELETE /api/hospitals/:id
async function deleteHospital(req, res) {
    try {
        const result = await run('DELETE FROM hospitals WHERE hospital_id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Hospital not found' });
        res.json({ message: 'Hospital deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllHospitals,
    getHospitalById,
    createHospital,
    updateHospital,
    deleteHospital
};
