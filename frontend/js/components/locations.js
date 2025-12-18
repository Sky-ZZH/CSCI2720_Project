import { getLocations, toggleFavorite, getFavorites } from '../api.js';
import { state, updateState } from '../state.js';
import { calculateDistance } from '../utils/distance.js';

// Predefined areas for the dropdown
const AREAS = [
    "New Territories",
    "Hong Kong Island",
    "Kowloon"
];

const REGION_MAPPING = {
    "New Territories": [
        "Sha Tin", "Tsuen Wan", "Kwai Tsing", "Tuen Mun", "Yuen Long", "North", "Tai Po", "Sai Kung", "Islands",
        "Kwai Chung", "Tsing Yi", "Tin Shui Wai", "Tai Wai", "Fo Tan", "Ma On Shan", "Fanling", "Sheung Shui", 
        "Tseung Kwan O", "Lantau", "Tung Chung", "Discovery Bay", "Ma Wan", "Cheung Chau", "Lamma", "Peng Chau"
    ],
    "Hong Kong Island": [
        "Central", "Wan Chai", "Eastern", "Southern", "Western", "Causeway Bay", "Admiralty", "Sheung Wan", 
        "Sai Ying Pun", "Kennedy Town", "Happy Valley", "Tin Hau", "Fortress Hill", "North Point", "Quarry Bay", 
        "Tai Koo", "Sai Wan Ho", "Shau Kei Wan", "Chai Wan", "Siu Sai Wan", "Pok Fu Lam", "Aberdeen", "Ap Lei Chau", 
        "Wong Chuk Hang", "Repulse Bay", "Stanley", "The Peak", "City Hall", "Arts Centre", "Academy for Performing Arts", 
        "Convention and Exhibition Centre", "Queen Elizabeth Stadium", "Sunbeam Theatre", "Lee Theatre", "Western Market", 
        "PMQ", "Tai Kwun", "Fringe Club", "Film Archive", "Central Library", "Hong Kong Stadium"
    ],
    "Kowloon": [
        "Tsim Sha Tsui", "Kowloon", "Yau Tsim Mong", "Sham Shui Po", "Wong Tai Sin", "Kwun Tong", "Mong Kok", 
        "Yau Ma Tei", "Jordan", "Hung Hom", "Ho Man Tin", "To Kwa Wan", "Kai Tak", "Kowloon City", "San Po Kong", 
        "Diamond Hill", "Choi Hung", "Ngau Chi Wan", "Lok Fu", "Shek Kip Mei", "Lai Chi Kok", "Cheung Sha Wan", 
        "Mei Foo", "Tai Kok Tsui", "West Kowloon", "Cultural Centre", "Space Museum", "Science Museum", 
        "Museum of History", "Coliseum", "Xiqu Centre", "M+", "Palace Museum", "Ko Shan", "MacPherson", "Museum of Art"
    ]
};

export async function renderLocations() {
    const app = document.getElementById('app');

    // Initial HTML Structure
    app.innerHTML = `
        <div class="container">
            <div class="location-filters-container">
                <div class="filter-group">
                    <input type="text" id="searchInput" class="search-input" placeholder="Search by location...">


                </div>
                
                <div class="filter-group">
                    <select id="areaSelect" class="area-select">
                        <option value="">All</option>
                        ${AREAS.map(area => `<option value="${area}">${area}</option>`).join('')}
                    </select>
                </div>

                <div class="filter-group" style="flex-grow: 1; min-width: 200px;">
                    <label>Distance (km) <span id="distValue" style="font-weight:normal; margin-left:5px;"></span></label>
                    <div class="distance-control">
                        <input type="range" id="distanceInput" class="distance-slider" min="0" max="50" step="1" value="50">
                    </div>
                </div>

                <div class="pagination-top">
                    <button class="btn-page" id="prevPageBtn">PREVIOUS</button>
                    <button class="btn-page" id="nextPageBtn">NEXT</button>
                </div>
            </div>

            <div style="overflow-x:auto;">
                <table class="locations-table" id="locationsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th id="sortName" data-key="name">LOCATION <span class="sort-icon">&updownarrow;</span></th>
                            <th id="sortDistance" data-key="distance">DISTANCE (KM) <span class="sort-icon">&updownarrow;</span></th>
                            <th id="sortEvents" data-key="events">NUMBER OF EVENTS <span class="sort-icon">&updownarrow;</span></th>
                            <th>Add to Favourite</th>
                        </tr>
                    </thead>
                    <tbody id="locationsTbody">
                        <tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="table-footer">
                <div id="pageInfo">Page 1 of 1</div>
                <div id="lastUpdated"></div>

            </div>
        </div>
    `;

    // Helper functions

    const getLocCoords = (loc) => ({
        lat: loc.latitude || loc.lat || (22.3 + Math.random() * 0.1),
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

    // State for this component
    let currentPage = 1;
    const pageSize = 10;
    let sortKey = 'name';
    let sortDir = 'asc';

    try {
        // Fetch data
        const [locations, favorites] = await Promise.all([getLocations(), getFavorites()]);
        updateState({ locations, favorites });
        
        renderTable();

        // Event Listeners
        const searchInput = document.getElementById('searchInput');
        const areaSelect = document.getElementById('areaSelect');
        const distanceInput = document.getElementById('distanceInput');
        const distValue = document.getElementById('distValue');

        const refresh = () => { 
            currentPage = 1; 
            renderTable(); 
        };

        searchInput.addEventListener('input', refresh);
        areaSelect.addEventListener('change', refresh);
        
        distanceInput.addEventListener('input', (e) => {
            distValue.textContent = e.target.value < 50 ? `<= ${e.target.value}` : 'All';
            refresh();
        });
        // Initialize distance label
        distValue.textContent = 'All';

        // Sorting
        const setSort = (key) => {
            if (sortKey === key) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDir = 'asc';
            }
            renderTable();
        };

        document.getElementById('sortName').addEventListener('click', () => setSort('name'));
        document.getElementById('sortDistance').addEventListener('click', () => setSort('distance'));
        document.getElementById('sortEvents').addEventListener('click', () => setSort('events'));

        // Pagination
        document.getElementById('prevPageBtn').addEventListener('click', () => { 
            if(currentPage > 1) { currentPage--; renderTable(); } 
        });
        document.getElementById('nextPageBtn').addEventListener('click', () => { 
            if(currentPage < getTotalPages()) { currentPage++; renderTable(); } 
        });

    } catch (error) {
        document.getElementById('locationsTbody').innerHTML = `<tr><td colspan="5" class="text-error">Error: ${error.message}</td></tr>`;
    }



    function getFiltered() {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const area = document.getElementById('areaSelect').value;
        const distLimit = Number(document.getElementById('distanceInput').value);

        return state.locations.filter(l => {
            const matchName = l.name.toLowerCase().includes(term);
            
            let matchArea = true;
            if (area) {
                const keywords = REGION_MAPPING[area] || [];
                matchArea = keywords.some(k => l.name.toLowerCase().includes(k.toLowerCase()));
            }

            const d = getDist(l);
            const matchDist = distLimit >= 50 || d <= distLimit; // 50 is max on slider, treat as "All" if max? Or just strict limit.
            
            return matchName && matchArea && matchDist;
        });
    }

    function getTotalPages() { 
        return Math.ceil(getFiltered().length / pageSize) || 1; 
    }

    function renderTable() {
        let filtered = getFiltered();

        // Update Sort Icons
        ['name', 'distance', 'events'].forEach(key => {
            const th = document.querySelector(`th[data-key="${key}"] .sort-icon`);
            if (th) {
                th.innerHTML = sortKey === key ? (sortDir === 'asc' ? '&uarr;' : '&darr;') : '&updownarrow;';
                th.style.opacity = sortKey === key ? '1' : '0.3';
            }
        });

        // Sort Data
        filtered.sort((a, b) => {
            let valA, valB;
            if (sortKey === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
            else if (sortKey === 'distance') { valA = getDist(a); valB = getDist(b); }
            else { valA = getEventsCount(a); valB = getEventsCount(b); }

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
        const tbody = document.getElementById('locationsTbody');

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No locations found.</td></tr>`;
        } else {
            tbody.innerHTML = pageItems.map(loc => {
                const id = loc.id || loc._id;
                const isFav = state.favorites.some(f => (f.id || f._id || f) === id);
                const distance = getDist(loc);

                return `
                    <tr class="location-row">
                        <td>${id}</td>
                        <td><span class="location-badge" onclick="window.location.hash='#/location/${id}'" style="cursor:pointer">${loc.name}</span></td>
                        <td>${distance < 9000 ? distance.toFixed(2) + ' km' : 'N/A'}</td>
                        <td>${getEventsCount(loc)}</td>
                        <td onclick="event.stopPropagation()">
                            <button class="fav-btn ${isFav ? 'remove' : 'add'}" 
                                onclick="handleFavorite('${id}')"
                                title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                                ${isFav ? '&times;' : '&check;'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Update timestamp
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-GB', { hour12: false }); // 14:05:51 format
        const dateString = now.toLocaleDateString('en-GB'); // 24/10/2025 format
        document.getElementById('lastUpdated').textContent = `Last updated time: ${dateString}, ${timeString}`;
    }

    // Expose handleFavorite globally
    window.handleFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            const favorites = await getFavorites();
            updateState({ favorites });
            renderTable(); // Re-render to update button state
        } catch (e) { 
            console.error(e);
            alert('Failed to update favorite'); 
        }
    };
}