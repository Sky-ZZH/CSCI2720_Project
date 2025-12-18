import { getLocations, toggleFavorite, getFavorites } from '../api.js';
import { state, updateState } from '../state.js';

// Local state for the locations view
let viewState = {
    sortBy: 'name', // 'name', 'distance', 'eventCount'
    sortOrder: 'asc', // 'asc', 'desc'
    currentPage: 1,
    itemsPerPage: 5,
    userLocation: null, // { lat, lng }
    searchTerm: '',
    maxDistance: 30 // Default max distance
};

export async function renderLocations() {
    const app = document.getElementById('app');
    
    // Initial HTML structure
    app.innerHTML = `
        <div class="container">
            <div class="toolbar">
                <div class="search-bar">
                    <input type="text" id="searchInput" placeholder="Search by location..." value="${viewState.searchTerm}">
                </div>
                
                <div class="filter-group">
                    <select id="areaSelect" class="form-select">
                        <option value="">All Areas</option>
                        <option value="Hong Kong Island">Hong Kong Island</option>
                        <option value="Kowloon">Kowloon</option>
                        <option value="New Territories">New Territories</option>
                    </select>
                </div>

                <div class="filter-group">
                    <div class="slider-container">
                        <label>Distance: <span id="distanceValue">${viewState.maxDistance}</span> km</label>
                        <input type="range" id="distanceSlider" min="1" max="30" value="${viewState.maxDistance}">
                    </div>
                </div>

                <div class="pagination-buttons">
                    <button id="prevBtn" class="btn btn-secondary" disabled>PREVIOUS</button>
                    <button id="nextBtn" class="btn btn-secondary" disabled>NEXT</button>
                </div>
            </div>

            <div class="table-container">
                <table class="locations-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th class="sortable-header" data-sort="name">
                                <div class="sort-button">
                                    LOCATION <span class="sort-icon" id="sort-name">↕</span>
                                </div>
                            </th>
                            <th class="sortable-header" data-sort="distance">
                                <div class="sort-button">
                                    DISTANCE (KM) <span class="sort-icon" id="sort-distance">↕</span>
                                </div>
                            </th>
                            <th class="sortable-header" data-sort="eventCount">
                                <div class="sort-button">
                                    NUMBER OF EVENTS <span class="sort-icon" id="sort-eventCount">↕</span>
                                </div>
                            </th>
                            <th>Add to Favourite</th>
                        </tr>
                    </thead>
                    <tbody id="locationsTableBody">
                        <tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>
                    </tbody>
                </table>
            </div>

            <div class="footer-info">
                <span id="pageInfo">Page 1 of 1</span>
                <div class="last-updated" id="lastUpdated"></div>
            </div>
        </div>
    `;

    // Get User Location
    if (!viewState.userLocation) {
        try {
            const position = await getCurrentPosition();
            viewState.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
        } catch (error) {
            console.log("User denied geolocation or error:", error);
            // Default to CUHK or just null (will show N/A)
            // viewState.userLocation = { lat: 22.4196, lng: 114.2068 }; 
        }
    }

    try {
        const [locations, favorites] = await Promise.all([
            getLocations(),
            getFavorites().catch(() => [])
        ]);
        
        updateState({ locations, favorites });

        // Sync search term with input value (in case of browser autofill)
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            viewState.searchTerm = searchInput.value.trim().toLowerCase();
        }

        renderTable();
        setupEventListeners();

    } catch (error) {
        document.getElementById('locationsTableBody').innerHTML = 
            `<tr><td colspan="5" class="text-error">Error loading locations: ${error.message}</td></tr>`;
    }
}

function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        viewState.searchTerm = e.target.value.trim().toLowerCase();
        viewState.currentPage = 1; // Reset to first page on search
        renderTable();
    });

    // Distance Slider
    const distanceSlider = document.getElementById('distanceSlider');
    const distanceValue = document.getElementById('distanceValue');
    
    distanceSlider.addEventListener('input', (e) => {
        viewState.maxDistance = parseInt(e.target.value);
        distanceValue.textContent = viewState.maxDistance;
        viewState.currentPage = 1;
        renderTable();
    });

    // Area Select (Mock implementation - just filters by name for now as we lack area data)
    document.getElementById('areaSelect').addEventListener('change', (e) => {
        // In a real app, we would filter by area field. 
        // Here we can't do much without data, but let's just log it or maybe try to filter by name keywords?
        // For now, let's just reset page.
        viewState.currentPage = 1;
        renderTable();
    });

    // Sorting
    document.querySelectorAll('.sortable-header').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (viewState.sortBy === sortKey) {
                viewState.sortOrder = viewState.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                viewState.sortBy = sortKey;
                viewState.sortOrder = 'asc';
            }
            renderTable();
        });
    });

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (viewState.currentPage > 1) {
            viewState.currentPage--;
            renderTable();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredLocations().length / viewState.itemsPerPage);
        if (viewState.currentPage < totalPages) {
            viewState.currentPage++;
            renderTable();
        }
    });
}

function getFilteredLocations() {
    let filtered = state.locations.filter(loc => 
        loc.name && loc.name.toLowerCase().includes(viewState.searchTerm)
    );

    // Filter by Area (Mock - checking if name contains the area keyword)
    const areaSelect = document.getElementById('areaSelect');
    if (areaSelect && areaSelect.value) {
        const area = areaSelect.value.toLowerCase();
        // Simple keyword matching since we don't have area data
        // e.g. "Hong Kong" might match "Hong Kong City Hall"
        // "Kowloon" might match "Kowloon Park"
        // This is not perfect but better than nothing
        if (area === 'hong kong island') {
            filtered = filtered.filter(l => 
                l.name.toLowerCase().includes('city hall') || 
                l.name.toLowerCase().includes('film archive') || 
                l.name.toLowerCase().includes('sai wan ho') ||
                l.name.toLowerCase().includes('sheung wan') ||
                l.name.toLowerCase().includes('queen elizabeth') ||
                l.name.toLowerCase().includes('arts centre')
            );
        } else if (area === 'kowloon') {
            filtered = filtered.filter(l => 
                l.name.toLowerCase().includes('kowloon') || 
                l.name.toLowerCase().includes('cultural centre') || 
                l.name.toLowerCase().includes('ko shan') || 
                l.name.toLowerCase().includes('ngau chi wan') ||
                l.name.toLowerCase().includes('coliseum') ||
                l.name.toLowerCase().includes('space museum') ||
                l.name.toLowerCase().includes('science museum') ||
                l.name.toLowerCase().includes('xiqu')
            );
        } else if (area === 'new territories') {
            filtered = filtered.filter(l => 
                l.name.toLowerCase().includes('sha tin') || 
                l.name.toLowerCase().includes('tuen mun') || 
                l.name.toLowerCase().includes('yuen long') || 
                l.name.toLowerCase().includes('tsuen wan') || 
                l.name.toLowerCase().includes('kwai tsing') ||
                l.name.toLowerCase().includes('tai po') ||
                l.name.toLowerCase().includes('north district')
            );
        }
    }

    // Calculate distances if user location is available
    filtered = filtered.map(loc => {
        let distance = null;
        if (viewState.userLocation && loc.latitude && loc.longitude) {
            distance = getDistanceFromLatLonInKm(
                viewState.userLocation.lat,
                viewState.userLocation.lng,
                loc.latitude,
                loc.longitude
            );
        }
        return { ...loc, distance };
    });

    // Filter by Distance
    if (viewState.userLocation) {
        filtered = filtered.filter(loc => loc.distance !== null && loc.distance <= viewState.maxDistance);
    }

    // Sort
    filtered.sort((a, b) => {
        let valA, valB;

        switch (viewState.sortBy) {
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'distance':
                valA = a.distance === null ? Infinity : a.distance;
                valB = b.distance === null ? Infinity : b.distance;
                break;
            case 'eventCount':
                valA = a.events ? a.events.length : 0;
                valB = b.events ? b.events.length : 0;
                break;
            default:
                valA = a.name;
                valB = b.name;
        }

        if (valA < valB) return viewState.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return viewState.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
}

function renderTable() {
    const tbody = document.getElementById('locationsTableBody');
    const filtered = getFilteredLocations();
    
    // Pagination logic
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / viewState.itemsPerPage) || 1;
    
    // Ensure current page is valid
    if (viewState.currentPage > totalPages) viewState.currentPage = totalPages;
    if (viewState.currentPage < 1) viewState.currentPage = 1;

    const startIndex = (viewState.currentPage - 1) * viewState.itemsPerPage;
    const endIndex = Math.min(startIndex + viewState.itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Update Pagination Controls
    document.getElementById('pageInfo').textContent = `Page ${viewState.currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = viewState.currentPage === 1;
    document.getElementById('nextBtn').disabled = viewState.currentPage === totalPages;

    // Update Sort Icons
    document.querySelectorAll('.sort-icon').forEach(icon => icon.textContent = '↕');
    const currentSortIcon = document.getElementById(`sort-${viewState.sortBy}`);
    if (currentSortIcon) {
        currentSortIcon.textContent = viewState.sortOrder === 'asc' ? '↑' : '↓';
    }

    // Render Rows
    if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No locations found.</td></tr>';
        return;
    }

    tbody.innerHTML = pageItems.map(loc => {
        const isFav = state.favorites.some(f => f && (f._id === loc._id || f === loc._id));
        const distanceStr = loc.distance !== null ? loc.distance.toFixed(2) + ' km' : 'N/A';
        const eventCount = loc.events ? loc.events.length : 0;

        return `
            <tr onclick="window.location.hash='#/location/${loc.id}'" style="cursor:pointer">
                <td>${loc.id}</td>
                <td>
                    <a href="#/location/${loc.id}" class="location-pill" onclick="event.stopPropagation()">
                        ${loc.name}
                    </a>
                </td>
                <td>${distanceStr}</td>
                <td>${eventCount}</td>
                <td>
                    <button class="btn-fav-square ${isFav ? 'active' : ''}" 
                            onclick="event.stopPropagation(); handleFavorite('${loc.id}')">
                        ${isFav ? '✓' : '✕'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Update timestamp
    document.getElementById('lastUpdated').textContent = `Last updated time: ${new Date().toLocaleString()}`;

    // Attach global handler
    window.handleFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            const favorites = await getFavorites();
            updateState({ favorites });
            renderTable(); // Re-render to update icons
        } catch (error) {
            alert('Error updating favorite: ' + error.message);
        }
    };
}

// Helper: Get Current Position
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        }
    });
}

// Helper: Haversine Distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
