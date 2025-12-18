import { getLocations, toggleFavorite, getFavorites } from '../api.js';
import { state, updateState } from '../state.js';
import { calculateDistance } from '../utils/distance.js'; // Import the new helper

export async function renderLocations() {
    const app = document.getElementById('app');

    app.innerHTML = `
        <div class="container">
            <div class="filters-section">
                <div class="filters-row">
                    <div class="form-group">
                        <label>Search</label>
                        <input type="text" id="searchInput" placeholder="Venue name...">
                    </div>
                    
                    <div class="form-group">
                        <label>Distance Limit (km)</label>
                        <input type="number" id="distanceInput" min="0" step="1" placeholder="From ${state.userLocation.name}">
                    </div>
                </div>

                <div class="sort-buttons">
                    <button class="btn btn-secondary" id="sortName">Sort Name</button>
                    <button class="btn btn-secondary" id="sortDistance">Sort Distance</button>
                    <button class="btn btn-secondary" id="sortEvents">Sort Events</button>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <div class="text-muted" id="lastUpdated"></div>
                <small class="text-muted">Distances calculated from: <strong>${state.userLocation.name}</strong></small>
            </div>

            <div style="overflow-x:auto;">
                <table class="locations-table" id="locationsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>LOCATION</th>
                            <th>DISTANCE (KM)</th>
                            <th>EVENTS</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody id="locationsTbody">
                        <tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="pager">
                <button class="btn btn-secondary btn-small" id="prevPage">Prev</button>
                <div class="text-muted" id="pageInfo">Page 1</div>
                <button class="btn btn-secondary btn-small" id="nextPage">Next</button>
            </div>
        </div>
    `;

    // Calculation Helper
    // Use fallback lat/long if API doesn't provide (For demo purposes, adding mock coords if missing)
    const getLocCoords = (loc) => ({
        lat: loc.latitude || loc.lat || (22.3 + Math.random() * 0.1), // Mock data if missing
        lng: loc.longitude || loc.lng || (114.1 + Math.random() * 0.1)
    });

    const getDist = (loc) => {
        const coords = getLocCoords(loc);
        const d = calculateDistance(
            state.userLocation.latitude, 
            state.userLocation.longitude, 
            coords.lat, 
            coords.lng
        );
        return d !== null ? d : 9999;
    };
    
    const getEventsCount = (loc) => (loc.events ? loc.events.length : (loc.numberOfEvents || 0));

    let currentPage = 1;
    const pageSize = 10;
    let sortKey = 'name';
    let sortDir = 'asc';

    try {
        const [locations, favorites] = await Promise.all([getLocations(), getFavorites()]);
        updateState({ locations, favorites });
        
        renderTable();

        // Listeners
        const refresh = () => { currentPage = 1; renderTable(); };
        document.getElementById('searchInput').addEventListener('input', refresh);
        document.getElementById('distanceInput').addEventListener('input', refresh);

        document.getElementById('sortName').addEventListener('click', () => { sortKey = 'name'; sortDir = sortDir==='asc'?'desc':'asc'; refresh(); });
        document.getElementById('sortDistance').addEventListener('click', () => { sortKey = 'distance'; sortDir = sortDir==='asc'?'desc':'asc'; refresh(); });
        document.getElementById('sortEvents').addEventListener('click', () => { sortKey = 'events'; sortDir = sortDir==='asc'?'desc':'asc'; refresh(); });

        document.getElementById('prevPage').addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderTable(); } });
        document.getElementById('nextPage').addEventListener('click', () => { if(currentPage < getTotalPages()) { currentPage++; renderTable(); } });

    } catch (error) {
        document.getElementById('locationsTbody').innerHTML = `<tr><td colspan="5" class="text-error">Error: ${error.message}</td></tr>`;
    }

    function getTotalPages() { return Math.ceil(getFiltered().length / pageSize) || 1; }
    
    function getFiltered() {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const distLimit = document.getElementById('distanceInput').value;

        return state.locations.filter(l => {
            const matchName = l.name.toLowerCase().includes(term);
            const d = getDist(l);
            const matchDist = !distLimit || d <= Number(distLimit);
            return matchName && matchDist;
        });
    }

    function renderTable() {
        let filtered = getFiltered();

        // Sort
        filtered.sort((a, b) => {
            let valA, valB;
            if (sortKey === 'name') { valA = a.name; valB = b.name; }
            else if (sortKey === 'distance') { valA = getDist(a); valB = getDist(b); }
            else { valA = getEventsCount(a); valB = getEventsCount(b); }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        // Pagination
        const start = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);
        const tbody = document.getElementById('locationsTbody');

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No locations found.</td></tr>`;
        } else {
            tbody.innerHTML = pageItems.map(loc => {
                const id = loc.id || loc._id;
                const isFav = state.favorites.some(f => (f.id || f._id || f) === id);
                const distance = getDist(loc);

                return `
                    <tr class="location-row" onclick="window.location.hash='#/location/${id}'">
                        <td>${id}</td>
                        <td style="color:var(--secondary-color); font-weight:bold;">${loc.name}</td>
                        <td>${distance < 9000 ? distance.toFixed(2) : 'N/A'}</td>
                        <td>${getEventsCount(loc)}</td>
                        <td onclick="event.stopPropagation()">
                            <button class="btn btn-small ${isFav ? 'btn-danger' : 'btn-secondary'}" 
                                onclick="handleFavorite('${id}')">
                                ${isFav ? 'Remove' : 'Add'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${getTotalPages()}`;
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    window.handleFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            const favorites = await getFavorites();
            updateState({ favorites });
            renderTable();
        } catch (e) { alert(e.message); }
    };
}
