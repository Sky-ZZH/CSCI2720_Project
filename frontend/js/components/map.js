import { getLocations } from '../api.js';

export async function renderMap() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <h1>Locations Map</h1>
            <div id="fullMap" style="height: 600px; width: 100%; border-radius: 8px; z-index: 1;"></div>
        </div>
    `;

    try {
        const locations = await getLocations();
        
        // Default center (Hong Kong)
        const map = L.map('fullMap').setView([22.3193, 114.1694], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        locations.forEach(loc => {
            if (loc.latitude && loc.longitude) {
                L.marker([loc.latitude, loc.longitude])
                    .addTo(map)
                    .bindPopup(`
                        <b>${loc.name}</b><br>
                        <a href="#/location/${loc.id}">View Details</a>
                    `);
            }
        });

    } catch (error) {
        app.innerHTML = `<div class="text-error">Error loading map: ${error.message}</div>`;
    }
}
