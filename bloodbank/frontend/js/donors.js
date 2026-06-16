// js/donors.js

let donorsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('donors');
    populateBloodTypeSelects();
    loadDonors();

    document.getElementById('filter-blood-type').addEventListener('change', loadDonors);
    document.getElementById('filter-eligibility').addEventListener('change', loadDonors);

    document.getElementById('add-donor-btn').addEventListener('click', () => openDonorModal());
    document.getElementById('donor-cancel-btn').addEventListener('click', closeDonorModal);
    document.getElementById('donor-form').addEventListener('submit', handleDonorSubmit);
});

function populateBloodTypeSelects() {
    const filterSelect = document.getElementById('filter-blood-type');
    const formSelect = document.getElementById('blood_type');
    BLOOD_TYPES.forEach(bt => {
        filterSelect.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
        formSelect.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
    });
}

async function loadDonors() {
    const alertBox = document.getElementById('alert-box');
    const tbody = document.getElementById('donors-body');

    const bloodType = document.getElementById('filter-blood-type').value;
    const eligibility = document.getElementById('filter-eligibility').value;

    const params = new URLSearchParams();
    if (bloodType) params.set('blood_type', bloodType);
    if (eligibility) params.set('eligibility_status', eligibility);

    try {
        const query = params.toString() ? `?${params.toString()}` : '';
        const donors = await api.get(`/donors${query}`);
        donorsCache = donors;

        if (donors.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No donors found</td></tr>`;
            return;
        }

        tbody.innerHTML = donors.map(d => `
            <tr>
                <td>#${d.donor_id}</td>
                <td>${escapeHtml(d.full_name)}</td>
                <td><strong>${d.blood_type}</strong></td>
                <td>${escapeHtml(d.phone)}</td>
                <td>${escapeHtml(d.email || '—')}</td>
                <td>${formatDate(d.last_donation_date)}</td>
                <td>${badgeForStatus(d.eligibility_status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${d.donor_id}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${d.donor_id}">Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => openDonorModal(btn.dataset.id));
        });
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteDonor(btn.dataset.id));
        });
    } catch (err) {
        showAlert(alertBox, `Failed to load donors: ${err.message}`, 'error');
    }
}

function openDonorModal(donorId = null) {
    const modal = document.getElementById('donor-modal');
    const title = document.getElementById('donor-modal-title');
    const form = document.getElementById('donor-form');
    form.reset();
    document.getElementById('donor-id').value = '';

    if (donorId) {
        const donor = donorsCache.find(d => String(d.donor_id) === String(donorId));
        if (!donor) return;
        title.textContent = `Edit Donor #${donor.donor_id}`;
        document.getElementById('donor-id').value = donor.donor_id;
        document.getElementById('full_name').value = donor.full_name;
        document.getElementById('blood_type').value = donor.blood_type;
        document.getElementById('gender').value = donor.gender || '';
        document.getElementById('date_of_birth').value = donor.date_of_birth || '';
        document.getElementById('phone').value = donor.phone;
        document.getElementById('email').value = donor.email || '';
        document.getElementById('address').value = donor.address || '';
        document.getElementById('last_donation_date').value = donor.last_donation_date || '';
    } else {
        title.textContent = 'Add Donor';
    }

    modal.classList.add('open');
}

function closeDonorModal() {
    document.getElementById('donor-modal').classList.remove('open');
}

async function handleDonorSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');

    const donorId = document.getElementById('donor-id').value;
    const payload = {
        full_name: document.getElementById('full_name').value.trim(),
        blood_type: document.getElementById('blood_type').value,
        gender: document.getElementById('gender').value || null,
        date_of_birth: document.getElementById('date_of_birth').value || null,
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        address: document.getElementById('address').value.trim() || null,
        last_donation_date: document.getElementById('last_donation_date').value || null
    };

    try {
        if (donorId) {
            await api.put(`/donors/${donorId}`, payload);
            showAlert(alertBox, 'Donor updated successfully.', 'success');
        } else {
            await api.post('/donors', payload);
            showAlert(alertBox, 'Donor added successfully.', 'success');
        }
        closeDonorModal();
        await loadDonors();
    } catch (err) {
        showAlert(alertBox, `Failed to save donor: ${err.message}`, 'error');
    }
}

async function deleteDonor(donorId) {
    if (!confirm('Are you sure you want to delete this donor? This cannot be undone.')) return;
    const alertBox = document.getElementById('alert-box');
    try {
        await api.del(`/donors/${donorId}`);
        showAlert(alertBox, 'Donor deleted.', 'success');
        await loadDonors();
    } catch (err) {
        showAlert(alertBox, `Failed to delete donor: ${err.message}`, 'error');
    }
}
