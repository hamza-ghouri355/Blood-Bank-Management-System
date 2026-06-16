// controllers/donationController.js

const { all, get, run } = require('../db/dbHelpers');

const VALID_BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

// GET /api/donations
async function getAllDonations(req, res) {
    try {
        const sql = `
            SELECT d.donation_id, d.donor_id, dn.full_name AS donor_name,
                   d.unit_id, d.donation_date, d.volume_ml, d.notes
            FROM donations d
            JOIN donors dn ON dn.donor_id = d.donor_id
            ORDER BY d.donation_date DESC, d.donation_id DESC
        `;
        const donations = await all(sql);
        res.json(donations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/donations/recent?limit=5
async function getRecentDonations(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const sql = `
            SELECT d.donation_id, d.donor_id, dn.full_name AS donor_name,
                   d.unit_id, d.donation_date, d.volume_ml
            FROM donations d
            JOIN donors dn ON dn.donor_id = d.donor_id
            ORDER BY d.donation_date DESC, d.donation_id DESC
            LIMIT ?
        `;
        const donations = await all(sql, [limit]);
        res.json(donations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /api/donations/:id
async function getDonationById(req, res) {
    try {
        const donation = await get(
            `SELECT d.*, dn.full_name AS donor_name
             FROM donations d JOIN donors dn ON dn.donor_id = d.donor_id
             WHERE d.donation_id = ?`,
            [req.params.id]
        );
        if (!donation) return res.status(404).json({ error: 'Donation not found' });
        res.json(donation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /api/donations
// Creates a donation record. Two modes:
//  1. unit_id provided -> link donation to an existing inventory unit
//  2. unit_id NOT provided -> create a new inventory unit from this donation
//     (requires blood_type, collection_date, expiry_date, storage_location)
// The trg_donation_update_donor trigger automatically updates the donor's
// last_donation_date and eligibility_status.
async function createDonation(req, res) {
    try {
        const {
            donor_id, unit_id, donation_date, volume_ml, notes,
            blood_type, expiry_date, storage_location
        } = req.body;

        if (!donor_id || !donation_date || !volume_ml) {
            return res.status(400).json({ error: 'donor_id, donation_date, and volume_ml are required' });
        }

        const donor = await get('SELECT * FROM donors WHERE donor_id = ?', [donor_id]);
        if (!donor) return res.status(404).json({ error: 'Donor not found' });

        let finalUnitId = unit_id;

        if (!finalUnitId) {
            // Create a new inventory unit from this donation
            if (!blood_type || !expiry_date || !storage_location) {
                return res.status(400).json({
                    error: 'When unit_id is not provided, blood_type, expiry_date, and storage_location are required to create a new inventory unit'
                });
            }
            if (!VALID_BLOOD_TYPES.includes(blood_type)) {
                return res.status(400).json({ error: 'Invalid blood_type' });
            }
            if (new Date(expiry_date) <= new Date(donation_date)) {
                return res.status(400).json({ error: 'expiry_date must be after donation_date (collection_date)' });
            }

            const invResult = await run(
                `INSERT INTO blood_inventory
                    (blood_type, volume_ml, collection_date, expiry_date, storage_location, status, donor_id)
                 VALUES (?, ?, ?, ?, ?, 'Available', ?)`,
                [blood_type, volume_ml, donation_date, expiry_date, storage_location, donor_id]
            );
            finalUnitId = invResult.lastID;
        } else {
            const unit = await get('SELECT * FROM blood_inventory WHERE unit_id = ?', [finalUnitId]);
            if (!unit) return res.status(404).json({ error: 'Inventory unit not found' });
        }

        const result = await run(
            `INSERT INTO donations (donor_id, unit_id, donation_date, volume_ml, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [donor_id, finalUnitId, donation_date, volume_ml, notes || null]
        );

        const newDonation = await get(
            `SELECT d.*, dn.full_name AS donor_name
             FROM donations d JOIN donors dn ON dn.donor_id = d.donor_id
             WHERE d.donation_id = ?`,
            [result.lastID]
        );
        res.status(201).json(newDonation);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'This inventory unit is already linked to a donation' });
        }
        res.status(500).json({ error: err.message });
    }
}

// DELETE /api/donations/:id
async function deleteDonation(req, res) {
    try {
        const result = await run('DELETE FROM donations WHERE donation_id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Donation not found' });
        res.json({ message: 'Donation deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllDonations,
    getRecentDonations,
    getDonationById,
    createDonation,
    deleteDonation
};
