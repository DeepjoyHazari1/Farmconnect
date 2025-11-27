// auth.js - Authentication State Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.apiBaseURL = 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.loadAuthState();
        this.setupEventListeners();
    }

    // Load authentication state from localStorage
    loadAuthState() {
        try {
            const userData = localStorage.getItem('currentUser');
            const token = localStorage.getItem('token');
            
            if (userData && token) {
                this.currentUser = JSON.parse(userData);
                this.token = token;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading auth state:', error);
            this.clearAuthState();
        }
    }

    // Save authentication state
    saveAuthState(user, token) {
        this.currentUser = user;
        this.token = token;
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('token', token);
        this.updateUI();
    }

    // Clear authentication state
    clearAuthState() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        this.updateUI();
    }

    // Update UI based on authentication state
    updateUI() {
        const userProfileNav = document.getElementById('userProfileNav');
        const authButtons = document.getElementById('authButtons');
        const userNameNav = document.getElementById('userNameNav');
        const userRoleNav = document.getElementById('userRoleNav');
        const userAvatarNav = document.getElementById('userAvatarNav');

        if (this.currentUser && userProfileNav && authButtons) {
            // User is logged in - show profile, hide auth buttons
            userProfileNav.style.display = 'flex';
            authButtons.style.display = 'none';

            // Update user information
            if (userNameNav) {
                userNameNav.textContent = this.currentUser.name || 'User';
            }

            if (userRoleNav) {
                userRoleNav.textContent = this.formatUserRole(this.currentUser.role);
            }

            if (userAvatarNav) {
                this.updateUserAvatar(userAvatarNav);
            }

        } else if (userProfileNav && authButtons) {
            // User is not logged in - show auth buttons, hide profile
            userProfileNav.style.display = 'none';
            authButtons.style.display = 'flex';
        }
    }

    // Update user avatar
    updateUserAvatar(avatarElement) {
        if (!this.currentUser) return;

        if (this.currentUser.profileImage) {
            avatarElement.innerHTML = `<img src="${this.currentUser.profileImage}" alt="${this.currentUser.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const names = this.currentUser.name ? this.currentUser.name.split(' ') : ['U', 'S'];
            const initials = (names[0].charAt(0) + (names[1] ? names[1].charAt(0) : names[0].charAt(1))).toUpperCase();
            avatarElement.textContent = initials;
            avatarElement.className = 'user-avatar-nav';
        }
    }

    formatUserRole(role) {
        const roleMap = {
            'farmer': 'Farmer',
            'customer': 'Customer',
            'admin': 'Administrator'
        };
        return roleMap[role] || role;
    }

    setupEventListeners() {
        // User dropdown toggle
        const userProfileNav = document.getElementById('userProfileNav');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userProfileNav && userDropdown) {
            userProfileNav.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-profile-nav') && userDropdown) {
                userDropdown.classList.remove('active');
            }
        });
    }

    // API call helper
    async apiCall(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header if token exists
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.apiBaseURL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Login method
    async login(email, password) {
        try {
            const data = await this.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (data.success) {
                this.saveAuthState(data.user, data.token);
                this.showNotification('Login successful!', 'success');
                return { success: true, user: data.user };
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Register method
    async register(userData) {
        try {
            const data = await this.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (data.success) {
                this.saveAuthState(data.user, data.token);
                this.showNotification('Registration successful!', 'success');
                return { success: true, user: data.user };
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Logout method
    logout() {
        this.clearAuthState();
        this.showNotification('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser && !!this.token;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Show notification
    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Add notification styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                }
                .notification.success {
                    border-left: 4px solid #4CAF50;
                    color: #2d5016;
                }
                .notification.error {
                    border-left: 4px solid #dc3545;
                    color: #dc3545;
                }
                .notification.info {
                    border-left: 4px solid #17a2b8;
                    color: #17a2b8;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Global auth instance
let authManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
    window.authManager = authManager;
});

// Global logout function
function logout() {
    if (authManager) {
        authManager.logout();
    }
}