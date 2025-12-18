import { getUsers, createUser, updateUser, deleteUser } from '../api.js';

export async function renderAdmin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container" style="max-width: 1200px; margin: 2rem auto;">
      <h1 style="margin-bottom: 2rem; color: var(--primary-color);">Admin Dashboard</h1>

      <!-- User Management Section -->
      <div class="admin-section" style="background: var(--card-bg); padding: 2rem; border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 3rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <h2 style="color: var(--secondary-color);">User Management</h2>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; gap: 1rem; flex-wrap: wrap;">
          <button class="btn btn-primary" id="addUserBtn">New User</button>
          <input type="text" id="userSearchInput" placeholder="Search users by username..." 
            style="padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px; min-width: 300px;">
        </div>

        <div style="margin-bottom: 1rem; color: var(--text-color); opacity: 0.7; font-size: 0.9rem;">
          Last Updated on <span id="usersLastUpdated"></span>
        </div>

        <div style="overflow-x:auto;">
          <table class="locations-table" id="usersTable" style="width:100%; border-collapse: collapse;">
            <thead>
              <tr style="background:var(--bg-color); color:var(--text-color);">
                <th style="width: 40%; padding: 1rem; text-align: left; border-bottom: 2px solid var(--border-color);">NAME</th>
                <th style="width: 30%; padding: 1rem; text-align: left; border-bottom: 2px solid var(--border-color);">ROLE</th>
                <th style="width: 30%; padding: 1rem; text-align: left; border-bottom: 2px solid var(--border-color);">ACTIONS</th>
              </tr>
            </thead>
            <tbody id="usersTbody">
              <tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-color); opacity:0.6;">Loading users...</td></tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:center; align-items:center; margin-top:1.5rem; gap:1rem;">
          <button class="btn btn-secondary" id="prevUserBtn" disabled>Previous</button>
          <span id="userPageInfo" style="color:var(--text-color);">Page 1 of 1</span>
          <button class="btn btn-secondary" id="nextUserBtn" disabled>Next</button>
        </div>
      </div>

      <!-- Event Management Link -->
      <div class="admin-section" style="background: var(--card-bg); padding: 2rem; border-radius: 8px; box-shadow: var(--shadow); text-align: center;">
        <h2 style="color: var(--secondary-color); margin-bottom: 1rem;">Event Management</h2>
        <p style="margin-bottom: 1.5rem; color: var(--text-color);">Manage all events in the system. Changes will be immediately visible to all users.</p>
        <button class="btn btn-primary" id="goToEventsBtn" style="padding: 0.8rem 2rem; font-size: 1.1rem;">
          Go to Event Manager
        </button>
      </div>
    </div>
  `;

  // Common Helpers
  const escapeHtml = (str) => {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const updateTimestamp = (elementId) => {
    const el = document.getElementById(elementId);
    if(el) el.textContent = new Date().toLocaleString();
  };

  // User management 
  let allUsers = [];
  let filteredUsers = [];
  let userPage = 1;
  const userPageSize = 5;

  async function initUserParams() {
    try {
      allUsers = await getUsers();
      applyUserFilter();
    } catch (error) {
      document.getElementById('usersTbody').innerHTML = 
        `<tr><td colspan="3" class="text-error">Error loading users: ${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function applyUserFilter() {
    const term = document.getElementById('userSearchInput').value.trim().toLowerCase();
    filteredUsers = allUsers.filter(u => u.username.toLowerCase().includes(term));
    userPage = 1;
    renderUserTable();
  }

  function renderUserTable() {
    const tbody = document.getElementById('usersTbody');
    const totalPages = Math.ceil(filteredUsers.length / userPageSize) || 1;
    
    if (userPage > totalPages) userPage = totalPages;
    if (userPage < 1) userPage = 1;

    const start = (userPage - 1) * userPageSize;
    const pageItems = filteredUsers.slice(start, start + userPageSize);

    updateTimestamp('usersLastUpdated');

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-color); opacity:0.6;">No users found.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(user => {
        // Handle both _id (Mongo) and id (if any)
        const userId = user._id || user.id;
        return `
        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-color);">
          <td style="padding: 1rem;">
            <div style="font-weight: bold; color: var(--text-color);">${escapeHtml(user.username)}</div>
          </td>
          <td style="padding: 1rem;">
            <span style="text-transform: capitalize;">${escapeHtml(user.role)}</span>
          </td>
          <td style="padding: 1rem;">
            <button class="btn btn-small js-user-edit" data-id="${userId}"
              style="color:#0d6efd; background:#e3f2fd; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-weight:500; font-size:0.85rem;">Edit</button>
            <button class="btn btn-small js-user-del" data-id="${userId}"
              style="color:#c62828; background:#ffebee; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-weight:500; margin-left:8px; font-size:0.85rem;">Delete</button>
          </td>
        </tr>
      `}).join('');

      // Attach handlers
      tbody.querySelectorAll('.js-user-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const userId = btn.dataset.id;
          const user = allUsers.find(u => (u._id || u.id) === userId);
          if (user) showUserModal(user);
        });
      });

      tbody.querySelectorAll('.js-user-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete this user?')) {
            try {
              await deleteUser(btn.dataset.id);
              await initUserParams(); // Reload
            } catch (err) {
              alert(err.message);
            }
          }
        });
      });
    }

    // Pagination UI
    document.getElementById('userPageInfo').textContent = `Page ${userPage} of ${totalPages}`;
    document.getElementById('prevUserBtn').disabled = userPage <= 1;
    document.getElementById('nextUserBtn').disabled = userPage >= totalPages;
  }

  // User Event Listeners
  document.getElementById('addUserBtn').addEventListener('click', () => showUserModal());
  document.getElementById('userSearchInput').addEventListener('input', applyUserFilter);
  document.getElementById('prevUserBtn').addEventListener('click', () => { if(userPage > 1) { userPage--; renderUserTable(); } });
  document.getElementById('nextUserBtn').addEventListener('click', () => { if(userPage < Math.ceil(filteredUsers.length / userPageSize)) { userPage++; renderUserTable(); } });
  
  // Event Manager Navigation
  document.getElementById('goToEventsBtn').addEventListener('click', () => {
    window.location.hash = '#/events';
  });

  // Initialize Users
  initUserParams();

  // Modal
  function showUserModal(user = null) {
    const isEdit = !!user;
    const userId = user ? (user._id || user.id) : null;

    const modalHtml = `
      <div id="userModal" class="modal show">
        <div class="modal-content">
          <span class="close" id="closeUserModal">&times;</span>
          <h2>${isEdit ? 'Edit User' : 'Create User'}</h2>
          <form id="userForm">
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="formUsername" value="${isEdit ? escapeHtml(user.username) : ''}" required />
            </div>
            <div class="form-group">
              <label>Password ${isEdit ? '(leave blank to keep current)' : ''}</label>
              <input type="password" id="formPassword" ${isEdit ? '' : 'required'} />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select id="formRole">
                <option value="user" ${!isEdit || user.role === 'user' ? 'selected' : ''}>User</option>
                <option value="admin" ${isEdit && user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
          </form>
        </div>
      </div>
    `;
    renderModal(modalHtml, 'userModal', 'closeUserModal', async () => {
      const username = document.getElementById('formUsername').value.trim();
      const password = document.getElementById('formPassword').value;
      const role = document.getElementById('formRole').value;
      const userData = { username, role };
      if (password) userData.password = password;

      try {
        if (isEdit) await updateUser(userId, userData);
        else await createUser(userData);
        initUserParams();
        return true; // Success
      } catch (err) {
        alert(`Error: ${err.message}`);
        return false;
      }
    }, 'userForm');
  }

  function renderModal(html, modalId, closeBtnId, onSubmit, formId) {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = html;
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => (modalContainer.innerHTML = ''), 200);
    };

    closeBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    document.getElementById(formId).addEventListener('submit', async (e) => {
      e.preventDefault();
      const success = await onSubmit();
      if (success) closeModal();
    });
  }
}
