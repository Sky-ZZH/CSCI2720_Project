// js/components/events.js
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
    <div style="max-width: 1400px; margin: 2rem auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap:1rem; flex-wrap:wrap;">
        <div style="display:flex; gap:10px; flex:1; min-width:320px;">
          ${isAdmin ? `<button class="btn btn-primary" id="newEventBtn">New Event</button>` : ''}
          <input id="eventSearch" type="text" placeholder="Search events by title..."
            style="flex:1; padding:0.6rem; border:1px solid var(--border-color); border-radius:4px; background:var(--card-bg); color:var(--text-color);">
        </div>
        <div style="color:var(--text-color); opacity:0.7; font-size:0.9rem;">
          Last Updated on ${new Date().toLocaleString()}
        </div>
      </div>

      <div class="events-table-container" style="background:var(--card-bg); border-radius:8px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow);">
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; min-width: 980px;">
            <thead>
              <tr class="events-table-header-row" style="border-bottom:2px solid var(--border-color);">
                <th style="padding:1rem; text-align:left; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8;">Event Title</th>
                <th style="padding:1rem; text-align:left; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8;">Description</th>
                <th style="padding:1rem; text-align:left; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8;">Venue</th>
                <th style="padding:1rem; text-align:left; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8;">Price</th>
                <th style="padding:1rem; text-align:left; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8;">Presenter(s)</th>
                <th style="padding:1rem; text-align:left; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8;">Date & Time</th>
                ${isAdmin ? `<th style="padding:1rem; text-align:center; color:var(--text-color); font-weight:600; font-size:0.85rem; text-transform:uppercase; opacity:0.8; width: 200px;">Actions</th>` : ''}
              </tr>
            </thead>
            <tbody id="eventsTbody">
              <tr>
                <td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:2rem; color:var(--text-color); opacity:0.7;">Loading events...</td>
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
    <div id="eventModal" class="events-modal">
      <div style="background:var(--card-bg); color:var(--text-color); max-width:680px; margin:48px auto; border-radius:10px; padding:1.5rem; position:relative; border:1px solid var(--border-color);">
        <button id="closeModal" style="position:absolute; top:12px; right:12px; background:none; border:none; font-size:1.6rem; cursor:pointer; color:var(--text-color); opacity:0.7;">&times;</button>
        <h2 id="modalTitle" style="margin:0 0 1rem 0;">Edit Event</h2>

        <form id="eventForm" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <input type="hidden" id="eventId">
          <div style="grid-column:1 / -1;"><label style="display:block; font-weight:600; margin-bottom:6px;">Title *</label><input id="fTitle" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-color);"></div>
          <div style="grid-column:1 / -1;"><label style="display:block; font-weight:600; margin-bottom:6px;">Description</label><textarea id="fDesc" rows="3" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-color);"></textarea></div>
          <div style="grid-column:1 / -1;"><label style="display:block; font-weight:600; margin-bottom:6px;">Venue *</label><select id="fVenue" required style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-color);"></select></div>
          <div><label style="display:block; font-weight:600; margin-bottom:6px;">Price</label><input id="fPrice" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-color);" placeholder="e.g. Free, $100"></div>
          <div><label style="display:block; font-weight:600; margin-bottom:6px;">Presenter</label><input id="fPresenter" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-color);"></div>
          <div style="grid-column:1 / -1;"><label style="display:block; font-weight:600; margin-bottom:6px;">Date &amp; Time</label><input id="fDateTime" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-color);"></div>
          <div style="grid-column:1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:6px;"><button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
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

  function venueNameByMongoId(mongoId) {
    const hit = locations.find(l => l._id === mongoId);
    return hit ? hit.name : 'Unknown venue';
  }

  function venuePublicIdByMongoId(mongoId) {
    const hit = locations.find(l => l._id === mongoId);
    return hit ? (hit.id || hit._id) : mongoId;
  }

  function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:2rem; color:var(--text-color); opacity:0.7;">No events found.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(evt => {
        const desc = (!evt.description || evt.description.trim() === '' || evt.description === 'No description available.') ? 'N/A' : truncate(evt.description, 60);
        return `
          <tr class="events-table-row" style="border-bottom:1px solid var(--border-color);">
            <td style="padding:1rem; vertical-align:top; width:260px;"><div style="font-weight:600; color:var(--text-color); line-height:1.4;">${safeText(evt.title, 'Untitled Event')}</div></td>
            <td style="padding:1rem; vertical-align:top; color:var(--text-color); opacity:0.8; font-size:0.9rem; width:240px;">${desc}</td>
            <td style="padding:1rem; vertical-align:top; width:220px;"><a href="#/location/${evt.venueId}" style="color:var(--secondary-color); text-decoration:none; font-weight:600;">${safeText(evt.venueName)}</a></td>
            <td style="padding:1rem; vertical-align:top; color:var(--text-color); opacity:0.8; font-size:0.9rem; width:120px;">${safeText(evt.price, 'Free')}</td>
            <td style="padding:1rem; vertical-align:top; width:240px;"><div class="presenter-badge" style="display:inline-block; padding:4px 8px; border-radius:4px; font-size:0.85rem;">${safeText(evt.presenter, 'N/A')}</div></td>
            <td style="padding:1rem; vertical-align:top; color:var(--text-color); opacity:0.8; font-size:0.9rem; width:220px;">${safeText(evt.dateTime, 'TBA')}</td>
            ${isAdmin ? `
            <td style="padding:1rem; vertical-align:top; text-align:center;">
              <div style="display:flex; gap:8px; justify-content:center;">
                <button class="btn-action btn-update js-edit" data-id="${evt._id}">Update</button>
                <button class="btn-action btn-delete js-del" data-id="${evt._id}">Delete</button>
              </div>
            </td>` : ''}
          </tr>`;
      }).join('');
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

  try {
    locations = await getLocations();
    const details = await Promise.all(locations.map(async (loc) => (Array.isArray(await getLocationDetails(loc.id || loc._id)) ? (await getLocationDetails(loc.id || loc._id))[0] : await getLocationDetails(loc.id || loc._id)) || null));
    allEvents = [];
    details.filter(Boolean).forEach(loc => { if (Array.isArray(loc.events)) { loc.events.forEach(evt => { if (evt && typeof evt === 'object') { allEvents.push({ ...evt, venueId: loc.id || loc._id, venueName: loc.name }); } }); } });
    allEvents.sort((a, b) => safeText(a.title, '').localeCompare(safeText(b.title, '')));
    filtered = [...allEvents];
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:2rem; color:var(--accent-color);">Error loading events: ${safeText(e.message, 'Unknown error')}</td></tr>`; return;
  }

  searchInput.addEventListener('input', applySearch);
  prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  nextBtn.addEventListener('click', () => { if (currentPage < totalPages()) { currentPage++; renderTable(); } });

  if (isAdmin) {
    const modal = document.getElementById('eventModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const newEventBtn = document.getElementById('newEventBtn');
    const form = document.getElementById('eventForm');
    const modalTitle = document.getElementById('modalTitle'), fId = document.getElementById('eventId'), fTitle = document.getElementById('fTitle'), fDesc = document.getElementById('fDesc'), fVenue = document.getElementById('fVenue'), fPrice = document.getElementById('fPrice'), fPresenter = document.getElementById('fPresenter'), fDateTime = document.getElementById('fDateTime');
    function showModal() { modal.style.display = 'block'; }
    function hideModal() { modal.style.display = 'none'; }
    function fillVenueOptions(selectedMongoId) { fVenue.innerHTML = `<option value="" disabled ${selectedMongoId ? '' : 'selected'}>Select a venue</option>` + locations.filter(l => l._id).map(l => `<option value="${l._id}" ${l._id === selectedMongoId ? 'selected' : ''}>${l.name}</option>`).join(''); }
    function openCreate() { modalTitle.textContent = 'Create Event'; fId.value = ''; form.reset(); fillVenueOptions(''); showModal(); }
    function openEdit(eventId) { const evt = allEvents.find(e => e._id === eventId); if (!evt) return; modalTitle.textContent = 'Update Event'; fId.value = evt._id; fTitle.value = evt.title || ''; fDesc.value = evt.description || ''; fPrice.value = evt.price || ''; fPresenter.value = evt.presenter || ''; fDateTime.value = evt.dateTime || ''; fillVenueOptions(evt.venue || ''); showModal(); }
    async function handleDelete(eventId) { if (!confirm('Are you sure?')) return; try { await apiDeleteEvent(eventId); allEvents = allEvents.filter(e => e._id !== eventId); applySearch(); alert('Event deleted'); } catch (e) { alert(`Delete failed: ${safeText(e.message)}`); } }
    newEventBtn?.addEventListener('click', openCreate);
    closeModalBtn?.addEventListener('click', hideModal);
    cancelBtn?.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
    tbody.addEventListener('click', (e) => { const el = e.target; if (!(el instanceof HTMLElement)) return; if (el.classList.contains('js-edit')) openEdit(el.dataset.id); if (el.classList.contains('js-del')) handleDelete(el.dataset.id); });
    form.addEventListener('submit', async (e) => { e.preventDefault(); const payload = { title: fTitle.value.trim(), description: fDesc.value.trim(), venue: fVenue.value, dateTime: fDateTime.value.trim(), presenter: fPresenter.value.trim(), price: fPrice.value.trim() }; try { if (fId.value) { await apiUpdateEvent(fId.value, payload); const idx = allEvents.findIndex(x => x._id === fId.value); if (idx >= 0) { allEvents[idx] = { ...allEvents[idx], ...payload, venueName: venueNameByMongoId(payload.venue), venueId: venuePublicIdByMongoId(payload.venue) }; } } else { const created = await apiCreateEvent(payload); allEvents.unshift({ ...created, ...payload, venueName: venueNameByMongoId(payload.venue), venueId: venuePublicIdByMongoId(payload.venue) }); } hideModal(); applySearch(); alert('Saved'); } catch (err) { alert(`Save failed: ${safeText(err.message)}`); } });
  }
}
