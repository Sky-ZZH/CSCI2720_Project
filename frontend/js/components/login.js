import { login } from '../api.js';
import { updateState } from '../state.js';
import { handleRouting } from '../app.js';

export function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-container">
            <h1>Sign In</h1>
            <div id="loginError" class="login-error"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" required placeholder="Enter username">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" required placeholder="Enter password">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button>
            </form>
            <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                <p>Demo Users:</p>
                <p>User: <strong>testuser</strong> / <strong>password123</strong></p>
                <p>Admin: <strong>admin</strong> / <strong>admin123</strong></p>
            </div>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            // 1) Call Login API
            const data = await login(username, password); // returns token (and usually role/username) [file:248]

            // 2) Decode Token to get User Info
            let payload = {};
            try {
                const base64Url = data.token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );
                payload = JSON.parse(jsonPayload);
            } catch (err) {
                console.warn("Login token decode warning:", err);
                payload = {
                    username,
                    role: username.toLowerCase() === 'admin' ? 'admin' : 'user'
                };
            }

            const finalUsername = payload.username || payload.sub || username;
            const finalRole = payload.role || data.role || 'user';

            // 3) Save to localStorage (so refresh still has admin role)
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', finalUsername);
            localStorage.setItem('role', finalRole);

            // 4) Update State
            updateState({
                token: data.token,
                currentUser: finalUsername,
                role: finalRole
            });

            // 5) Redirect to Home
            window.location.hash = '#/home';
            handleRouting();

        } catch (error) {
            console.error(error);
            errorDiv.textContent = error.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    });
}
