import { getLocations, toggleFavorite, getFavorites } from '../api.js';
import { state, updateState } from '../state.js';

export async function renderLocations() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <div class="filters-section">
                <div class="filters-row">
                    <div class="form-group">
                        <label>Search</label>
                        <input type="text" id="searchInput" placeholder="Search venues...">
                    </div>
                </div>
                <div class="sort-buttons">
                    <button class="btn btn-secondary" id="sortName">Sort by Name</button>
                </div>
            </div>
            <div id="locationsGrid" class="locations-grid">
                <div class="loading"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    try {
        console.log('Fetching locations and favorites...');
        const [locations, favorites] = await Promise.all([
            getLocations(),
            getFavorites().catch(err => {
                console.error('Failed to load favorites:', err);
                return []; // Fallback to empty favorites if request fails
            })
        ]);
        
        updateState({ locations, favorites });
        renderLocationsGrid(locations);

        // Event Listeners
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = state.locations.filter(l => 
                l.name.toLowerCase().includes(term)
            );
            renderLocationsGrid(filtered);
        });

        document.getElementById('sortName').addEventListener('click', () => {
            const sorted = [...state.locations].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            renderLocationsGrid(sorted);
        });

    } catch (error) {
        document.getElementById('locationsGrid').innerHTML = 
            `<div class="text-error">Error loading locations: ${error.message}</div>`;
    }
}

function renderLocationsGrid(locations) {
    const grid = document.getElementById('locationsGrid');
    
    if (locations.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted">No locations found.</p>';
        return;
    }

    grid.innerHTML = locations.map(loc => {
        const isFav = state.favorites.some(f => f && (f._id === loc._id || f === loc._id));
        return `
            <div class="location-card" onclick="window.location.hash='#/location/${loc.id}'">
                <h3>${loc.name}</h3>
                <div class="location-card-footer">
                    <button class="btn btn-small ${isFav ? 'btn-danger' : 'btn-secondary'} fav-btn" 
                            data-id="${loc.id}" 
                            onclick="event.stopPropagation(); handleFavorite('${loc.id}')">
                        ${isFav ? '❤️ Saved' : '🤍 Save'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Attach event handlers to window for inline onclicks
    window.handleFavorite = async (id) => {
        try {
            await toggleFavorite(id);
            // Refresh favorites
            const favorites = await getFavorites();
            updateState({ favorites });
            // Re-render current view to update buttons
            renderLocationsGrid(state.locations); 
        } catch (error) {
            alert('Error updating favorite: ' + error.message);
        }
    };
}
