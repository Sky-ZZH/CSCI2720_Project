import { login } from '../api.js';
import { state, updateState } from '../state.js';
import { handleRouting } from '../app.js';

export function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-container">
            <h1>🎭 HK Cultural Events</h1>
            <p>Sign in to explore cultural venues</p>
            <div id="loginError" class="text-error" style="display:none; margin-bottom:1rem;"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" placeholder="testuser" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" placeholder="password123" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
            </form>
            <p style="margin-top:2rem; font-size:0.9rem; opacity:0.7">
                User: testuser / password123<br>
                Admin: admin / admin123
            </p>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const data = await login(username, password);
            localStorage.setItem('token', data.token);
            updateState({
                token: data.token,
                currentUser: data.username,
                role: data.role
            });
            window.location.hash = '#/locations';
            // Force reload to update nav state properly
            window.location.reload();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
}
