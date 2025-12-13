import { state, updateState } from './state.js';
import { renderLogin } from './components/login.js';
import { renderLocations } from './components/locations.js';
import { renderLocationDetail } from './components/locationDetail.js';
import { renderFavourites } from './components/favourites.js';
import { renderAdmin } from './components/admin.js';
import { renderMap } from './components/map.js';

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Theme
    if (state.isDarkMode) document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Routing
    window.addEventListener('hashchange', handleRouting);

    // Check auth
    if (state.token) {
        // Try to decode token to get username/role
        try {
            const payload = JSON.parse(atob(state.token.split('.')[1]));
            updateState({
                currentUser: payload.username,
                role: payload.role
            });
            updateNavBar();
            handleRouting();
        } catch (e) {
            logout();
        }
    } else {
        renderLogin();
    }
});

// ============================================================
// ROUTING
// ============================================================
export function handleRouting() {
    const hash = window.location.hash.slice(1) || '/locations';
    const [route, id] = hash.split('/').filter(Boolean);

    if (!state.token && route !== 'login') {
        renderLogin();
        return;
    }

    // Update active nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[href="#/${route}"]`);
    if (activeLink) activeLink.classList.add('active');

    switch (route) {
        case 'login': renderLogin(); break;
        case 'locations': renderLocations(); break;
        case 'map': renderMap(); break;
        case 'location': renderLocationDetail(id); break;
        case 'favourites': renderFavourites(); break;
        case 'admin': 
            if (state.role === 'admin') {
                renderAdmin(); 
            } else {
                alert('Access Denied');
                window.location.hash = '#/locations';
            }
            break;
        default: renderLocations();
    }
}

// ============================================================
// UI HELPERS
// ============================================================
function updateNavBar() {
    const userDisplay = document.getElementById('userDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');

    if (state.currentUser) {
        userDisplay.textContent = `Hi, ${state.currentUser}`;
        logoutBtn.style.display = 'inline-block';
        if (state.role === 'admin') {
            adminLink.style.display = 'inline-block';
        }
    } else {
        userDisplay.textContent = '';
        logoutBtn.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', state.isDarkMode);
}

function logout() {
    localStorage.removeItem('token');
    updateState({
        token: null,
        currentUser: null,
        role: null
    });
    window.location.hash = '';
    window.location.reload();
}
