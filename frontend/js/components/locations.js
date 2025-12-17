import { getLocations, toggleFavorite, getFavorites } from '../api.js';
import { state, updateState } from '../state.js';

export async function renderLocations() {
    const app = document.getElementById('app');

    // 1. 改成 Demo 要求的 Filter + Table 佈局
    app.innerHTML = `
        <div class="container">
            <div class="filters-section">
                <div class="filters-row">
                    <div class="form-group">
                        <label>Search by location</label>
                        <input type="text" id="searchInput" placeholder="Search venues...">
                    </div>
                    
                    <div class="form-group">
                        <label>Area</label>
                        <select id="areaSelect">
                            <option value="">All</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Distance (km)</label>
                        <input type="number" id="distanceInput" min="0" step="0.1" placeholder="e.g. 10">
                    </div>
                </div>

                <div class="sort-buttons">
                    <button class="btn btn-secondary" id="sortName">LOCATION</button>
                    <button class="btn btn-secondary" id="sortDistance">DISTANCE (KM)</button>
                    <button class="btn btn-secondary" id="sortEvents">NUMBER OF EVENTS</button>
                </div>
            </div>

            <div class="text-muted" id="lastUpdated" style="margin: 0.5rem 0;"></div>

            <!-- 2. 改用 Table 顯示 -->
            <div style="overflow-x:auto;">
                <table class="locations-table" id="locationsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>LOCATION</th>
                            <th>DISTANCE (KM)</th>
                            <th>NUMBER OF EVENTS</th>
                            <th>Add to Favourite</th>
                        </tr>
                    </thead>
                    <tbody id="locationsTbody">
                        <tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- 3. 分頁 (Demo 要求) -->
            <div class="pager">
                <button class="btn btn-secondary btn-small" id="prevPage">PREVIOUS</button>
                <div class="text-muted" id="pageInfo">Page 1</div>
                <button class="btn btn-secondary btn-small" id="nextPage">NEXT</button>
            </div>
        </div>
    `;

    // Helpers
    const getArea = (loc) => (loc.area || loc.district || loc.region || '').toString();
    const getDistance = (loc) => (loc.distance || loc.distanceKm || null); // 根據後端欄位調整
    const getEventsCount = (loc) => (loc.events ? loc.events.length : (loc.numberOfEvents || 0));

    let currentPage = 1;
    const pageSize = 10;
    let sortKey = 'name';
    let sortDir = 'asc';

    try {
        const [locations, favorites] = await Promise.all([getLocations(), getFavorites()]);
        updateState({ locations, favorites });

        // Populate Area Dropdown
        const areas = [...new Set(locations.map(getArea).filter(a => a))].sort();
        document.getElementById('areaSelect').innerHTML += areas.map(a => `<option value="${a}">${a}</option>`).join('');

        renderTable();

        // Event Listeners
        const refresh = () => { currentPage = 1; renderTable(); };
        document.getElementById('searchInput').addEventListener('input', refresh);
        document.getElementById('areaSelect').addEventListener('change', refresh);
        document.getElementById('distanceInput').addEventListener('input', refresh);

        document.getElementById('sortName').addEventListener('click', () => { sortKey = 'name'; sortDir = sortDir==='asc'?'desc':'asc'; refresh(); });
        document.getElementById('sortDistance').addEventListener('click', () => { sortKey = 'distance'; sortDir = sortDir==='asc'?'desc':'asc'; refresh(); });
        document.getElementById('sortEvents').addEventListener('click', () => { sortKey = 'events'; sortDir = sortDir==='asc'?'desc':'asc'; refresh(); });

        document.getElementById('prevPage').addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderTable(); } });
        document.getElementById('nextPage').addEventListener('click', () => { if(currentPage < getTotalPages()) { currentPage++; renderTable(); } });

    } catch (error) {
        document.getElementById('locationsTbody').innerHTML = 
            `<tr><td colspan="5" class="text-error text-center">Error: ${error.message}</td></tr>`;
    }

    function getTotalPages() {
        // 簡單實作：依賴 renderTable 內部算出的 filtered list length
        // 這裡為了簡單，通常建議把 filter 邏輯抽出來
        return 1; 
    }

    function renderTable() {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const area = document.getElementById('areaSelect').value;
        const dist = document.getElementById('distanceInput').value;

        let filtered = state.locations.filter(l => {
            const matchName = l.name.toLowerCase().includes(term);
            const matchArea = !area || getArea(l) === area;
            // 距離篩選 (如果有距離資料)
            const d = getDistance(l);
            const matchDist = !dist || (d !== null && d <= Number(dist));
            return matchName && matchArea && matchDist;
        });

        // Sort
        filtered.sort((a, b) => {
            let valA, valB;
            if (sortKey === 'name') { valA = a.name; valB = b.name; }
            else if (sortKey === 'distance') { valA = getDistance(a) || 9999; valB = getDistance(b) || 9999; }
            else { valA = getEventsCount(a); valB = getEventsCount(b); }
            
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        // Pagination
        const totalPages = Math.ceil(filtered.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const start = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);

        const tbody = document.getElementById('locationsTbody');
        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No locations found.</td></tr>`;
        } else {
            tbody.innerHTML = pageItems.map(loc => {
                // 相容 id 和 _id
                const id = loc.id || loc._id;
                const isFav = state.favorites.some(f => (f.id || f._id || f) === id);
                const d = getDistance(loc);
                
                return `
                    <tr class="location-row" onclick="window.location.hash='#/location/${id}'">
                        <td>${id}</td>
                        <td style="color:var(--secondary-color); font-weight:bold;">${loc.name}</td>
                        <td>${d !== null ? d.toFixed(2) : 'N/A'}</td>
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
        
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    // Global handler
    window.handleFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            const favorites = await getFavorites();
            updateState({ favorites });
            renderTable(); // Re-render to update button state
        } catch (e) {
            alert(e.message);
        }
    };
}
