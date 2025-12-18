import { state, updateState } from './state.js';
import { renderLogin } from './components/login.js';
import { renderSignup } from './components/signup.js'; // Import signup
import { renderLocations } from './components/locations.js';
import { renderLocationDetail } from './components/locationDetail.js';
import { renderFavourites } from './components/favourites.js';
import { renderAdmin } from './components/admin.js';
import { renderMap } from './components/map.js';
import { renderProfile } from './components/profile.js';

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Theme
    if (state.isDarkMode) document.documentElement.setAttribute('data-theme', 'dark');
    
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Logout button - support both old (logoutBtn) and new (signOutBtn) element
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', logout);

    // User dropdown toggle
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.classList.toggle('show');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const userMenu = document.getElementById('userMenu');
        const dropdown = document.getElementById('userDropdown');
        if (userMenu && dropdown && !userMenu.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // Wire up user menu buttons
    const userManagerBtn = document.getElementById('userManagerBtn');
    if (userManagerBtn) userManagerBtn.addEventListener('click', () => { window.location.hash = '#/admin'; });

    const eventManagerBtn = document.getElementById('eventManagerBtn');
    if (eventManagerBtn) eventManagerBtn.addEventListener('click', () => { window.location.hash = '#/admin'; });

    // Wire up Profile Button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => { 
            window.location.hash = '#/profile'; 
        });
    }

    // Routing
    window.addEventListener('hashchange', handleRouting);

    // Check auth on load
    if (state.token) {
        try {
            // Robust Token Decoding
            const base64Url = state.token.split('.')[1];
            if (!base64Url) throw new Error("Invalid token format");

            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);

            updateState({
                currentUser: payload.username || payload.sub || 'User',
                role: payload.role || 'user'
            });
            
            updateNavBar();
            handleRouting();
        } catch (e) {
            console.error("Token validation failed:", e);
            logout();
        }
    } else {
        // If no token, check if we're on the signup page, otherwise redirect to login
        const currentHash = window.location.hash;
        if (currentHash !== '#/signup') {
            renderLogin();
        } else {
            renderSignup();
        }
    }
});

// ============================================================
// ROUTING
// ============================================================

export function handleRouting() {
    // Ensure navbar state is correct on every route change
    updateNavBar();

    const hash = window.location.hash.slice(1) || '/home'; // Default to home
    const [route, id] = hash.split('/').filter(Boolean);

    // Allow signup without token
    if (!state.token && route !== 'login' && route !== 'signup') {
        renderLogin();
        return;
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[href="#/${route}"]`);
    if (activeLink) activeLink.classList.add('active');

    switch (route) {
        case 'login':
            renderLogin();
            break;
        case 'signup': // New signup route
            renderSignup();
            break;
        case 'home':
            renderHome();
            break;
        case 'locations':
            renderLocations();
            break;
        case 'events':
            renderEvents();
            break;
        case 'map':
            renderMap();
            break;
        case 'profile':
            renderProfile();
            break;
        case 'location':
            renderLocationDetail(id);
            break;
        case 'favourites':
            renderFavourites();
            break;
        case 'admin':
            if (state.role === 'admin') {
                renderAdmin();
            } else {
                alert('Access Denied');
                window.location.hash = '#/locations';
            }
            break;
        default:
            renderLocations();
    }
}

// ============================================================
// UI HELPERS
// ============================================================

function updateNavBar() {
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    const userManagerBtn = document.getElementById('userManagerBtn');
    const eventManagerBtn = document.getElementById('eventManagerBtn');

    if (state.currentUser) {
        if (userMenu) {
            userMenu.style.display = 'inline-flex';
            if (userName) userName.textContent = state.currentUser;
            if (userEmail) userEmail.textContent = state.role === 'admin' ? 'admin@example.com' : 'user@example.com'; 
            if (userAvatar) userAvatar.textContent = (state.currentUser[0] || 'U').toUpperCase();

            const isAdmin = state.role === 'admin';
            if (userManagerBtn) userManagerBtn.style.display = isAdmin ? 'block' : 'none';
            if (eventManagerBtn) eventManagerBtn.style.display = isAdmin ? 'block' : 'none';
        }
    } else {
        if (userMenu) userMenu.style.display = 'none';
    }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', state.isDarkMode);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userLocation'); // Optional: Clear location on logout
    updateState({
        token: null,
        currentUser: null,
        role: null,
        userLocation: null // Reset state
    });
    window.location.hash = '#/login';
    window.location.reload();
}

// Placeholder functions
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container text-center">
            <h1>Welcome to HK Cultural Events Finder</h1>
            <p>Discover art, music, and cultural events near you.</p>
            <br>
            <a href="#/locations" class="btn btn-primary">Browse Locations</a>
        </div>
    `;
}

function renderEvents() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <h1>Events</h1>
            <p class="text-muted">Event list coming soon...</p>
        </div>
    `;
}
