// js/state.js
export const API_BASE_URL = 'http://localhost:5000/api';

// Default: Center of Hong Kong (approx Mong Kok)
export const DEFAULT_LOCATION = {
    latitude: 22.3193,
    longitude: 114.1694,
    name: "Hong Kong (Default)"
};

export const state = {
    token: localStorage.getItem('token'),
    currentUser: null,
    role: null,
    locations: [],
    favorites: [],
    currentLocationId: null,
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    // Load saved location or use default
    userLocation: JSON.parse(localStorage.getItem('userLocation')) || DEFAULT_LOCATION
};

export function updateState(newState) {
    Object.assign(state, newState);
}
