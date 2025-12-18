// js/components/signup.js
import { state, updateState, DEFAULT_LOCATION } from '../state.js';
import { API_BASE_URL } from '../state.js';

export function renderSignup() {
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

    // Initialize with default location
    let selectedLocation = { ...DEFAULT_LOCATION };

    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <h1 style="text-align: center; margin-bottom: 0.5rem;">Create Account</h1>
                <p class="text-muted" style="text-align: center; margin-bottom: 2rem;">Join HK Cultural Events Finder</p>
                
                <form id="signupForm">
                    <!-- Username -->
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="username" placeholder="Choose a username" required>
                    </div>

                    <!-- Email -->
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="email" placeholder="your@email.com" required>
                    </div>

                    <!-- Password -->
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" placeholder="At least 6 characters" required minlength="6">
                    </div>

                    <!-- Confirm Password -->
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="confirmPassword" placeholder="Re-enter password" required>
                    </div>

                    <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid var(--border-color);">

                    <!-- Location Settings -->
                    <h3 style="font-size: 1.1rem; margin-bottom: 1rem;">📍 Set Default Location</h3>
                    
                    <div class="form-group" style="background: var(--bg-color); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <label style="font-weight: bold; margin-bottom: 0.5rem; display: block;">Selected Location</label>
                        <div id="selectedLocationDisplay" style="color: var(--secondary-color); font-weight: bold;">
                            ${selectedLocation.name}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7; margin-top: 0.25rem;">
                            Lat: <span id="latDisplay">${selectedLocation.latitude.toFixed(4)}</span>, 
                            Lng: <span id="lngDisplay">${selectedLocation.longitude.toFixed(4)}</span>
                        </div>
                    </div>

                    <!-- GPS Button -->
                    <button type="button" class="btn btn-secondary" id="btnUseGPS" style="width: 100%; margin-bottom: 1rem;">
                        📡 Use My GPS Location
                    </button>

                    <!-- Preset Selector -->
                    <div class="form-group">
                        <label>Or Select Area</label>
                        <select id="locationPreset" style="width:100%; padding:0.8rem; border:1px solid var(--border-color); border-radius:5px; background:var(--card-bg); color:var(--text-color);">
                            <option value="">Hong Kong (Default)</option>
                            ${PRESETS.map(p => `<option value="${p.name}|${p.lat}|${p.lng}">${p.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                        Create Account
                    </button>

                    <div class="text-muted" style="text-align: center; margin-top: 1rem;">
                        Already have an account? <a href="#/login" style="color: var(--primary-color);">Sign In</a>
                    </div>
                </form>

                <div id="errorMessage" style="color: var(--error-color); text-align: center; margin-top: 1rem; display: none;"></div>
            </div>
        </div>
    `;

    // Update location display
    function updateLocationDisplay() {
        document.getElementById('selectedLocationDisplay').textContent = selectedLocation.name;
        document.getElementById('latDisplay').textContent = selectedLocation.latitude.toFixed(4);
        document.getElementById('lngDisplay').textContent = selectedLocation.longitude.toFixed(4);
    }

    // GPS Button Handler
    document.getElementById('btnUseGPS').addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        const btn = document.getElementById('btnUseGPS');
        btn.textContent = "Locating...";
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                selectedLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    name: "Current Location (GPS)"
                };
                updateLocationDisplay();
                btn.textContent = "📡 Use My GPS Location";
                btn.disabled = false;
            },
            (error) => {
                console.error(error);
                alert("Unable to get location. Using default.");
                btn.textContent = "📡 Use My GPS Location";
                btn.disabled = false;
            }
        );
    });

    // Preset Selector Handler
    document.getElementById('locationPreset').addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) {
            selectedLocation = { ...DEFAULT_LOCATION };
        } else {
            const [name, lat, lng] = val.split('|');
            selectedLocation = {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                name: name
            };
        }
        updateLocationDisplay();
    });

    // Form Submit Handler
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('errorMessage');

        // Validation
        if (password !== confirmPassword) {
            errorDiv.textContent = "Passwords do not match";
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    location: selectedLocation // Send location with signup
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store token and location
            localStorage.setItem('token', data.token);
            localStorage.setItem('userLocation', JSON.stringify(selectedLocation));
            
            updateState({
                token: data.token,
                currentUser: data.user.username,
                role: data.user.role || 'user',
                userLocation: selectedLocation
            });

            alert('Account created successfully!');
            window.location.hash = '#/locations';

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
}
