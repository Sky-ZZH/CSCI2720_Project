import { getFavorites, toggleFavorite } from '../api.js';
import { state, updateState } from '../state.js';

export async function renderFavourites() {
    const app = document.getElementById('app');

    // Initial HTML Structure
    app.innerHTML = `
        <div class="container">
            <div class="location-filters-container" style="margin-bottom: 1rem;">
                <div class="filter-group" style="flex-grow: 1;">
                    <input type="text" id="favSearchInput" class="search-input" placeholder="Search by location" style="width: 100%;">
                </div>
            </div>

            <div style="overflow-x:auto; min-height: 300px;">
                <table class="locations-table" id="favTable">
                    <thead>
                        <tr>
                            <th id="sortFavName" data-key="name" style="width: 60%;">Location <span class="sort-icon">&updownarrow;</span></th>
                            <th id="sortFavEvents" data-key="events" style="width: 30%;">Number of Events <span class="sort-icon">&updownarrow;</span></th>
                            <th style="width: 10%;">Remove</th>
                        </tr>
                    </thead>
                    <tbody id="favTbody">
                        <tr><td colspan="3" class="text-center text-muted">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="table-footer" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div class="pagination-controls">
                    <button class="btn-page" id="prevFavPage">PREVIOUS</button>
                    <button class="btn-page" id="nextFavPage">NEXT</button>
                </div>
                <div id="favPageInfo">Page 1 of 1</div>
            </div>
        </div>
    `;

    // State
    let favorites = [];
    let currentPage = 1;
    const pageSize = 10;
    let sortKey = 'name';
    let sortDir = 'asc';

    try {
        favorites = await getFavorites();
        updateState({ favorites });
        
        renderTable();

        // Listeners
        document.getElementById('favSearchInput').addEventListener('input', () => {
            currentPage = 1;
            renderTable();
        });

        const setSort = (key) => {
            if (sortKey === key) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDir = 'asc';
            }
            renderTable();
        };

        document.getElementById('sortFavName').addEventListener('click', () => setSort('name'));
        document.getElementById('sortFavEvents').addEventListener('click', () => setSort('events'));

        document.getElementById('prevFavPage').addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderTable(); }
        });
        document.getElementById('nextFavPage').addEventListener('click', () => {
            if (currentPage < getTotalPages()) { currentPage++; renderTable(); }
        });

    } catch (error) {
        document.getElementById('favTbody').innerHTML = `<tr><td colspan="3" class="text-error">Error: ${error.message}</td></tr>`;
    }

    function getFiltered() {
        const term = document.getElementById('favSearchInput').value.toLowerCase();
        return favorites.filter(loc => loc.name.toLowerCase().includes(term));
    }

    function getTotalPages() {
        return Math.ceil(getFiltered().length / pageSize) || 1;
    }

    function renderTable() {
        let filtered = getFiltered();

        // Update Sort Icons
        ['name', 'events'].forEach(key => {
            const th = document.querySelector(`th[data-key="${key}"] .sort-icon`);
            if (th) {
                th.innerHTML = sortKey === key ? (sortDir === 'asc' ? '&uarr;' : '&darr;') : '&updownarrow;';
                th.style.opacity = sortKey === key ? '1' : '0.3';
            }
        });

        // Sort
        filtered.sort((a, b) => {
            let valA, valB;
            if (sortKey === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
            else { valA = (a.events ? a.events.length : 0); valB = (b.events ? b.events.length : 0); }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        // Pagination
        const totalPages = getTotalPages();
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);
        const tbody = document.getElementById('favTbody');

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding: 2rem;">No locations found.</td></tr>`;
        } else {
            tbody.innerHTML = pageItems.map(loc => {
                const id = loc.id || loc._id;
                const eventCount = loc.events ? loc.events.length : (loc.numberOfEvents || 0);
                return `
                    <tr class="location-row">
                        <td style="font-weight: 500;">${loc.name}</td>
                        <td>${eventCount}</td>
                        <td>
                            <button class="fav-btn remove" 
                                onclick="removeFavorite('${id}')"
                                title="Remove from favorites"
                                style="background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;">
                                &times;
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        document.getElementById('favPageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    }

    window.removeFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            // Refresh list
            favorites = await getFavorites();
            updateState({ favorites });
            renderTable();
        } catch (e) {
            console.error(e);
            alert('Failed to remove favorite');
        }
    };
}
