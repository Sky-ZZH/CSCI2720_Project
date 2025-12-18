import { getUsers, createUser, updateUser, deleteUser, getEvents, deleteEvent } from '../api.js';

export async function renderAdmin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <h1>Admin Dashboard</h1>
            <div class="admin-container">
                <div class="admin-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h2>User Management</h2>
                        <button class="btn btn-primary btn-small" id="addUserBtn">Add User</button>
                    </div>
                    <div id="usersList" class="admin-list">
                        <div class="loading"><div class="spinner"></div></div>
                    </div>
                </div>
                <div class="admin-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h2>Event Management</h2>
                    </div>
                    <div id="eventsList" class="admin-list">
                        <div class="loading"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadUsers();
    loadEvents();

    document.getElementById('addUserBtn').addEventListener('click', () => {
        showUserModal();
    });
}

async function loadEvents() {
    try {
        const events = await getEvents();
        const list = document.getElementById('eventsList');
        
        if (events.length === 0) {
            list.innerHTML = '<p class="text-muted">No events found.</p>';
            return;
        }

        list.innerHTML = events.map(event => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <strong>${event.title}</strong>
                    <span class="text-muted" style="font-size:0.8em">${event.venue ? event.venue.name : 'Unknown Venue'}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="btn btn-danger btn-small" onclick="removeEvent('${event._id}')">Delete</button>
                </div>
            </div>
        `).join('');

        window.removeEvent = async (id) => {
            if (confirm('Are you sure you want to delete this event?')) {
                try {
                    await deleteEvent(id);
                    loadEvents();
                } catch (error) {
                    alert('Error deleting event: ' + error.message);
                }
            }
        };

    } catch (error) {
        document.getElementById('eventsList').innerHTML = 
            `<div class="text-error">Error loading events: ${error.message}</div>`;
    }
}

async function loadUsers() {
    try {
        const users = await getUsers();
        const list = document.getElementById('usersList');
        
        if (users.length === 0) {
            list.innerHTML = '<p class="text-muted">No users found.</p>';
            return;
        }

        list.innerHTML = users.map(user => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <strong>${user.username}</strong>
                    <span class="badge">${user.role}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="btn btn-secondary btn-small" onclick="editUser('${user._id}', '${user.username}', '${user.role}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="removeUser('${user._id}')">Delete</button>
                </div>
            </div>
        `).join('');

        window.editUser = (id, username, role) => showUserModal({ id, username, role });
        window.removeUser = async (id) => {
            if (confirm('Are you sure you want to delete this user?')) {
                try {
                    await deleteUser(id);
                    loadUsers();
                } catch (error) {
                    alert('Error deleting user: ' + error.message);
                }
            }
        };

    } catch (error) {
        document.getElementById('usersList').innerHTML = 
            `<div class="text-error">Error loading users: ${error.message}</div>`;
    }
}

function showUserModal(user = null) {
    const isEdit = !!user;
    const modalHtml = `
        <div id="userModal" class="modal show">
            <div class="modal-content">
                <span class="close" id="closeUserModal">&times;</span>
                <h2>${isEdit ? 'Edit User' : 'Create User'}</h2>
                <form id="userForm">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="formUsername" value="${user ? user.username : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Password ${isEdit ? '(leave blank to keep current)' : ''}</label>
                        <input type="password" id="formPassword" ${isEdit ? '' : 'required'}>
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select id="formRole">
                            <option value="user" ${user && user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${user && user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                </form>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHtml;

    const modal = document.getElementById('userModal');
    const closeBtn = document.getElementById('closeUserModal');
    
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => modalContainer.innerHTML = '', 300);
    };

    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) closeModal();
    };

    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('formUsername').value;
        const password = document.getElementById('formPassword').value;
        const role = document.getElementById('formRole').value;

        const userData = { username, role };
        if (password) userData.password = password;

        try {
            if (isEdit) {
                await updateUser(user.id, userData);
            } else {
                await createUser(userData);
            }
            closeModal();
            loadUsers();
        } catch (error) {
            alert('Error saving user: ' + error.message);
        }
    });
}
