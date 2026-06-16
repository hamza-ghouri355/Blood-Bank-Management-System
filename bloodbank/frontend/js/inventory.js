// js/inventory.js

let inventoryCache = [];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('inventory');
    populateBloodTypeSelects();
    loadInventory();

    document.getElementById('filter-blood-type').addEventListener('change', loadInventory);
    document.getElementById('filter-status').addEventListener('change', loadInventory);

    document.getElementById('add-unit-btn').addEventListener('click', () => openInventoryModal());
    document.getElementById('inventory-cancel-btn').addEventListener('click', closeInventoryModal);
    document.getElementById('inventory-form').addEventListener('submit', handleInventorySubmit);
    document.getElementById('check-expiry-btn').addEventListener('click', runExpiryCheck);
});

function populateBloodTypeSelects() {
    const filterSelect = document.getElementById('filter-blood-type');
    const formSelect = document.getElementById('blood_type');
    BLOOD_TYPES.forEach(bt => {
        filterSelect.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
        formSelect.insertAdjacentHTML('beforeend', `<option value="${bt}">${bt}</option>`);
    });
}

async function loadInventory() {
    const alertBox = document.getElementById('alert-box');
    const tbody = document.getElementById('inventory-body');

    const bloodType = document.getElementById('filter-blood-type').value;
    const status = document.getElementById('filter-status').value;

    const params = new URLSearchParams();
    if (bloodType) params.set('blood_type', bloodType);
    if (status) params.set('status', status);

    try {
        const query = params.toString() ? `?${params.toString()}` : '';
        const units = await api.get(`/inventory${query}`);
        inventoryCache = units;

        if (units.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No inventory units found</td></tr>`;
            return;
        }

        tbody.innerHTML = units.map(u => `
            <tr>
                <td>#${u.unit_id}</td>
                <td><strong>${u.blood_type}</strong></td>
                <td>${u.volume_ml}</td>
                <td>${formatDate(u.collection_date)}</td>
                <td>${formatDate(u.expiry_date)}</td>
                <td>${escapeHtml(u.storage_location)}</td>
                <td>${badgeForStatus(u.status)}</td>
                <td>${u.donor_id ? `#${u.donor_id}` : '—'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${u.unit_id}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${u.unit_id}">Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => openInventoryModal(btn.dataset.id));
        });
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteUnit(btn.dataset.id));
        });
    } catch (err) {
        showAlert(alertBox, `Failed to load inventory: ${err.message}`, 'error');
    }
}

function openInventoryModal(unitId = null) {
    const modal = document.getElementById('inventory-modal');
    const title = document.getElementById('inventory-modal-title');
    const form = document.getElementById('inventory-form');
    form.reset();
    document.getElementById('unit-id').value = '';
    document.getElementById('volume_ml').value = 450;

    if (unitId) {
        const unit = inventoryCache.find(u => String(u.unit_id) === String(unitId));
        if (!unit) return;
        title.textContent = `Edit Unit #${unit.unit_id}`;
        document.getElementById('unit-id').value = unit.unit_id;
        document.getElementById('blood_type').value = unit.blood_type;
        document.getElementById('volume_ml').value = unit.volume_ml;
        document.getElementById('collection_date').value = unit.collection_date;
        document.getElementById('expiry_date').value = unit.expiry_date;
        document.getElementById('storage_location').value = unit.storage_location;
        document.getElementById('status').value = unit.status;
        document.getElementById('donor_id').value = unit.donor_id || '';
    } else {
        title.textContent = 'Add Blood Unit';
    }

    modal.classList.add('open');
}

function closeInventoryModal() {
    document.getElementById('inventory-modal').classList.remove('open');
}

async function handleInventorySubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');

    const unitId = document.getElementById('unit-id').value;
    const payload = {
        blood_type: document.getElementById('blood_type').value,
        volume_ml: parseInt(document.getElementById('volume_ml').value),
        collection_date: document.getElementById('collection_date').value,
        expiry_date: document.getElementById('expiry_date').value,
        storage_location: document.getElementById('storage_location').value.trim(),
        status: document.getElementById('status').value,
        donor_id: document.getElementById('donor_id').value || null
    };

    try {
        if (unitId) {
            await api.put(`/inventory/${unitId}`, payload);
            showAlert(alertBox, 'Inventory unit updated.', 'success');
        } else {
            await api.post('/inventory', payload);
            showAlert(alertBox, 'Inventory unit added.', 'success');
        }
        closeInventoryModal();
        await loadInventory();
    } catch (err) {
        showAlert(alertBox, `Failed to save unit: ${err.message}`, 'error');
    }
}

async function deleteUnit(unitId) {
    if (!confirm('Are you sure you want to delete this inventory unit?')) return;
    const alertBox = document.getElementById('alert-box');
    try {
        await api.del(`/inventory/${unitId}`);
        showAlert(alertBox, 'Unit deleted.', 'success');
        await loadInventory();
    } catch (err) {
        showAlert(alertBox, `Failed to delete unit: ${err.message}`, 'error');
    }
}

async function runExpiryCheck() {
    const alertBox = document.getElementById('alert-box');
    try {
        const result = await api.post('/inventory/check-expiry');
        showAlert(alertBox, `Expiry check complete: ${result.units_marked_expired} unit(s) marked as expired.`, 'success');
        await loadInventory();
    } catch (err) {
        showAlert(alertBox, `Expiry check failed: ${err.message}`, 'error');
    }
}
