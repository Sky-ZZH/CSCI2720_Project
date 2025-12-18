import { state, updateState } from '../state.js';

export function renderProfile() {
    const app = document.getElementById('app');
    
    // Preset locations in Hong Kong
    const PRESETS = [
        { name: "Central", lat: 22.2819, lng: 114.1581 },
        { name: "Sha Tin", lat: 22.3820, lng: 114.1917 },
        { name: "Mong Kok", lat: 22.3193, lng: 114.1694 },
        { name: "Tuen Mun", lat: 22.3908, lng: 113.9726 },
        { name: "Causeway Bay", lat: 22.2802, lng: 114.1837 },
        { name: "Tsuen Wan", lat: 22.3713, lng: 114.1141 }
    ];

    app.innerHTML = `
        <!-- Added margin: 0 auto to center the container strictly -->
        <div class="container" style="max-width: 600px; margin: 2rem auto;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h1 style="margin:0;">User Profile</h1>
                <button class="btn btn-secondary btn-small" onclick="window.location.hash='#/locations'">Back to List</button>
            </div>
            
            <div class="detail-info" style="text-align: center;">
                <h3 style="margin-top:0;">📍 Location Settings</h3>
                <p class="text-muted" style="margin-bottom: 1.5rem;">
                    Set your default location to calculate distances to venues.
                </p>
                
                <!-- Center the Info Box -->
                <div class="form-group" style="background: var(--bg-color); padding: 1.5rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:bold;">Current Location</label>
                    
                    <div style="font-weight:bold; color:var(--secondary-color); font-size: 1.4rem; margin-bottom:0.5rem;">
                        ${state.userLocation.name || 'Custom Location'} 
                    </div>
                    
                    <div style="font-size:0.9rem; color:var(--text-color); opacity: 0.8; font-family: monospace;">
                        Lat: ${state.userLocation.latitude.toFixed(4)}, Lng: ${state.userLocation.longitude.toFixed(4)}
                    </div>
                </div>

                <hr style="margin: 1.5rem 0; border:0; border-top:1px solid var(--border-color);">

                <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px; margin: 0 auto;">
                    <!-- Method 1: Auto Detect -->
                    <button class="btn btn-primary" id="btnGeoLocate" style="width:100%; display:flex; justify-content:center; align-items:center; gap:0.5rem; padding: 0.8rem;">
                        <span>📡</span> Use GPS Location
                    </button>

                    <div style="text-align:center; color: var(--text-color); opacity: 0.5;">- OR -</div>

                    <!-- Method 2: Preset -->
                    <div class="form-group">
                        <select id="presetSelect" style="width:100%; padding:0.8rem; border:1px solid var(--border-color); border-radius:5px; background:var(--card-bg); color:var(--text-color); cursor: pointer;">
                            <option value="">Select a District...</option>
                            ${PRESETS.map(p => `<option value="${p.name}|${p.lat}|${p.lng}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

            </div>
        </div>
    `;

    // 1. Handle Geolocation
    document.getElementById('btnGeoLocate').addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        
        const btn = document.getElementById('btnGeoLocate');
        const originalText = btn.innerHTML;
        btn.innerHTML = "Locating...";
        btn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLoc = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    name: "Current Location (GPS)"
                };
                saveLocation(newLoc);
            },
            (error) => {
                console.error(error);
                alert("Unable to retrieve your location. Please check browser permissions.");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        );
    });

    // 2. Handle Preset Selection
    document.getElementById('presetSelect').addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const [name, lat, lng] = val.split('|');
        const newLoc = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            name: name
        };
        saveLocation(newLoc);
    });

    function saveLocation(loc) {
        updateState({ userLocation: loc });
        localStorage.setItem('userLocation', JSON.stringify(loc));
        // alert(`Location updated to: ${loc.name}`); // Optional: remove alert for smoother UX
        renderProfile(); // Re-render to show new state
    }
}
