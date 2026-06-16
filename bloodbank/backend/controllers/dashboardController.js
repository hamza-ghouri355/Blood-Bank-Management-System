// controllers/dashboardController.js

const { all, get } = require('../db/dbHelpers');

// GET /api/dashboard
// Returns: total inventory units, expiring units (within 7 days),
// pending emergency requests count, recent donations
async function getDashboardSummary(req, res) {
    try {
        const totalUnits = await get(
            `SELECT COUNT(*) AS count, COALESCE(SUM(volume_ml), 0) AS total_volume_ml
             FROM blood_inventory WHERE status = 'Available'`
        );

        const expiringSoon = await all('SELECT * FROM expiring_soon ORDER BY expiry_date ASC');

        const pendingRequests = await get(
            `SELECT COUNT(*) AS count FROM emergency_requests WHERE status = 'pending'`
        );

        const criticalPending = await get(
            `SELECT COUNT(*) AS count FROM emergency_requests WHERE status = 'pending' AND urgency_level = 'critical'`
        );

        const recentDonations = await all(
            `SELECT d.donation_id, d.donor_id, dn.full_name AS donor_name,
                    d.unit_id, d.donation_date, d.volume_ml
             FROM donations d JOIN donors dn ON dn.donor_id = d.donor_id
             ORDER BY d.donation_date DESC, d.donation_id DESC
             LIMIT 5`
        );

        const bloodTypeSummary = await all('SELECT * FROM available_blood_summary ORDER BY blood_type');

        const totalDonors = await get('SELECT COUNT(*) AS count FROM donors');
        const eligibleDonors = await get(`SELECT COUNT(*) AS count FROM donors WHERE eligibility_status = 'Eligible'`);
        const totalHospitals = await get('SELECT COUNT(*) AS count FROM hospitals');

        res.json({
            total_available_units: totalUnits.count,
            total_available_volume_ml: totalUnits.total_volume_ml,
            expiring_soon: expiringSoon,
            expiring_soon_count: expiringSoon.length,
            pending_requests_count: pendingRequests.count,
            critical_pending_count: criticalPending.count,
            recent_donations: recentDonations,
            blood_type_summary: bloodTypeSummary,
            total_donors: totalDonors.count,
            eligible_donors: eligibleDonors.count,
            total_hospitals: totalHospitals.count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getDashboardSummary };
