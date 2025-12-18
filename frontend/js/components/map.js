import { getLocations, getLocationDetails, addComment, deleteComment, toggleFavorite, getFavorites } from '../api.js';
import { state, updateState } from '../state.js';

let mapInstance = null;

export async function renderMap() {
    const app = document.getElementById('app');
    // Flex layout for side panel + map
    // z-index of sidePanel set to 90 to be below navbar (100)
    app.innerHTML = `
        <div class="map-layout" style="display: flex; height: calc(100vh - 60px); overflow: hidden; position: relative;">
            <div id="sidePanel" class="side-panel" style="width: 0; background: white; border-right: 1px solid #ddd; overflow-y: auto; transition: width 0.3s ease; position: relative; display: flex; flex-direction: column; z-index: 90;">
                <!-- Content injected here -->
            </div>
            <div id="mapContainer" style="flex: 1; position: relative;">
                <div id="fullMap" style="height: 100%; width: 100%; z-index: 1;"></div>
            </div>
        </div>
    `;

    try {
        // Fetch locations and favorites in parallel
        const [locations, favorites] = await Promise.all([
            getLocations(),
            getFavorites().catch(() => [])
        ]);
        
        updateState({ locations, favorites });
        
        // Initialize Map
        mapInstance = L.map('fullMap').setView([22.3193, 114.1694], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        locations.forEach(loc => {
            if (loc.latitude && loc.longitude) {
                const marker = L.marker([loc.latitude, loc.longitude]).addTo(mapInstance);
                
                const popupContent = document.createElement('div');
                popupContent.innerHTML = `
                    <b>${loc.name}</b><br>
                    <button class="btn-link" style="color: blue; text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; margin-top: 5px;">View Details</button>
                `;
                
                // Add click listener to the button inside popup
                popupContent.querySelector('button').addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent any default link behavior
                    openSidePanel(loc.id);
                });

                marker.bindPopup(popupContent);
            }
        });

    } catch (error) {
        app.innerHTML = `<div class="text-error">Error loading map: ${error.message}</div>`;
    }
}

async function openSidePanel(id) {
    const sidePanel = document.getElementById('sidePanel');
    
    // Show loading state and expand panel
    sidePanel.style.width = '400px';
    sidePanel.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
    
    // Resize map to fit new container size
    setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
    }, 300);

    try {
        const location = await getLocationDetails(id);
        renderSidePanelContent(location);
        
        // Center map on location and zoom in
        if (location.latitude && location.longitude) {
            mapInstance.flyTo([location.latitude, location.longitude], 15, {
                animate: true,
                duration: 1
            });
        }

    } catch (error) {
        sidePanel.innerHTML = `
            <div style="padding: 20px;">
                <button onclick="document.getElementById('sidePanel').style.width='0'" style="float:right;">&times;</button>
                <div class="text-error">Error: ${error.message}</div>
            </div>`;
    }
}

function renderSidePanelContent(location) {
    const sidePanel = document.getElementById('sidePanel');
    // Check if favorite (handle both populated object and ID string)
    // Ensure we compare strings to avoid ObjectId vs String issues
    const isFav = state.favorites.some(f => {
        const favId = f._id || f.id || f;
        const locId = location._id || location.id;
        const favCustomId = f.id; // Custom string ID
        const locCustomId = location.id; // Custom string ID
        
        return (favId && locId && favId.toString() === locId.toString()) || 
               (favCustomId && locCustomId && favCustomId === locCustomId);
    });

    sidePanel.innerHTML = `
        <div class="panel-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: start; background: #f8f9fa;">
            <h2 style="margin: 0; font-size: 1.2rem; color: #333;">${location.name}</h2>
            <button id="closePanel" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
        </div>
        
        <div class="panel-content" style="padding: 20px; flex: 1; overflow-y: auto;">
            <div class="mb-3">
                <button id="favBtn" class="btn w-100" style="background-color: ${isFav ? '#dc3545' : '#0d6efd'}; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
                    ${isFav ? 'Remove from favourite' : 'Add to favourite'}
                </button>
            </div>

            <div class="comments-section">
                <h3 style="font-size: 1.1rem; margin-bottom: 15px;">Comments</h3>
                
                <div id="commentsList" class="comments-list" style="margin-bottom: 20px; max-height: 300px; overflow-y: auto;">
                    ${location.comments && location.comments.length > 0 
                        ? location.comments.map(c => {
                            const canDelete = (state.userId && c.user && state.userId === c.user._id) || state.role === 'admin';
                            return `
                            <div class="comment-item" style="background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 5px; border-left: 3px solid #0d6efd;">
                                <div style="display:flex; justify-content:space-between;">
                                    <div style="font-weight: bold; font-size: 0.9rem; color: #333;">${c.user ? c.user.username : 'Anonymous'}</div>
                                    ${canDelete ? `
                                        <button class="btn-side-delete-comment" data-id="${c._id}" style="color: #dc3545; background: none; border: none; cursor: pointer; padding: 0;" title="Delete Comment">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                            </svg>
                                        </button>
                                    ` : ''}
                                </div>
                                <div style="margin: 5px 0; color: #555;">${c.content}</div>
                                <div style="font-size: 0.75rem; color: #999;">${new Date(c.timestamp || c.createdAt || Date.now()).toLocaleString()}</div>
                            </div>
                        `}).join('') 
                        : '<p class="text-muted" style="font-style: italic; color: #777;">No comments yet.</p>'
                    }
                </div>

                <form id="sideCommentForm">
                    <div class="form-group" style="margin-bottom: 10px;">
                        <textarea id="sideCommentText" class="form-control" rows="3" placeholder="Write your comment..." required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                    </div>
                    <button type="submit" class="btn" style="background-color: #0d6efd; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Add Comment</button>
                </form>
            </div>
        </div>
    `;

    // Event Listeners
    document.getElementById('closePanel').addEventListener('click', closeSidePanel);
    
    document.getElementById('favBtn').addEventListener('click', async () => {
        try {
            // Use the custom ID (string) for toggling, as backend supports it
            await toggleFavorite(location.id);
            // Refresh favorites state
            const favorites = await getFavorites();
            updateState({ favorites });
            // Re-render panel to update button state
            // We reuse the same location object but the isFav check will use the new state.favorites
            renderSidePanelContent(location); 
        } catch (error) {
            alert('Error updating favorite: ' + error.message);
        }
    });

    document.getElementById('sideCommentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('sideCommentText').value;
        if (!content.trim()) return;
        
        try {
            await addComment(location.id, content);
            // Refresh details to show new comment
            const updatedLoc = await getLocationDetails(location.id);
            renderSidePanelContent(updatedLoc);
        } catch (error) {
            alert('Failed to post comment: ' + error.message);
        }
    });

    // Delete Comment Handlers
    document.querySelectorAll('.btn-side-delete-comment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(!confirm('Are you sure you want to delete this comment?')) return;
            const commentId = btn.dataset.id;
            try {
                await deleteComment(location.id, commentId);
                const updatedLoc = await getLocationDetails(location.id);
                renderSidePanelContent(updatedLoc);
            } catch (error) {
                alert('Failed to delete comment: ' + error.message);
            }
        });
    });
}

function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    sidePanel.style.width = '0';
    setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
    }, 300);
}
