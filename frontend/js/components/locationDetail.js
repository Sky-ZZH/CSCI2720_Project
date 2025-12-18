import { getLocationDetails, addComment, deleteComment } from '../api.js';
import { state } from '../state.js';

export async function renderLocationDetail(id) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const location = await getLocationDetails(id);
        const currentUser = state.currentUser;
        
        app.innerHTML = `
            <div class="detail-container">
                <a href="#/locations" class="back-button">← Back to Locations</a>
                
                <div class="detail-header">
                    <h1>${location.name}</h1>
                </div>

                <div class="detail-info">
                    <p><strong>Coordinates:</strong> ${location.latitude}, ${location.longitude}</p>
                </div>

                <div id="map" class="detail-map"></div>

                <div class="events-section">
                    <h2>Upcoming Events</h2>
                    ${location.events && location.events.length > 0 
                        ? location.events.map(event => `
                            <div class="event-item">
                                <h4>${event.title}</h4>
                                <p>${event.description || 'No description available.'}</p>
                                <p><small>${event.dateTime || 'Date TBA'} - ${event.presenter}</small></p>
                                <p><strong>Price:</strong> ${event.price}</p>
                            </div>
                        `).join('')
                        : '<p class="text-muted">No upcoming events listed.</p>'
                    }
                </div>

                <div class="comments-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h2>Comments</h2>
                        <button class="btn btn-primary btn-small" id="addCommentBtn">Add Comment</button>
                    </div>
                    <div id="commentsList">
                        ${location.comments && location.comments.length > 0
                            ? location.comments.map(comment => {
                                const isMyComment = currentUser && (
                                    (comment.user && comment.user.username === currentUser) || 
                                    state.role === 'admin'
                                );
                                return `
                                <div class="comment-item" style="position: relative;">
                                    <div class="comment-author">
                                        ${comment.user.username}
                                    </div>
                                    ${isMyComment ? `
                                        <span class="delete-comment-btn" data-id="${comment._id}" 
                                              style="position: absolute; top: 10px; right: 0; cursor: pointer; color: #dc3545;" 
                                              title="Delete Comment">
                                            &#128465;
                                        </span>
                                    ` : ''}
                                    <div class="comment-text">${comment.content}</div>
                                    <div class="comment-time">${new Date(comment.createdAt).toLocaleString()}</div>
                                </div>
                            `}).join('')
                            : '<p class="text-muted">No comments yet. Be the first!</p>'
                        }
                    </div>
                </div>
            </div>
        `;

        // Initialize Map
        if (location.latitude && location.longitude) {
            const map = L.map('map').setView([location.latitude, location.longitude], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            L.marker([location.latitude, location.longitude])
                .addTo(map)
                .bindPopup(location.name)
                .openPopup();
        }

        // Comment Modal Handler
        document.getElementById('addCommentBtn').addEventListener('click', () => {
            showCommentModal(id);
        });

        // Delete Comment Handlers
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.currentTarget.dataset.id;
                try {
                    await deleteComment(commentId);
                    renderLocationDetail(id); // Reload to update list
                } catch (err) {
                    alert(err.message);
                }
            });
        });

    } catch (error) {
        app.innerHTML = `<div class="text-error">Error loading location details: ${error.message}</div>`;
    }
}

function showCommentModal(locationId) {
    const modalHtml = `
        <div id="commentModal" class="modal show">
            <div class="modal-content">
                <span class="close" id="closeCommentModal">&times;</span>
                <h2>Add Comment</h2>
                <form id="commentForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <textarea id="commentText" placeholder="Write your comment..." required style="width: 100%; min-height: 120px;"></textarea>
                    <div style="text-align: right;">
                        <button type="submit" class="btn btn-primary">Post Comment</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHtml;

    const modal = document.getElementById('commentModal');
    const closeBtn = document.getElementById('closeCommentModal');
    
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => modalContainer.innerHTML = '', 300);
    };

    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) closeModal();
    };

    document.getElementById('commentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('commentText').value;
        try {
            await addComment(locationId, content);
            closeModal();
            renderLocationDetail(locationId); // Reload to show new comment
        } catch (error) {
            alert('Failed to post comment: ' + error.message);
        }
    });
}
