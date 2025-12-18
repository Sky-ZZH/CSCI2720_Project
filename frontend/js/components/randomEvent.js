import { state } from '../state.js';
import { getLocations, getLocationDetails } from '../api.js';
import { calculateDistance } from './distance.js';

export async function renderRandomEvent() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container" style="max-width: 900px; margin: 2rem auto;">
      <div style="margin-bottom: 1.5rem; text-align: center;">
        <h1 style="font-size: 2.4rem; margin-bottom: 0.5rem;">A random event picker</h1>
      </div>

      <div style="background:white; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.08); overflow:hidden; border:1px solid #e0e0e0;">
        <div id="luckyBtn" style="
          background:#1d4ed8; color:white; padding:1rem; text-align:center;
          font-weight:700; cursor:pointer; user-select:none;">
          Get Random Event
        </div>

        <div style="padding: 1.5rem; min-height: 220px; position: relative;">
          <div id="loading" style="display:none; text-align:center; padding:2rem; color:#666;">
            Loading...
          </div>

          <div id="initial" style="text-align:center; color:#666; padding:2rem;">
            Click the blue bar to get an event.
          </div>

          <div id="details" style="display:none;">
            <h2 id="evtTitle" style="margin:0 0 1rem 0; font-size:1.3rem; letter-spacing:0.5px; color:#333;"></h2>

            <div style="line-height:1.8; color:#333; font-size:0.95rem;">
              <div><strong>Date:</strong> <span id="evtDate"></span></div>
              <div><strong>Price:</strong> <span id="evtPrice"></span></div>
              <div><strong>Presenter:</strong> <span id="evtPresenter"></span></div>
              <div><strong>Description:</strong> <span id="evtDesc"></span></div>
              <div style="margin-top:1rem;">
                <strong style="color:#1d4ed8;">Venue:</strong>
                <a id="evtVenue" href="#" style="color:#1d4ed8; text-decoration:none; font-weight:600;"></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="text-align:right; margin-top:0.5rem;">
        <button id="toggleFilters" style="background:none; border:none; color:#666; text-decoration:underline; cursor:pointer; font-size:0.85rem;">
          Filter Options
        </button>
      </div>

      <div id="filterBox" style="display:none; margin-top:0.8rem; padding:1rem; background:#f9f9f9; border-radius:6px; border:1px solid #eee;">
        <label style="font-size:0.9rem;">Max Distance (km): </label>
        <input type="number" id="maxDistInput" value="9999" style="padding:0.3rem; width:100px;">
      </div>
    </div>
  `;

  document.getElementById('toggleFilters').addEventListener('click', () => {
    const box = document.getElementById('filterBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  });

  const luckyBtn = document.getElementById('luckyBtn');
  const loading = document.getElementById('loading');
  const initial = document.getElementById('initial');
  const details = document.getElementById('details');

  const setLoading = (on) => {
    loading.style.display = on ? 'block' : 'none';
    initial.style.display = on ? 'none' : initial.style.display;
    details.style.display = on ? 'none' : details.style.display;
  };

  luckyBtn.addEventListener('click', async () => {
    const maxDist = parseFloat(document.getElementById('maxDistInput').value) || 9999;

    setLoading(true);

    try {
      // 1) get all locations (list API may have events as IDs)
      const locations = await getLocations();

      // 2) filter by distance first (use list lat/lng)
      const nearLocations = locations.filter(loc => {
        if (!state.userLocation) return true; // if no user location, don't filter
        const lat = loc.latitude ?? loc.lat;
        const lng = loc.longitude ?? loc.lng;
        if (lat == null || lng == null) return false;

        const dist = calculateDistance(state.userLocation.latitude, state.userLocation.longitude, lat, lng);
        return dist != null && dist <= maxDist;
      });

      if (nearLocations.length === 0) throw new Error('No venues match your distance filter.');

      // 3) pick random location, then call detail to get populated events
      const randomLoc = nearLocations[Math.floor(Math.random() * nearLocations.length)];
      const venueId = randomLoc.id || randomLoc._id;

      const detailRes = await getLocationDetails(venueId);
      const locDetail = Array.isArray(detailRes) ? detailRes[0] : detailRes;

      if (!locDetail || !Array.isArray(locDetail.events) || locDetail.events.length === 0) {
        throw new Error('This venue has no events.');
      }

      // 4) random event (now it is OBJECTS)
      const eventObj = locDetail.events[Math.floor(Math.random() * locDetail.events.length)];

      // Render
      document.getElementById('evtTitle').textContent = (eventObj.title || 'Untitled Event').toUpperCase();
      document.getElementById('evtDate').textContent = eventObj.dateTime || 'TBA';
      document.getElementById('evtPrice').textContent = eventObj.price || 'Free / Not stated';
      document.getElementById('evtPresenter').textContent = eventObj.presenter || 'N/A';
      document.getElementById('evtDesc').textContent = eventObj.description || 'N/A';

      const venueLink = document.getElementById('evtVenue');
      venueLink.textContent = locDetail.name || randomLoc.name || 'Venue';
      venueLink.href = `#/location/${venueId}`;

      initial.style.display = 'none';
      details.style.display = 'block';
    } catch (e) {
      initial.style.display = 'block';
      details.style.display = 'none';
      initial.innerHTML = `<div style="color:#b91c1c;">${e.message}</div>`;
    } finally {
      setLoading(false);
    }
  });
}
