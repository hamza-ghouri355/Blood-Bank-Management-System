// js/nav.js
// Injects the shared sidebar navigation into the page.
// Each page must include a <div id="sidebar"></div> placeholder.

function renderSidebar(activePage) {
    const links = [
        { href: 'index.html', label: 'Dashboard', key: 'dashboard' },
        { href: 'donors.html', label: 'Donors', key: 'donors' },
        { href: 'inventory.html', label: 'Blood Inventory', key: 'inventory' },
        { href: 'donations.html', label: 'Donations', key: 'donations' },
        { href: 'hospitals.html', label: 'Hospitals', key: 'hospitals' },
        { href: 'requests.html', label: 'Emergency Requests', key: 'requests' }
    ];

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <h1>🩸 Blood Bank MS</h1>
        <nav>
            ${links.map(l => `<a href="${l.href}" class="${l.key === activePage ? 'active' : ''}">${l.label}</a>`).join('')}
        </nav>
    `;
}
