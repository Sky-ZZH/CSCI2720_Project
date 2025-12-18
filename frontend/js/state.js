export const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const state = {
    token: localStorage.getItem('token'),
    currentUser: null,
    userId: null,
    role: null,
    locations: [],
    favourites: [],
    currentLocationId: null,
    isDarkMode: localStorage.getItem('darkMode') === 'true'
};

export function updateState(newState) {
    Object.assign(state, newState);
}
