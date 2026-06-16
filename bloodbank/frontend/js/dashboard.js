// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('dashboard');
    loadDashboard();
});

async function loadDashboard() {
    const alertBox = document.getElementById('alert-box');
    try {
        const data = await api.get('/dashboard');

        // Stat cards
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Available Units</div>
                <div class="stat-value">${data.total_available_units}</div>
                <div class="text-muted">${data.total_available_volume_ml} ml total</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">Expiring Within 7 Days</div>
                <div class="stat-value">${data.expiring_soon_count}</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-label">Pending Requests</div>
                <div class="stat-value">${data.pending_requests_count}</div>
                <div class="text-muted">${data.critical_pending_count} critical</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">Eligible Donors</div>
                <div class="stat-value">${data.eligible_donors} / ${data.total_donors}</div>
            </div>
        `;

        // Blood type summary table
        const bloodBody = document.getElementById('blood-summary-body');
        if (data.blood_type_summary.length === 0) {
            bloodBody.innerHTML = `<tr><td colspan="3" class="empty-state">No inventory data</td></tr>`;
        } else {
            bloodBody.innerHTML = data.blood_type_summary.map(row => `
                <tr>
                    <td><strong>${row.blood_type}</strong></td>
                    <td>${row.units_available}</td>
                    <td>${row.total_volume_ml}</td>
                </tr>
            `).join('');
        }

        // Expiring soon table
        const expiringBody = document.getElementById('expiring-body');
        if (data.expiring_soon.length === 0) {
            expiringBody.innerHTML = `<tr><td colspan="5" class="empty-state">No units expiring soon</td></tr>`;
        } else {
            expiringBody.innerHTML = data.expiring_soon.map(row => `
                <tr>
                    <td>#${row.unit_id}</td>
                    <td>${row.blood_type}</td>
                    <td>${formatDate(row.expiry_date)}</td>
                    <td>${row.days_to_expiry} day(s)</td>
                    <td>${escapeHtml(row.storage_location)}</td>
                </tr>
            `).join('');
        }

        // Recent donations
        const donationsBody = document.getElementById('recent-donations-body');
        if (data.recent_donations.length === 0) {
            donationsBody.innerHTML = `<tr><td colspan="4" class="empty-state">No donations recorded yet</td></tr>`;
        } else {
            donationsBody.innerHTML = data.recent_donations.map(row => `
                <tr>
                    <td>${escapeHtml(row.donor_name)}</td>
                    <td>#${row.unit_id}</td>
                    <td>${formatDate(row.donation_date)}</td>
                    <td>${row.volume_ml}</td>
                </tr>
            `).join('');
        }

        // Pending requests (top 5)
        const pendingBody = document.getElementById('pending-requests-body');
        const pending = await api.get('/requests/pending');
        if (pending.length === 0) {
            pendingBody.innerHTML = `<tr><td colspan="5" class="empty-state">No pending requests</td></tr>`;
        } else {
            pendingBody.innerHTML = pending.slice(0, 5).map(row => `
                <tr>
                    <td>${escapeHtml(row.hospital_name)}</td>
                    <td>${row.blood_type}</td>
                    <td>${row.units_requested}</td>
                    <td>${urgencyLabel(row.urgency_level)}</td>
                    <td>${formatDateTime(row.request_date)}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        showAlert(alertBox, `Failed to load dashboard: ${err.message}`, 'error');
    }
}
