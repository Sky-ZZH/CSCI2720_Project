import { getUsers, createUser, updateUser, deleteUser } from '../api.js';

const EVENTS_STORE_KEY = 'mockAdminEvents';

export async function renderAdmin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container">
      <h1>Admin Dashboard</h1>

      <div class="admin-container">
        <!-- User Management -->
        <div class="admin-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h2>User Management</h2>
            <button class="btn btn-primary btn-small" id="addUserBtn">Add User</button>
          </div>
          <div id="usersList" class="admin-list">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Event Management -->
        <div class="admin-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h2>Event Management</h2>
            <button class="btn btn-primary btn-small" id="addEventBtn">New Event</button>
          </div>

          <div class="form-group" style="margin-bottom:0.75rem;">
            <label>Search events by title</label>
            <input type="text" id="eventSearchInput" placeholder="Search events by title..." />
          </div>

          <div class="text-muted" id="eventsLastUpdated" style="margin-bottom:0.75rem;"></div>

          <div style="overflow-x:auto;">
            <table class="locations-table" id="eventsTable">
              <thead>
                <tr>
                  <th>EVENT TITLE</th>
                  <th>DESCRIPTION</th>
                  <th>VENUE</th>
                  <th>PRICE</th>
                  <th>PRESENTER(S)</th>
                  <th>DATE & TIME</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="eventsTbody">
                <tr><td colspan="7" class="text-center text-muted">No events yet. Click "New Event".</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // ===== User Manager (existing backend) =====
  loadUsers();
  document.getElementById('addUserBtn').addEventListener('click', () => showUserModal());

  async function loadUsers() {
    try {
      const users = await getUsers();
      const list = document.getElementById('usersList');

      if (!users || users.length === 0) {
        list.innerHTML = `<p class="text-muted">No users found.</p>`;
        return;
      }

      list.innerHTML = users.map(user => `
        <div class="admin-item">
          <div class="admin-item-info">
            <strong>${escapeHtml(user.username)}</strong>
            <span class="badge">${escapeHtml(user.role)}</span>
          </div>
          <div class="admin-item-actions">
            <button class="btn btn-secondary btn-small" data-user-edit="${user.id}" data-user-name="${escapeHtml(user.username)}" data-user-role="${escapeHtml(user.role)}">Edit</button>
            <button class="btn btn-danger btn-small" data-user-del="${user.id}">Delete</button>
          </div>
        </div>
      `).join('');

      list.onclick = async (e) => {
        const editBtn = e.target.closest('[data-user-edit]');
        const delBtn = e.target.closest('[data-user-del]');

        if (editBtn) {
          const id = editBtn.getAttribute('data-user-edit');
          const username = editBtn.getAttribute('data-user-name');
          const role = editBtn.getAttribute('data-user-role');
          showUserModal({ id, username, role });
        }

        if (delBtn) {
          const id = delBtn.getAttribute('data-user-del');
          if (confirm('Are you sure you want to delete this user?')) {
            try {
              await deleteUser(id);
              loadUsers();
            } catch (err) {
              alert(`Error deleting user: ${err.message}`);
            }
          }
        }
      };
    } catch (error) {
      document.getElementById('usersList').innerHTML =
        `<div class="text-error">Error loading users: ${escapeHtml(error.message)}</div>`;
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

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHtml;

    const modal = document.getElementById('userModal');
    const closeBtn = document.getElementById('closeUserModal');

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => (modalContainer.innerHTML = ''), 200);
    };

    closeBtn.onclick = closeModal;
    window.onclick = (event) => { if (event.target === modal) closeModal(); };

    document.getElementById('userForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('formUsername').value.trim();
      const password = document.getElementById('formPassword').value;
      const role = document.getElementById('formRole').value;

      const userData = { username, role };
      if (password) userData.password = password;

      try {
        if (isEdit) await updateUser(user.id, userData);
        else await createUser(userData);

        closeModal();
        loadUsers();
      } catch (err) {
        alert(`Error saving user: ${err.message}`);
      }
    });
  }

  // ===== Event Manager (frontend-only via localStorage) =====
  let events = loadLocalEvents();
  renderEventsTable();

  document.getElementById('addEventBtn').addEventListener('click', () => showEventModal());
  document.getElementById('eventSearchInput').addEventListener('input', () => renderEventsTable());

  document.getElementById('eventsTbody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-evt-edit]');
    const delBtn = e.target.closest('[data-evt-del]');

    if (editBtn) {
      const id = editBtn.getAttribute('data-evt-edit');
      const ev = events.find(x => x.id === id);
      if (ev) showEventModal(ev);
    }

    if (delBtn) {
      const id = delBtn.getAttribute('data-evt-del');
      if (confirm('Delete this event?')) {
        events = events.filter(x => x.id !== id);
        saveLocalEvents(events);
        renderEventsTable();
      }
    }
  });

  function renderEventsTable() {
    const term = document.getElementById('eventSearchInput').value.trim().toLowerCase();
    const filtered = events.filter(ev => (ev.title ?? '').toLowerCase().includes(term));

    document.getElementById('eventsLastUpdated').textContent =
      `Last Updated on ${new Date().toLocaleString()}`;

    const tbody = document.getElementById('eventsTbody');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No events found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(ev => `
      <tr>
        <td>${escapeHtml(ev.title)}</td>
        <td>${escapeHtml(ev.description || 'N/A')}</td>
        <td>${escapeHtml(ev.venue || 'N/A')}</td>
        <td>${escapeHtml(ev.price || 'N/A')}</td>
        <td>${escapeHtml(ev.presenter || 'N/A')}</td>
        <td>${escapeHtml(ev.dateTime || 'N/A')}</td>
        <td>
          <button class="btn btn-secondary btn-small" data-evt-edit="${ev.id}">Update</button>
          <button class="btn btn-danger btn-small" data-evt-del="${ev.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function showEventModal(event = null) {
    const isEdit = !!event;

    const modalHtml = `
      <div id="eventModal" class="modal show">
        <div class="modal-content modal-large">
          <span class="close" id="closeEventModal">&times;</span>
          <h2>${isEdit ? 'Update Event' : 'Create Event'}</h2>

          <form id="eventForm">
            <div class="form-group">
              <label>Event Title</label>
              <input type="text" id="evtTitle" value="${isEdit ? escapeHtml(event.title) : ''}" required />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea id="evtDesc" placeholder="N/A">${isEdit ? escapeHtml(event.description || '') : ''}</textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Venue</label>
                <input type="text" id="evtVenue" value="${isEdit ? escapeHtml(event.venue || '') : ''}" placeholder="e.g. Sha Tin Town Hall" />
              </div>

              <div class="form-group">
                <label>Price</label>
                <input type="text" id="evtPrice" value="${isEdit ? escapeHtml(event.price || '') : ''}" placeholder="e.g. $50 / Free" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Presenter(s)</label>
                <input type="text" id="evtPresenter" value="${isEdit ? escapeHtml(event.presenter || '') : ''}" placeholder="Presented by ..." />
              </div>

              <div class="form-group">
                <label>Date & Time</label>
                <input type="text" id="evtDateTime" value="${isEdit ? escapeHtml(event.dateTime || '') : ''}" placeholder="e.g. 1 Dec 2024 (Sun) 7:30pm" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
          </form>
        </div>
      </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHtml;

    const modal = document.getElementById('eventModal');
    const closeBtn = document.getElementById('closeEventModal');

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => (modalContainer.innerHTML = ''), 200);
    };

    closeBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    document.getElementById('eventForm').addEventListener('submit', (e) => {
      e.preventDefault();

      const eventData = {
        id: isEdit ? event.id : cryptoId(),
        title: document.getElementById('evtTitle').value.trim(),
        description: document.getElementById('evtDesc').value.trim(),
        venue: document.getElementById('evtVenue').value.trim(),
        price: document.getElementById('evtPrice').value.trim(),
        presenter: document.getElementById('evtPresenter').value.trim(),
        dateTime: document.getElementById('evtDateTime').value.trim()
      };

      if (isEdit) {
        events = events.map(x => (x.id === event.id ? eventData : x));
      } else {
        events = [eventData, ...events];
      }

      saveLocalEvents(events);
      closeModal();
      renderEventsTable();
    });
  }

  function loadLocalEvents() {
    try {
      const raw = localStorage.getItem(EVENTS_STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLocalEvents(list) {
    localStorage.setItem(EVENTS_STORE_KEY, JSON.stringify(list));
  }

  function cryptoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
