import { API_BASE_URL, state } from './state.js';

export async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.hash = '#/login';
            window.location.reload();
        }
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

export async function login(username, password) {
    return fetchAPI('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

export async function getLocations(keyword = '') {
    const query = keyword ? `?keyword=${keyword}` : '';
    return fetchAPI(`/locations${query}`);
}

export async function getLocationDetails(id) {
    return fetchAPI(`/locations/${id}`);
}

export async function toggleFavorite(locationId) {
    return fetchAPI('/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ locationId })
    });
}

export async function getFavorites() {
    return fetchAPI('/user/favorites');
}

export async function addComment(locationId, content) {
    return fetchAPI(`/locations/${locationId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
    });
}

export async function deleteComment(locationId, commentId) {
    return fetchAPI(`/locations/${locationId}/comments/${commentId}`, {
        method: 'DELETE'
    });
}

// Admin API calls
export async function getEvents() {
    return fetchAPI('/admin/events');
}

export async function createEvent(eventData) {
    return fetchAPI('/admin/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
    });
}

export async function updateEvent(id, eventData) {
    return fetchAPI(`/admin/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData)
    });
}

export async function deleteEvent(id) {
    return fetchAPI(`/admin/events/${id}`, {
        method: 'DELETE'
    });
}

export async function getUsers() {
    return fetchAPI('/admin/users');
}

export async function createUser(userData) {
    return fetchAPI('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
}

export async function updateUser(id, userData) {
    return fetchAPI(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
}

export async function deleteUser(id) {
    return fetchAPI(`/admin/users/${id}`, {
        method: 'DELETE'
    });
}
