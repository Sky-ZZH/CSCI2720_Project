import {
  getLocations,
  getLocationDetails,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent
} from '../api.js';
import { state } from '../state.js';

export async function renderEvents() {
  const isAdmin = (state.role || '').toLowerCase() === 'admin';

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container" style="max-width: 1400px; margin: 2rem auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap:1rem; flex-wrap:wrap;">
        <div style="display:flex; gap:10px; flex:1; min-width:320px;">
          ${isAdmin ? `<button class="btn btn-primary" id="newEventBtn">New Event</button>` : ''}
          <input id="eventSearch" type="text" placeholder="Search events by title..."
            style="flex:1; padding:0.6rem; border:1px solid var(--border-color); border-radius:4px;">
        </div>
        <div style="color:var(--text-color); opacity:0.7; font-size:0.9rem;">
          Last Updated on ${new Date().toLocaleString()}
        </div>
      </div>

      <div style="background:white; border-radius:8px; overflow:hidden; border:1px solid #e0e0e0; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; min-width: 980px;">
            <thead>
              <tr style="background:#f8f9fa; border-bottom:2px solid #dee2e6;">
                <th style="padding:1rem; text-align:left; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Event Title</th>
                <th style="padding:1rem; text-align:left; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Description</th>
                <th style="padding:1rem; text-align:left; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Venue</th>
                <th style="padding:1rem; text-align:left; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Price</th>
                <th style="padding:1rem; text-align:left; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Presenter(s)</th>
                <th style="padding:1rem; text-align:left; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Date & Time</th>
                ${isAdmin ? `<th style="padding:1rem; text-align:center; color:#6c757d; font-weight:600; font-size:0.85rem; text-transform:uppercase;">Actions</th>` : ''}
              </tr>
            </thead>
            <tbody id="eventsTbody">
              <tr>
                <td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:2rem; color:#999;">Loading events...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:flex; justify-content:center; align-items:center; margin-top:2rem; gap:1rem;">
        <button class="btn btn-secondary" id="prevBtn" disabled>Previous</button>
        <span id="pageInfo" style="color:var(--text-color);">Page 1 of 1</span>
        <button class="btn btn-secondary" id="nextBtn" disabled>Next</button>
      </div>
    </div>

    ${isAdmin ? `
    <!-- Admin Modal -->
    <div id="eventModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; overflow:auto;">
      <div style="background:#fff; max-width:680px; margin:48px auto; border-radius:10px; padding:1.5rem; position:relative;">
        <button id="closeModal" style="position:absolute; top:12px; right:12px; background:none; border:none; font-size:1.6rem; cursor:pointer; color:#999;">&times;</button>
        <h2 id="modalTitle" style="margin:0 0 1rem 0;">Edit Event</h2>

        <form id="eventForm" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <input type="hidden" id="eventId">

          <div style="grid-column:1 / -1;">
            <label style="display:block; font-weight:600; margin-bottom:6px;">Title *</label>
            <input id="fTitle" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
          </div>

          <div style="grid-column:1 / -1;">
            <label style="display:block; font-weight:600; margin-bottom:6px;">Description</label>
            <textarea id="fDesc" rows="3" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></textarea>
          </div>

          <div style="grid-column:1 / -1;">
            <label style="display:block; font-weight:600; margin-bottom:6px;">Venue *</label>
            <select id="fVenue" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;"></select>
          </div>

          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px;">Price</label>
            <input id="fPrice" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;" placeholder="e.g. Free, $100">
          </div>

          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px;">Presenter</label>
            <input id="fPresenter" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
          </div>

          <div style="grid-column:1 / -1;">
            <label style="display:block; font-weight:600; margin-bottom:6px;">Date & Time</label>
            <input id="fDateTime" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
          </div>

          <div style="grid-column:1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">
            <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
    ` : ''}
  `;

  const tbody = document.getElementById('eventsTbody');
  const searchInput = document.getElementById('eventSearch');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInfo = document.getElementById('pageInfo');

  let locations = [];
  let allEvents = [];
  let filtered = [];
  let currentPage = 1;
  const pageSize = 10;

  const safeText = (v, fallback = 'N/A') => {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length ? s : fallback;
  };

  const truncate = (s, n = 60) => {
    const t = safeText(s, 'N/A');
    return t.length > n ? t.slice(0, n) + '...' : t;
  };

  const totalPages = () => Math.max(1, Math.ceil(filtered.length / pageSize));

  function findVenueNameById(venueObjectIdOrIdString) {
    const hit = locations.find(l => (l._id && l._id === venueObjectIdOrIdString) || (l.id && l.id === venueObjectIdOrIdString));
    return hit ? hit.name : 'Unknown venue';
  }

  function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:2rem; color:#999;">No events found.</td>
        </tr>
      `;
    } else {
      tbody.innerHTML = pageItems.map(evt => `
        <tr style="border-bottom:1px solid #e9ecef;">
          <td style="padding:1rem; vertical-align:top; width:260px;">
            <div style="font-weight:500; color:#333; line-height:1.4;">${safeText(evt.title, 'Untitled Event')}</div>
          </td>
          <td style="padding:1rem; vertical-align:top; color:#666; font-size:0.9rem; width:240px;">
            ${evt.description && evt.description !== 'No description available.'
              ? truncate(evt.description, 60)
              : '<span style="opacity:0.55;">N/A</span>'}
          </td>
          <td style="padding:1rem; vertical-align:top; width:220px;">
            <a href="#/location/${evt.venueId}" style="color:var(--primary-color); text-decoration:none; font-weight:500;">
              ${safeText(evt.venueName)}
            </a>
          </td>
          <td style="padding:1rem; vertical-align:top; color:#666; font-size:0.9rem; width:120px;">${safeText(evt.price, 'Free')}</td>
          <td style="padding:1rem; vertical-align:top; width:240px;">
            <div style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-size:0.85rem; display:inline-block;">
              ${safeText(evt.presenter, 'N/A')}
            </div>
          </td>
          <td style="padding:1rem; vertical-align:top; color:#666; font-size:0.9rem; width:220px;">${safeText(evt.dateTime, 'TBA')}</td>
          ${isAdmin ? `
          <td style="padding:1rem; vertical-align:top; text-align:center; width:140px;">
            <button class="btn btn-small js-edit" data-id="${evt._id}"
              style="color:#0d6efd; background:none; border:none; cursor:pointer; text-decoration:underline;">Update</button>
            <button class="btn btn-small js-del" data-id="${evt._id}"
              style="color:#dc3545; background:none; border:none; cursor:pointer; text-decoration:underline; margin-left:8px;">Delete</button>
          </td>` : ''}
        </tr>
      `).join('');

      if (isAdmin) {
        tbody.querySelectorAll('.js-edit').forEach(btn => {
          btn.addEventListener('click', () => openModal(btn.dataset.id));
        });
        tbody.querySelectorAll('.js-del').forEach(btn => {
          btn.addEventListener('click', () => handleDelete(btn.dataset.id));
        });
      }
    }

    pageInfo.textContent = `Page ${currentPage} of ${totalPages()}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages();
  }

  function applySearch() {
    const term = (searchInput.value || '').trim().toLowerCase();
    filtered = !term ? [...allEvents] : allEvents.filter(e => safeText(e.title, '').toLowerCase().includes(term));
    currentPage = 1;
    renderTable();
  }

  // Load data: list -> each detail (because list may have events as IDs)
  try {
    locations = await getLocations();

    const details = await Promise.all(
      locations.map(async (loc) => {
        const venueId = loc.id || loc._id;
        try {
          const d = await getLocationDetails(venueId);
          return Array.isArray(d) ? d[0] : d;
        } catch {
          return null;
        }
      })
    );

    allEvents = [];
    details.filter(Boolean).forEach(loc => {
      const venueId = loc.id || loc._id;
      const venueName = loc.name;

      if (Array.isArray(loc.events)) {
        loc.events.forEach(evt => {
          if (evt && typeof evt === 'object') {
            allEvents.push({
              ...evt,
              venueId,
              venueName
            });
          }
        });
      }
    });

    // stable sorting
    allEvents.sort((a, b) => safeText(a.title, '').localeCompare(safeText(b.title, '')));
    filtered = [...allEvents];
    renderTable();
  } catch (e) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:2rem; color:red;">
          Error loading events: ${safeText(e.message, 'Unknown error')}
        </td>
      </tr>
    `;
    return;
  }

  // Pagination + Search
  searchInput.addEventListener('input', applySearch);
  prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  nextBtn.addEventListener('click', () => { if (currentPage < totalPages()) { currentPage++; renderTable(); } });

  // Admin modal (CRUD)
  if (isAdmin) {
    const modal = document.getElementById('eventModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('eventForm');

    const fId = document.getElementById('eventId');
    const fTitle = document.getElementById('fTitle');
    const fDesc = document.getElementById('fDesc');
    const fVenue = document.getElementById('fVenue');
    const fPrice = document.getElementById('fPrice');
    const fPresenter = document.getElementById('fPresenter');
    const fDateTime = document.getElementById('fDateTime');
    const modalTitle = document.getElementById('modalTitle');

    function fillVenueOptions(selected) {
      const opts = locations.map(l => {
        // 注意：Event.venue 係 ObjectId（Mongo _id），所以 value 用 _id 最穩
        const value = l._id || '';
        const name = l.name || value;
        return `<option value="${value}" ${value === selected ? 'selected' : ''}>${name}</option>`;
      }).join('');
      fVenue.innerHTML = `<option value="" disabled ${selected ? '' : 'selected'}>Select a venue</option>` + opts;
    }

    function showModal() { modal.style.display = 'block'; }
    function hideModal() { modal.style.display = 'none'; }

    function openModal(eventIdOrNull) {
      if (!eventIdOrNull) {
        modalTitle.textContent = 'Create Event';
        fId.value = '';
        fTitle.value = '';
        fDesc.value = '';
        fPrice.value = '';
        fPresenter.value = '';
        fDateTime.value = '';
        fillVenueOptions('');
        showModal();
        return;
      }

      const evt = allEvents.find(e => e._id === eventIdOrNull);
      if (!evt) return;

      modalTitle.textContent = 'Update Event';
      fId.value = evt._id || '';
      fTitle.value = evt.title || '';
      fDesc.value = evt.description || '';
      fPrice.value = evt.price || '';
      fPresenter.value = evt.presenter || '';
      fDateTime.value = evt.dateTime || '';

      // evt.venue 係 ObjectId（你後端回傳見到 venue:"6942..."）
      fillVenueOptions(evt.venue || '');
      showModal();
    }

    async function handleDelete(eventId) {
      if (!confirm('Are you sure you want to delete this event?')) return;

      try {
        await apiDeleteEvent(eventId);
        allEvents = allEvents.filter(e => e._id !== eventId);
        applySearch();
        alert('Event deleted');
      } catch (e) {
        alert(`Delete failed: ${safeText(e.message, 'Unknown error')}`);
      }
    }

    // Expose for buttons created in table
    window.__openEventModal = openModal; // optional

    document.getElementById('newEventBtn')?.addEventListener('click', () => openModal(null));
    closeModalBtn.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        title: fTitle.value.trim(),
        description: fDesc.value.trim(),
        venue: fVenue.value,           // must be Location ObjectId
        dateTime: fDateTime.value.trim(),
        presenter: fPresenter.value.trim(),
        price: fPrice.value.trim()
      };

      try {
        if (fId.value) {
          await apiUpdateEvent(fId.value, payload);       // PUT /admin/events/:id [file:248]
          // update local list (quick refresh without reload)
          const idx = allEvents.findIndex(x => x._id === fId.value);
          if (idx >= 0) {
            const venueName = findVenueNameById(payload.venue);
            allEvents[idx] = { ...allEvents[idx], ...payload, venueName };
          }
        } else {
          const created = await apiCreateEvent(payload);  // POST /admin/events [file:248]
          const venueName = findVenueNameById(payload.venue);
          allEvents.unshift({ ...created, ...payload, venueName, venueId: (locations.find(l => l._id === payload.venue)?.id || payload.venue) });
        }

        hideModal();
        applySearch();
        alert('Saved');
      } catch (err) {
        alert(`Save failed: ${safeText(err.message, 'Unknown error')}`);
      }
    });

    // hook delete from table buttons
    window.__adminDeleteEvent = handleDelete; // optional

    // Rebind edit/delete handlers with direct functions used above
    tbody.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.classList.contains('js-edit')) openModal(t.dataset.id);
      if (t.classList.contains('js-del')) handleDelete(t.dataset.id);
    });
  }
}
