// js/hospitals.js

let hospitalsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('hospitals');
    loadHospitals();

    document.getElementById('add-hospital-btn').addEventListener('click', () => openHospitalModal());
    document.getElementById('hospital-cancel-btn').addEventListener('click', closeHospitalModal);
    document.getElementById('hospital-form').addEventListener('submit', handleHospitalSubmit);
});

async function loadHospitals() {
    const alertBox = document.getElementById('alert-box');
    const tbody = document.getElementById('hospitals-body');

    try {
        const hospitals = await api.get('/hospitals');
        hospitalsCache = hospitals;

        if (hospitals.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No hospitals registered yet</td></tr>`;
            return;
        }

        tbody.innerHTML = hospitals.map(h => `
            <tr>
                <td>#${h.hospital_id}</td>
                <td>${escapeHtml(h.name)}</td>
                <td>${escapeHtml(h.contact_person || '—')}</td>
                <td>${escapeHtml(h.phone)}</td>
                <td>${escapeHtml(h.email || '—')}</td>
                <td>${escapeHtml(h.address || '—')}</td>
                <td>${formatDate(h.registered_on)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${h.hospital_id}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${h.hospital_id}">Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => openHospitalModal(btn.dataset.id));
        });
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteHospital(btn.dataset.id));
        });
    } catch (err) {
        showAlert(alertBox, `Failed to load hospitals: ${err.message}`, 'error');
    }
}

function openHospitalModal(hospitalId = null) {
    const modal = document.getElementById('hospital-modal');
    const title = document.getElementById('hospital-modal-title');
    const form = document.getElementById('hospital-form');
    form.reset();
    document.getElementById('hospital-id').value = '';

    if (hospitalId) {
        const hospital = hospitalsCache.find(h => String(h.hospital_id) === String(hospitalId));
        if (!hospital) return;
        title.textContent = `Edit Hospital #${hospital.hospital_id}`;
        document.getElementById('hospital-id').value = hospital.hospital_id;
        document.getElementById('name').value = hospital.name;
        document.getElementById('contact_person').value = hospital.contact_person || '';
        document.getElementById('phone').value = hospital.phone;
        document.getElementById('email').value = hospital.email || '';
        document.getElementById('address').value = hospital.address || '';
    } else {
        title.textContent = 'Add Hospital';
    }

    modal.classList.add('open');
}

function closeHospitalModal() {
    document.getElementById('hospital-modal').classList.remove('open');
}

async function handleHospitalSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');

    const hospitalId = document.getElementById('hospital-id').value;
    const payload = {
        name: document.getElementById('name').value.trim(),
        contact_person: document.getElementById('contact_person').value.trim() || null,
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        address: document.getElementById('address').value.trim() || null
    };

    try {
        if (hospitalId) {
            await api.put(`/hospitals/${hospitalId}`, payload);
            showAlert(alertBox, 'Hospital updated successfully.', 'success');
        } else {
            await api.post('/hospitals', payload);
            showAlert(alertBox, 'Hospital added successfully.', 'success');
        }
        closeHospitalModal();
        await loadHospitals();
    } catch (err) {
        showAlert(alertBox, `Failed to save hospital: ${err.message}`, 'error');
    }
}

async function deleteHospital(hospitalId) {
    if (!confirm('Are you sure you want to delete this hospital?')) return;
    const alertBox = document.getElementById('alert-box');
    try {
        await api.del(`/hospitals/${hospitalId}`);
        showAlert(alertBox, 'Hospital deleted.', 'success');
        await loadHospitals();
    } catch (err) {
        showAlert(alertBox, `Failed to delete hospital: ${err.message}`, 'error');
    }
}
