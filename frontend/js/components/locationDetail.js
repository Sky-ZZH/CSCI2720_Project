import { getLocationDetails, addComment, deleteComment } from '../api.js';
import { state } from '../state.js';

export async function renderLocationDetail(id) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const location = await getLocationDetails(id);
        
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
                                const canDelete = (state.userId && comment.user && state.userId === comment.user._id) || state.role === 'admin';
                                return `
                                <div class="comment-item">
                                    <div style="display:flex; justify-content:space-between;">
                                        <div class="comment-author">${comment.user ? comment.user.username : 'Anonymous'}</div>
                                        ${canDelete ? `
                                            <button class="btn-delete-comment" data-id="${comment._id}" style="color: #dc3545; background: none; border: none; cursor: pointer; padding: 0;" title="Delete Comment">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                </svg>
                                            </button>
                                        ` : ''}
                                    </div>
                                    <div class="comment-text">${comment.content}</div>
                                    <div class="comment-time">${new Date(comment.timestamp || comment.createdAt || Date.now()).toLocaleString()}</div>
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
        document.querySelectorAll('.btn-delete-comment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('Are you sure you want to delete this comment?')) return;
                const commentId = btn.dataset.id;
                try {
                    await deleteComment(id, commentId);
                    renderLocationDetail(id);
                } catch (error) {
                    alert('Failed to delete comment: ' + error.message);
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
                <form id="commentForm">
                    <textarea id="commentText" placeholder="Write your comment..." required></textarea>
                    <button type="submit" class="btn btn-primary">Post Comment</button>
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
