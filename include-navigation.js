// include-navigation.js
function includeNavigation() {
    fetch('navigation.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Navigation file not found');
            }
            return response.text();
        })
        .then(data => {
            // Insert navigation at the beginning of body
            document.body.insertAdjacentHTML('afterbegin', data);

            // If there is a global app helper, let it init navigation
            if (window.app) {
                try { window.app.setupNavigation(); } catch (e) { /* ignore */ }
            }

            // If an auth manager exists, ensure it updates the nav UI
            // (some pages initialize authManager before the nav is injected)
            if (window.authManager) {
                // Try to attach event listeners and update UI immediately
                try { window.authManager.setupEventListeners(); } catch (e) { /* ignore */ }
                try { window.authManager.updateUI(); } catch (e) { /* ignore */ }
                // Also schedule a short retry in case DOM insertion timing varies
                setTimeout(() => {
                    try { window.authManager.setupEventListeners(); } catch (e) { /* ignore */ }
                    try { window.authManager.updateUI(); } catch (e) { /* ignore */ }
                }, 50);
                // If authManager still reports not authenticated, attempt to bridge
                // other session keys used across the site (e.g. localStorage keys
                // from the demo login system) so navigation reflects the correct state.
                try {
                    const am = window.authManager;
                    const isAuth = typeof am.isAuthenticated === 'function' ? am.isAuthenticated() : !!am.currentUser;
                    if (!isAuth) {
                        // Check various keys used in the project
                        const farmconnectUser = localStorage.getItem('farmconnect_current_user') || localStorage.getItem('farmconnect_remembered_user');
                        const legacyUser = localStorage.getItem('currentUser') || localStorage.getItem('CURRENT_USER_KEY');
                        if (farmconnectUser) {
                            try {
                                const parsed = JSON.parse(farmconnectUser);
                                am.currentUser = {
                                    name: parsed.fullname || parsed.name || parsed.userID || parsed.email,
                                    email: parsed.email || parsed?.emailAddress || '',
                                    role: parsed.userType || parsed.role || 'customer'
                                };
                                // no token available for demo sessions
                                am.token = localStorage.getItem('token') || null;
                                try { am.updateUI(); } catch (e) { /* ignore */ }
                            } catch (e) {
                                // ignore parse errors
                            }
                        } else if (legacyUser) {
                            try {
                                const parsed = JSON.parse(legacyUser);
                                am.currentUser = parsed;
                                am.token = localStorage.getItem('token') || null;
                                try { am.updateUI(); } catch (e) { /* ignore */ }
                            } catch (e) { /* ignore */ }
                        }
                    }
                } catch (e) {
                    /* ignore bridging errors */
                }
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
            // Fallback: create basic navigation
            createFallbackNavigation();
        });
}

function createFallbackNavigation() {
    const fallbackNav = `
        <header class="header">
            <nav class="navbar">
                <div class="nav-brand">
                    <i class="fas fa-tractor"></i>
                    <h2>FarmConnect</h2>
                </div>
                <div class="auth-buttons">
                    <a href="login.html" class="auth-btn auth-login">Login</a>
                    <a href="register.html" class="auth-btn auth-register">Register</a>
                </div>
            </nav>
        </header>
    `;
    document.body.insertAdjacentHTML('afterbegin', fallbackNav);
}

// Include navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', includeNavigation);