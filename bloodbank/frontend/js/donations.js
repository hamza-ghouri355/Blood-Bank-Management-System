// js/donations.js

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('donations');
    populateBloodTypeSelect();
    loadDonorOptions();
    loadDonations();

    document.getElementById('add-donation-btn').addEventListener('click', openDonationModal);
    document.getElementById('donation-cancel-btn').addEventListener('click', closeDonationModal);
    document.getElementById('donation-form').addEventListener('submit', handleDonationSubmit);
});

function populateBloodTypeSelect() {
    const select = document.getElementById('blood_type');
    BLOOD_TYPES.forEach(bt => {
        select.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
    });
}

async function loadDonorOptions() {
    try {
        const donors = await api.get('/donors');
        const select = document.getElementById('donor_id');
        donors.forEach(d => {
            select.insertAdjacentHTML('beforeend',
                `<option value="${d.donor_id}" data-blood-type="${d.blood_type}">#${d.donor_id} - ${escapeHtml(d.full_name)} (${d.blood_type})</option>`);
        });

        // Auto-fill blood type when donor selected
        select.addEventListener('change', () => {
            const selected = select.options[select.selectedIndex];
            const bt = selected ? selected.dataset.bloodType : '';
            if (bt) document.getElementById('blood_type').value = bt;
        });
    } catch (err) {
        console.error('Failed to load donors for dropdown:', err.message);
    }
}

async function loadDonations() {
    const alertBox = document.getElementById('alert-box');
    const tbody = document.getElementById('donations-body');

    try {
        const donations = await api.get('/donations');

        if (donations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No donations recorded yet</td></tr>`;
            return;
        }

        tbody.innerHTML = donations.map(d => `
            <tr>
                <td>#${d.donation_id}</td>
                <td>${escapeHtml(d.donor_name)} (#${d.donor_id})</td>
                <td>#${d.unit_id}</td>
                <td>${formatDate(d.donation_date)}</td>
                <td>${d.volume_ml}</td>
                <td>${escapeHtml(d.notes || '—')}</td>
                <td>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${d.donation_id}">Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteDonation(btn.dataset.id));
        });
    } catch (err) {
        showAlert(alertBox, `Failed to load donations: ${err.message}`, 'error');
    }
}

function openDonationModal() {
    const form = document.getElementById('donation-form');
    form.reset();
    document.getElementById('volume_ml').value = 450;
    document.getElementById('donation_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('donation-modal').classList.add('open');
}

function closeDonationModal() {
    document.getElementById('donation-modal').classList.remove('open');
}

async function handleDonationSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');

    const payload = {
        donor_id: document.getElementById('donor_id').value,
        donation_date: document.getElementById('donation_date').value,
        volume_ml: parseInt(document.getElementById('volume_ml').value),
        blood_type: document.getElementById('blood_type').value,
        expiry_date: document.getElementById('expiry_date').value,
        storage_location: document.getElementById('storage_location').value.trim(),
        notes: document.getElementById('notes').value.trim() || null
    };

    try {
        await api.post('/donations', payload);
        showAlert(alertBox, 'Donation recorded successfully. Inventory updated.', 'success');
        closeDonationModal();
        await loadDonations();
    } catch (err) {
        showAlert(alertBox, `Failed to record donation: ${err.message}`, 'error');
    }
}

async function deleteDonation(donationId) {
    if (!confirm('Are you sure you want to delete this donation record?')) return;
    const alertBox = document.getElementById('alert-box');
    try {
        await api.del(`/donations/${donationId}`);
        showAlert(alertBox, 'Donation deleted.', 'success');
        await loadDonations();
    } catch (err) {
        showAlert(alertBox, `Failed to delete donation: ${err.message}`, 'error');
    }
}
