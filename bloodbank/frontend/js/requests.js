// js/requests.js

let requestsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('requests');
    populateBloodTypeSelects();
    loadHospitalOptions();
    loadRequests();

    document.getElementById('filter-status').addEventListener('change', loadRequests);
    document.getElementById('filter-urgency').addEventListener('change', loadRequests);
    document.getElementById('filter-blood-type').addEventListener('change', loadRequests);

    document.getElementById('add-request-btn').addEventListener('click', openRequestModal);
    document.getElementById('request-cancel-btn').addEventListener('click', closeRequestModal);
    document.getElementById('request-form').addEventListener('submit', handleRequestSubmit);

    document.getElementById('detail-close-btn').addEventListener('click', closeDetailModal);
});

function populateBloodTypeSelects() {
    const filterSelect = document.getElementById('filter-blood-type');
    const formSelect = document.getElementById('blood_type');
    BLOOD_TYPES.forEach(bt => {
        filterSelect.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
        formSelect.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
    });
}

async function loadHospitalOptions() {
    try {
        const hospitals = await api.get('/hospitals');
        const select = document.getElementById('hospital_id');
        hospitals.forEach(h => {
            select.insertAdjacentHTML('beforeend', `<option value="${h.hospital_id}">${escapeHtml(h.name)}</option>`);
        });
    } catch (err) {
        console.error('Failed to load hospitals for dropdown:', err.message);
    }
}

async function loadRequests() {
    const alertBox = document.getElementById('alert-box');
    const tbody = document.getElementById('requests-body');

    const status = document.getElementById('filter-status').value;
    const urgency = document.getElementById('filter-urgency').value;
    const bloodType = document.getElementById('filter-blood-type').value;

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (urgency) params.set('urgency_level', urgency);
    if (bloodType) params.set('blood_type', bloodType);

    try {
        const query = params.toString() ? `?${params.toString()}` : '';
        const requests = await api.get(`/requests${query}`);
        requestsCache = requests;

        if (requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No requests found</td></tr>`;
            return;
        }

        tbody.innerHTML = requests.map(r => `
            <tr>
                <td>#${r.request_id}</td>
                <td>${escapeHtml(r.hospital_name)}</td>
                <td><strong>${r.blood_type}</strong></td>
                <td>${r.units_requested}</td>
                <td>${urgencyLabel(r.urgency_level)}</td>
                <td>${badgeForStatus(r.status)}</td>
                <td>${formatDateTime(r.request_date)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" data-action="view" data-id="${r.request_id}">View</button>
                    ${r.status === 'pending' || r.status === 'partially_fulfilled'
                        ? `<button class="btn btn-success btn-sm" data-action="fulfill" data-id="${r.request_id}">Fulfill</button>`
                        : ''}
                    ${r.status === 'pending'
                        ? `<button class="btn btn-danger btn-sm" data-action="reject" data-id="${r.request_id}">Reject</button>`
                        : ''}
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', () => viewRequest(btn.dataset.id));
        });
        tbody.querySelectorAll('[data-action="fulfill"]').forEach(btn => {
            btn.addEventListener('click', () => fulfillRequest(btn.dataset.id));
        });
        tbody.querySelectorAll('[data-action="reject"]').forEach(btn => {
            btn.addEventListener('click', () => rejectRequest(btn.dataset.id));
        });
    } catch (err) {
        showAlert(alertBox, `Failed to load requests: ${err.message}`, 'error');
    }
}

function openRequestModal() {
    const form = document.getElementById('request-form');
    form.reset();
    document.getElementById('units_requested').value = 1;
    document.getElementById('request-modal').classList.add('open');
}

function closeRequestModal() {
    document.getElementById('request-modal').classList.remove('open');
}

async function handleRequestSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');

    const payload = {
        hospital_id: document.getElementById('hospital_id').value,
        blood_type: document.getElementById('blood_type').value,
        units_requested: parseInt(document.getElementById('units_requested').value),
        urgency_level: document.getElementById('urgency_level').value,
        notes: document.getElementById('notes').value.trim() || null
    };

    try {
        await api.post('/requests', payload);
        showAlert(alertBox, 'Emergency request created.', 'success');
        closeRequestModal();
        await loadRequests();
    } catch (err) {
        showAlert(alertBox, `Failed to create request: ${err.message}`, 'error');
    }
}

async function viewRequest(requestId) {
    const alertBox = document.getElementById('alert-box');
    try {
        const r = await api.get(`/requests/${requestId}`);

        document.getElementById('detail-title').textContent = `Request #${r.request_id} — ${r.hospital_name}`;

        let allocationsHtml = '';
        if (r.allocations.length === 0) {
            allocationsHtml = `<p class="empty-state">No units allocated yet.</p>`;
        } else {
            allocationsHtml = `
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Unit ID</th><th>Blood Type</th><th>Volume (ml)</th><th>Expiry</th><th>Allocated At</th></tr></thead>
                        <tbody>
                            ${r.allocations.map(a => `
                                <tr>
                                    <td>#${a.unit_id}</td>
                                    <td>${a.blood_type}</td>
                                    <td>${a.volume_ml}</td>
                                    <td>${formatDate(a.expiry_date)}</td>
                                    <td>${formatDateTime(a.allocated_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        document.getElementById('detail-content').innerHTML = `
            <p><strong>Blood Type:</strong> ${r.blood_type}</p>
            <p><strong>Units Requested:</strong> ${r.units_requested}</p>
            <p><strong>Urgency:</strong> ${urgencyLabel(r.urgency_level)}</p>
            <p><strong>Status:</strong> ${badgeForStatus(r.status)}</p>
            <p><strong>Requested On:</strong> ${formatDateTime(r.request_date)}</p>
            <p><strong>Resolved On:</strong> ${formatDateTime(r.resolved_date)}</p>
            <p><strong>Notes:</strong> ${escapeHtml(r.notes || '—')}</p>
            <h4 style="margin-top: 14px; margin-bottom: 8px;">Allocated Units</h4>
            ${allocationsHtml}
        `;

        document.getElementById('detail-modal').classList.add('open');
    } catch (err) {
        showAlert(alertBox, `Failed to load request details: ${err.message}`, 'error');
    }
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('open');
}

async function fulfillRequest(requestId) {
    const alertBox = document.getElementById('alert-box');
    try {
        const result = await api.post(`/requests/${requestId}/fulfill`);
        showAlert(alertBox, result.message, result.units_allocated > 0 ? 'success' : 'info');
        await loadRequests();
    } catch (err) {
        showAlert(alertBox, `Failed to fulfill request: ${err.message}`, 'error');
    }
}

async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this request?')) return;
    const alertBox = document.getElementById('alert-box');
    try {
        await api.put(`/requests/${requestId}/reject`);
        showAlert(alertBox, 'Request rejected.', 'success');
        await loadRequests();
    } catch (err) {
        showAlert(alertBox, `Failed to reject request: ${err.message}`, 'error');
    }
}
