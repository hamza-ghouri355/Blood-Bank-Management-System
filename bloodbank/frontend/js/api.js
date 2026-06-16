// js/api.js
// Shared API helper functions using fetch()

const API_BASE = '/api';

/**
 * Generic fetch wrapper. Throws an Error with the server's error message
 * (from JSON { error: "..." }) if the response is not ok.
 */
async function apiRequest(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    let data;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    if (!res.ok) {
        const message = (data && data.error) ? data.error : `Request failed (${res.status})`;
        throw new Error(message);
    }
    return data;
}

const api = {
    get: (path) => apiRequest(path, { method: 'GET' }),
    post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body || {}) }),
    put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body || {}) }),
    del: (path) => apiRequest(path, { method: 'DELETE' })
};

// ===== UI Helper Functions =====

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badgeForStatus(status) {
    const map = {
        'Available': 'badge-success',
        'Reserved': 'badge-warning',
        'Expired': 'badge-danger',
        'Used': 'badge-muted',
        'Eligible': 'badge-success',
        'Not Eligible': 'badge-muted',
        'pending': 'badge-warning',
        'fulfilled': 'badge-success',
        'partially_fulfilled': 'badge-primary',
        'rejected': 'badge-danger'
    };
    const cls = map[status] || 'badge-muted';
    return `<span class="badge ${cls}">${status}</span>`;
}

function urgencyLabel(level) {
    return `<span class="urgency-${level}">${level.toUpperCase()}</span>`;
}

/**
 * Shows a temporary alert message inside the given container element.
 */
function showAlert(containerEl, message, type = 'info') {
    containerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    if (type !== 'error') {
        setTimeout(() => {
            if (containerEl.querySelector('.alert')) containerEl.innerHTML = '';
        }, 4000);
    }
}

/**
 * Escapes HTML special characters to prevent injection when inserting
 * user-provided text into innerHTML.
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
