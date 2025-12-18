import { getFavorites } from '../api.js';
import { state } from '../state.js';

export async function renderFavourites() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <h1>My Favourite Locations</h1>
            <div id="favGrid" class="locations-grid">
                <div class="loading"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    try {
        const favorites = await getFavorites();
        const grid = document.getElementById('favGrid');

        if (favorites.length === 0) {
            grid.innerHTML = '<p class="text-center text-muted">You haven\'t saved any locations yet.</p>';
            return;
        }

        grid.innerHTML = favorites.map(loc => `
            <div class="location-card" onclick="window.location.hash='#/location/${loc.id}'">
                <h3>${loc.name}</h3>
                <div class="location-card-footer">
                    <button class="btn btn-danger btn-small" 
                            onclick="event.stopPropagation(); handleFavorite('${loc.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');

        // Re-use the global handleFavorite from locations.js or define a specific one here
        // Ideally, we should import the toggle logic or make it shared.
        // For now, we rely on the window.handleFavorite defined in locations.js if loaded, 
        // but since we might land here directly, we should redefine it safely.
        window.handleFavorite = async (id) => {
            const { toggleFavorite } = await import('../api.js');
            try {
                await toggleFavorite(id);
                renderFavourites(); // Reload list
            } catch (error) {
                alert('Error removing favorite: ' + error.message);
            }
        };

    } catch (error) {
        document.getElementById('favGrid').innerHTML = 
            `<div class="text-error">Error loading favorites: ${error.message}</div>`;
    }
}
