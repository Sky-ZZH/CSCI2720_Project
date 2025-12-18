import { getLocations, getLocationDetails, addComment, toggleFavorite, getFavorites, deleteComment } from '../api.js';
import { state, updateState } from '../state.js';

export async function renderMap() {
    const app = document.getElementById('app');
    
    // CSS for the map layout
    const style = `
        <style>
            .map-container-wrapper {
                display: flex;
                height: calc(100vh - 100px);
                position: relative;
                overflow: hidden;
            }
            .map-sidebar {
                width: 0;
                background: var(--card-bg);
                border-right: 1px solid var(--border-color);
                overflow-y: auto;
                transition: width 0.3s ease;
                display: flex;
                flex-direction: column;
            }
            .map-sidebar.open {
                width: 350px;
                padding: 1.5rem;
                flex-shrink: 0;
            }
            .map-view {
                flex: 1;
                height: 100%;
                z-index: 1;
            }
            .sidebar-header {
                margin-bottom: 1rem;
            }
            .sidebar-content {
                flex: 1;
                overflow-y: auto;
            }
            .comment-bubble {
                background: var(--bg-color);
                padding: 0.8rem;
                border-radius: 8px;
                margin-bottom: 0.8rem;
                border: 1px solid var(--border-color);
            }
            .comment-input-area {
                margin-top: 1rem;
                border-top: 1px solid var(--border-color);
                padding-top: 1rem;
            }
            @media (max-width: 768px) {
                .map-container-wrapper {
                    flex-direction: column-reverse;
                }
                .map-sidebar {
                    width: 100%;
                    height: 0;
                    border-right: none;
                    border-top: 1px solid var(--border-color);
                    transition: height 0.3s ease;
                }
                .map-sidebar.open {
                    width: 100%;
                    height: 50%;
                }
            }
        </style>
    `;

    app.innerHTML = `
        ${style}
        <div class="map-container-wrapper">
            <div id="mapSidebar" class="map-sidebar">
                <!-- Content injected here -->
            </div>
            <div id="fullMap" class="map-view"></div>
        </div>
    `;

    // Icons
    const blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    let map;
    let markers = {}; // Store markers by ID
    let currentSelectedId = null;

    try {
        const [locations, favorites] = await Promise.all([getLocations(), getFavorites()]);
        updateState({ favorites }); // Update favorites in state

        // Initialize Map
        map = L.map('fullMap').setView([22.3193, 114.1694], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ' OpenStreetMap contributors'
        }).addTo(map);

        // Add Markers
        locations.forEach(loc => {
            if (loc.latitude && loc.longitude) {
                const marker = L.marker([loc.latitude, loc.longitude], { icon: blueIcon })
                    .addTo(map)
                    .on('click', () => selectLocation(loc.id || loc._id));
                
                markers[loc.id || loc._id] = marker;
            }
        });

    } catch (error) {
        console.error(error);
        app.innerHTML += `<div class="text-error" style="position:absolute; top:10px; left:10px; z-index:1000; background:white; padding:10px;">Error loading map data: ${error.message}</div>`;
    }

    async function selectLocation(id) {
        // Reset previous marker
        if (currentSelectedId && markers[currentSelectedId]) {
            markers[currentSelectedId].setIcon(blueIcon);
        }

        currentSelectedId = id;
        const marker = markers[id];
        if (marker) {
            marker.setIcon(redIcon);
            map.setView(marker.getLatLng(), 14); // Zoom in slightly
        }

        // Show Sidebar Loading
        const sidebar = document.getElementById('mapSidebar');
        sidebar.classList.add('open');
        sidebar.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        // Trigger map resize to handle layout change
        setTimeout(() => { map.invalidateSize(); }, 300);

        try {
            const location = await getLocationDetails(id);
            renderSidebar(location);
        } catch (error) {
            sidebar.innerHTML = `<div class="text-error">Error loading details: ${error.message}</div>`;
        }
    }

    function renderSidebar(location) {
        const sidebar = document.getElementById('mapSidebar');
        const isFav = state.favorites.some(f => (f.id || f._id || f) === (location.id || location._id));
        const currentUser = state.currentUser;

        sidebar.innerHTML = `
            <div class="sidebar-header" style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h2 style="font-size: 1.1rem; color: var(--secondary-color); margin-bottom: 0.5rem; line-height: 1.3;">${location.name}</h2>
                    <h4 style="font-size: 0.9rem; color: var(--text-color); margin-bottom: 1rem; opacity: 0.8;">Comment</h4>
                </div>
                <span id="closeSidebar" style="cursor: pointer; font-size: 1.5rem; line-height: 1;">&times;</span>
            </div>

            <div class="sidebar-content">
                <div id="sidebarComments">
                    ${location.comments && location.comments.length > 0 
                        ? location.comments.map(c => {
                            const isMyComment = currentUser && (
                                (c.user && c.user.username === currentUser) || 
                                state.role === 'admin'
                            );
                            const dateStr = new Date(c.timestamp || c.createdAt).toLocaleString();
                            const username = c.user ? (c.user.username || 'Unknown') : 'Anonymous';
                            
                            return `
                            <div class="comment-bubble" style="position: relative;">
                                <div style="font-size: 0.8rem; color: var(--primary-color); margin-bottom: 0.3rem; font-weight: bold;">
                                    ${username} <span style="color: var(--text-color); opacity: 0.6; font-weight: normal; margin-left: 0.5rem;">${dateStr}</span>
                                </div>
                                <div style="font-size:0.9rem;">${c.content}</div>
                                ${isMyComment ? `
                                    <span class="delete-comment-btn" data-id="${c._id}" 
                                          style="position: absolute; top: 10px; right: 10px; cursor: pointer; color: #dc3545;" 
                                          title="Delete Comment">
                                        &#128465;
                                    </span>
                                ` : ''}
                            </div>
                        `}).join('') 
                        : '<p class="text-muted" style="font-size:0.9rem;">No comments yet.</p>'
                    }
                </div>
            </div>

            <div class="comment-input-area">
                <input type="text" id="sidebarCommentInput" placeholder="What is your comment?" 
                    style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: 5px; margin-bottom: 0.5rem; font-size: 0.9rem;">
                
                <button class="btn btn-primary btn-small" id="sidebarPostBtn" style="width: 100%; margin-bottom: 0.5rem;">Add Comment</button>
                
                <button class="btn btn-small ${isFav ? 'btn-danger' : 'btn-secondary'}" 
                    id="sidebarFavBtn" style="width: 100%;">
                    ${isFav ? 'Remove from favourite' : 'Add to favourite'}
                </button>
            </div>
        `;

        // Close Sidebar Event
        document.getElementById('closeSidebar').addEventListener('click', () => {
            sidebar.classList.remove('open');
        });

        // Delete Comment Events
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.currentTarget.dataset.id;
                try {
                    await deleteComment(commentId);
                    // Refresh details
                    const updatedLoc = await getLocationDetails(location.id || location._id);
                    renderSidebar(updatedLoc);
                } catch (err) {
                    alert(err.message);
                }
            });
        });

        // Event Listeners
        document.getElementById('sidebarFavBtn').addEventListener('click', async () => {
            try {
                await toggleFavorite(location.id || location._id);
                // Update state
                const favorites = await getFavorites();
                updateState({ favorites });
                // Re-render sidebar to update button
                renderSidebar(location); 
            } catch (e) {
                alert(e.message);
            }
        });

        document.getElementById('sidebarPostBtn').addEventListener('click', async () => {
            const content = document.getElementById('sidebarCommentInput').value;
            if (!content.trim()) return;

            try {
                await addComment(location.id || location._id, content);
                // Refresh details to show new comment
                const updatedLoc = await getLocationDetails(location.id || location._id);
                renderSidebar(updatedLoc);
            } catch (e) {
                alert(e.message);
            }
        });
    }
}
