import { getFavorites, toggleFavorite } from '../api.js';

let favState = {
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 5,
    sortBy: 'name',
    sortOrder: 'asc',
    favorites: []
};

export async function renderFavourites() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="container">
            <div class="toolbar">
                <div class="search-bar" style="flex: 1;">
                    <input type="text" id="favSearchInput" placeholder="Search by location..." value="${favState.searchTerm}">
                </div>
            </div>

            <div class="table-container">
                <table class="locations-table">
                    <thead>
                        <tr>
                            <th class="sortable-header" data-sort="name" style="width: 60%;">
                                <div class="sort-button">
                                    Location <span class="sort-icon" id="fav-sort-name">↕</span>
                                </div>
                            </th>
                            <th class="sortable-header" data-sort="eventCount" style="width: 30%;">
                                <div class="sort-button">
                                    Number of Events <span class="sort-icon" id="fav-sort-eventCount">↕</span>
                                </div>
                            </th>
                            <th style="width: 10%;">Remove</th>
                        </tr>
                    </thead>
                    <tbody id="favTableBody">
                        <tr><td colspan="3" class="text-center"><div class="spinner"></div></td></tr>
                    </tbody>
                </table>
            </div>

            <div class="footer-info">
                <span id="favPageInfo">Page 1 of 1</span>
                <div class="pagination-buttons">
                    <button id="favPrevBtn" class="btn btn-secondary" disabled>PREVIOUS</button>
                    <button id="favNextBtn" class="btn btn-secondary" disabled>NEXT</button>
                </div>
            </div>
        </div>
    `;

    try {
        const favorites = await getFavorites();
        favState.favorites = favorites.filter(loc => loc !== null);
        renderFavTable();
        setupFavEventListeners();
    } catch (error) {
        document.getElementById('favTableBody').innerHTML = 
            `<tr><td colspan="3" class="text-error">Error loading favorites: ${error.message}</td></tr>`;
    }
}

function getFilteredFavorites() {
    let filtered = favState.favorites.filter(loc => 
        loc.name.toLowerCase().includes(favState.searchTerm)
    );

    filtered.sort((a, b) => {
        let valA, valB;
        if (favState.sortBy === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
        } else {
            valA = a.events ? a.events.length : 0;
            valB = b.events ? b.events.length : 0;
        }

        if (valA < valB) return favState.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return favState.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
}

function renderFavTable() {
    const tbody = document.getElementById('favTableBody');
    const filtered = getFilteredFavorites();
    
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / favState.itemsPerPage) || 1;
    
    if (favState.currentPage > totalPages) favState.currentPage = totalPages;
    if (favState.currentPage < 1) favState.currentPage = 1;

    const startIndex = (favState.currentPage - 1) * favState.itemsPerPage;
    const endIndex = Math.min(startIndex + favState.itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Update Controls
    document.getElementById('favPageInfo').textContent = `Page ${favState.currentPage} of ${totalPages}`;
    document.getElementById('favPrevBtn').disabled = favState.currentPage === 1;
    document.getElementById('favNextBtn').disabled = favState.currentPage === totalPages;

    // Update Sort Icons
    document.querySelectorAll('.sort-icon').forEach(icon => icon.textContent = '↕');
    const currentSortIcon = document.getElementById(`fav-sort-${favState.sortBy}`);
    if (currentSortIcon) {
        currentSortIcon.textContent = favState.sortOrder === 'asc' ? '↑' : '↓';
    }

    if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No favorite locations found.</td></tr>';
        return;
    }

    tbody.innerHTML = pageItems.map(loc => `
        <tr>
            <td>
                <a href="#/location/${loc.id}" class="location-link" style="text-decoration: none; color: inherit; font-weight: 500;">
                    ${loc.name}
                </a>
            </td>
            <td>${loc.events ? loc.events.length : 0}</td>
            <td>
                <button class="btn-fav-square active" 
                        onclick="removeFavorite('${loc.id}')">
                    ✕
                </button>
            </td>
        </tr>
    `).join('');
}

function setupFavEventListeners() {
    // Search
    document.getElementById('favSearchInput').addEventListener('input', (e) => {
        favState.searchTerm = e.target.value.trim().toLowerCase();
        favState.currentPage = 1;
        renderFavTable();
    });

    // Sorting
    document.querySelectorAll('.sortable-header').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (favState.sortBy === sortKey) {
                favState.sortOrder = favState.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                favState.sortBy = sortKey;
                favState.sortOrder = 'asc';
            }
            renderFavTable();
        });
    });

    // Pagination
    document.getElementById('favPrevBtn').addEventListener('click', () => {
        if (favState.currentPage > 1) {
            favState.currentPage--;
            renderFavTable();
        }
    });

    document.getElementById('favNextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredFavorites().length / favState.itemsPerPage);
        if (favState.currentPage < totalPages) {
            favState.currentPage++;
            renderFavTable();
        }
    });

    // Global handler for remove
    window.removeFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            // Refresh data
            const favorites = await getFavorites();
            favState.favorites = favorites.filter(loc => loc !== null);
            renderFavTable();
        } catch (error) {
            alert('Error removing favorite: ' + error.message);
        }
    };
}
