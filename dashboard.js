// dashboard.js - MongoDB Connected Version
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.apiClient = window.apiClient;
        
        // Check authentication FIRST
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.init();
    }

    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user && user.id && user.email;
    }

    async getCurrentUser() {
        try {
            // Try to get from localStorage first (for session)
            const localUser = JSON.parse(localStorage.getItem('farmconnect_current_user'));
            if (localUser && localUser.id) {
                console.log('User found in localStorage session');
                return localUser;
            }

            // If we have API client, try to get from MongoDB
            if (this.apiClient) {
                try {
                    // You might want to implement a /me endpoint in your server
                    // For now, we'll rely on localStorage session
                    console.log('API client available but using localStorage session');
                } catch (error) {
                    console.log('API not available, using localStorage only');
                }
            }

            // No user found anywhere
            console.log('No user found - redirecting to login');
            return null;
            
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    }

    async init() {
        // Clean up any conflicting elements first
        this.cleanupConflictingElements();
        
        // Initialize user data
        this.currentUser = await this.getCurrentUser();
        
        // Double-check authentication
        if (!this.currentUser || !this.currentUser.id) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize dashboard components
        this.loadUserData();
        this.setupEventListeners();
        await this.loadDashboardData();
        this.setupNavigation();
        
        console.log('Dashboard initialized successfully for user:', this.currentUser.name);
    }

    async loadDashboardData() {
        await this.loadUsers();
        await this.loadProducts();
        await this.loadOrders();
        this.loadRecentActivity();
    }

    async loadUsers() {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            // Display all users (admin view)
            console.log('All users:', data.users);
            // TODO: Render users in admin section/table if needed
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }

    async loadProducts() {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            // Display all products (admin view)
            console.log('All products:', data.products);
            // TODO: Render products in admin section/table if needed
        } catch (err) {
            console.error('Failed to fetch products:', err);
        }
    }

    async loadOrders() {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            // Display all orders (admin view)
            console.log('All orders:', data.orders);
            // TODO: Render orders in admin section/table if needed
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        }
    }

    async loadStats() {
        try {
            let orders = [];
            let favorites = [];
            
            // Try to get data from API
            if (this.apiClient) {
                try {
                    const ordersResponse = await this.apiClient.getUserOrders(this.currentUser.id);
                    orders = ordersResponse.orders || ordersResponse || [];
                } catch (error) {
                    console.log('Failed to load stats from API, using localStorage');
                    orders = JSON.parse(localStorage.getItem('farmconnect_orders')) || this.getSampleOrders();
                    favorites = JSON.parse(localStorage.getItem('farmconnect_favorites')) || [];
                }
            } else {
                orders = JSON.parse(localStorage.getItem('farmconnect_orders')) || this.getSampleOrders();
                favorites = JSON.parse(localStorage.getItem('farmconnect_favorites')) || [];
            }
            
            // Update stats cards
            this.updateElementText('totalOrders', orders.length);
            this.updateElementText('activeBookings', orders.filter(o => o.status === 'confirmed' || o.status === 'pending').length);
            this.updateElementText('favoritesTotal', favorites.length);
            this.updateElementText('pendingActions', orders.filter(o => o.status === 'pending').length);

            // Update menu badges
            this.updateElementText('ordersCount', orders.length);
            this.updateElementText('bookingsCount', orders.filter(o => o.status === 'confirmed' || o.status === 'pending').length);
            this.updateElementText('favoritesCount', favorites.length);
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    loadUserData() {
        if (this.currentUser) {
            // Set sidebar avatar initials or profile picture
            const avatarEl = document.querySelector('.user-avatar');
            if (avatarEl) {
                if (this.currentUser.profilePicture) {
                    avatarEl.innerHTML = `<img src="${this.currentUser.profilePicture}" alt="Profile" style="width:100%;height:100%;border-radius:50%;">`;
                } else {
                    const names = this.currentUser.fullname ? this.currentUser.fullname.split(' ') : [this.currentUser.email || 'U'];
                    const initials = names[0].charAt(0).toUpperCase() + (names[1] ? names[1].charAt(0).toUpperCase() : '');
                    avatarEl.textContent = initials;
                }
            }
            // Set name and role
            const nameEl = document.querySelector('.user-name');
            const roleEl = document.querySelector('.user-role');
            if (nameEl) nameEl.textContent = this.currentUser.fullname || this.currentUser.name || this.currentUser.email || 'User';
            if (roleEl) {
                const typeMap = {
                    'farmer': 'Farmer',
                    'machinery_owner': 'Machinery Owner',
                    'labour': 'Labour Provider',
                    'admin': 'Administrator'
                };
                roleEl.textContent = typeMap[this.currentUser.userType] || this.currentUser.userType || 'User';
            }
        }
    }

    async loadProfile() {
        if (!this.currentUser) return;
        const form = document.getElementById('profileForm');
        if (!form) return;

        // Set form values
        form.firstName.value = this.currentUser.fullname.split(' ')[0] || '';
        form.lastName.value = this.currentUser.fullname.split(' ')[1] || '';
        form.email.value = this.currentUser.email || '';
        form.phone.value = this.currentUser.phone || '';
        form.address.value = this.currentUser.address || '';
        form.city.value = this.currentUser.city || '';
        form.pincode.value = this.currentUser.pincode || '';
        form.userType.value = this.currentUser.userType || 'farmer';

        // Set profile avatar (profile section)
        setProfileAvatar(this.currentUser);
        // Show User ID if present
        if (this.currentUser.userID && document.getElementById('profileUserName')) {
            document.getElementById('profileUserName').innerHTML = `${this.currentUser.fullname} <span style="font-size:0.9em;color:#888;">(${this.currentUser.userID})</span>`;
        }
    }

    async saveProfile() {
        const form = document.getElementById('profileForm');
        if (!form) return;

        const formData = new FormData(form);
        
        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'pincode'];
        for (let field of requiredFields) {
            if (!formData.get(field)) {
                this.showNotification(`Please fill in the ${field} field.`, 'error');
                return;
            }
        }
        
        // Update user data
        const updatedUser = {
            ...this.currentUser,
            fullname: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            pincode: formData.get('pincode'),
            userType: formData.get('userType'),
            updatedAt: new Date().toISOString()
        };
        
        // Add user type specific data
        switch(updatedUser.userType) {
            case 'farmer':
                updatedUser.farmName = formData.get('farmName');
                updatedUser.farmSize = formData.get('farmSize');
                updatedUser.mainCrops = formData.get('mainCrops');
                break;
            case 'machinery_owner':
                updatedUser.machineryTypes = formData.get('machineryTypes');
                break;
            case 'labour':
                updatedUser.skills = formData.get('skills');
                updatedUser.experience = formData.get('experience');
                break;
        }
        
        // Add profile picture if uploaded (frontend only)
        if (window.profilePictureBase64) {
            updatedUser.profilePicture = window.profilePictureBase64;
        }

        try {
            // Try to save to MongoDB via API
            if (this.apiClient) {
                await this.apiClient.updateUser(this.currentUser.id, updatedUser);
                this.showNotification('Profile updated successfully in MongoDB!', 'success');
            } else {
                // Fallback to localStorage
                localStorage.setItem('farmconnect_current_user', JSON.stringify(updatedUser));
                this.showNotification('Profile updated successfully!', 'success');
            }
            
            // Update dashboard manager
            this.currentUser = updatedUser;
            this.loadUserData();
            
        } catch (error) {
            console.error('Error saving profile:', error);
            // Fallback to localStorage
            localStorage.setItem('farmconnect_current_user', JSON.stringify(updatedUser));
            this.currentUser = updatedUser;
            this.loadUserData();
            this.showNotification('Profile updated locally!', 'info');
        }
        // Update avatar after save
        setProfileAvatar(this.currentUser);
    }

    // Example: Fetch and display orders
    async loadOrders() {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            // Render orders in your orders section/table
            // Example: this.renderOrders(data.orders);
        } catch (err) {
            // Show error message
        }
    }

    // Example: Fetch and display bookings
    async loadBookings() {
        try {
            const res = await fetch('/api/bookings');
            const data = await res.json();
            // Render bookings in your bookings section
        } catch (err) {
            // Show error message
        }
    }

    // Example: Fetch and display favorites
    async loadFavorites() {
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();
            // Render favorites in your favorites section
        } catch (err) {
            // Show error message
        }
    }

    // Example: Fetch and display payment methods
    async loadPaymentMethods() {
        try {
            const res = await fetch('/api/payment-methods');
            const data = await res.json();
            // Render payment methods in your payment section
        } catch (err) {
            // Show error message
        }
    }

    // Example: Fetch and display notifications
    async loadNotifications() {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            // Render notifications in your notifications section
        } catch (err) {
            // Show error message
        }
    }

    // Example: Fetch and display profile
    async loadProfile() {
        try {
            const userId = this.currentUser?.id || this.currentUser?._id;
            if (!userId) return;
            const res = await fetch(`/api/profile/${userId}`);
            const data = await res.json();
            // Render profile in your profile section
        } catch (err) {
            // Show error message
        }
    }

    setupNavigation() {
        // ...existing code...
        // Add event listeners for each menu button
        document.querySelector('[data-section="orders"]').addEventListener('click', () => this.loadOrders());
        document.querySelector('[data-section="bookings"]').addEventListener('click', () => this.loadBookings());
        document.querySelector('[data-section="favorites"]').addEventListener('click', () => this.loadFavorites());
        document.querySelector('[data-section="payments"]').addEventListener('click', () => this.loadPaymentMethods());
        document.querySelector('[data-section="notifications"]').addEventListener('click', () => this.loadNotifications());
        document.querySelector('[data-section="profile"]').addEventListener('click', () => this.loadProfile());
        // ...existing code...
    }
}

// Initialize dashboard when page loads
let dashboardManager;
document.addEventListener('DOMContentLoaded', function() {
    dashboardManager = new DashboardManager();
    
    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('farmconnect_current_user') || 'null');
    // Sidebar elements
    const avatarEl = document.querySelector('.user-avatar');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');

    if (user) {
        // Set avatar initials
        if (avatarEl) {
            const names = user.fullname ? user.fullname.split(' ') : [user.email || 'U'];
            const initials = names[0].charAt(0).toUpperCase() + (names[1] ? names[1].charAt(0).toUpperCase() : '');
            avatarEl.textContent = initials;
        }
        // Set name
        if (nameEl) {
            nameEl.textContent = user.fullname || user.name || user.email || 'User';
        }
        // Set role
        if (roleEl) {
            const typeMap = {
                'farmer': 'Farmer',
                'machinery_owner': 'Machinery Owner',
                'labour': 'Labour Provider',
                'admin': 'Administrator'
            };
            roleEl.textContent = typeMap[user.userType] || user.userType || 'User';
        }
    } else {
        // Not logged in, fallback
        if (nameEl) nameEl.textContent = 'Guest';
        if (roleEl) roleEl.textContent = '';
        if (avatarEl) avatarEl.textContent = 'U';
    }
    // Set avatar initials or image on load
    if (dashboardManager && dashboardManager.currentUser) {
        setProfileAvatar(dashboardManager.currentUser);
    }
    // Change photo button
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    if (changePhotoBtn && profilePhotoInput) {
        changePhotoBtn.addEventListener('click', function() {
            profilePhotoInput.click();
        });
        profilePhotoInput.addEventListener('change', handleProfilePhotoChange);
    }
});

window.dashboardManager = dashboardManager;

// Profile avatar logic for profile section (profile picture or initials)
function setProfileAvatar(user) {
    const initialsEl = document.getElementById('profileAvatarInitials');
    const imgEl = document.getElementById('profileAvatarImg');
    if (!initialsEl || !imgEl) return;
    if (user.profilePicture) {
        imgEl.src = user.profilePicture;
        imgEl.style.display = 'block';
        initialsEl.style.display = 'none';
    } else {
        let initials = '';
        if (user.fullname) {
            const names = user.fullname.split(' ');
            initials = names[0].charAt(0).toUpperCase() + (names[1] ? names[1].charAt(0).toUpperCase() : '');
        } else if (user.email) {
            initials = user.email.charAt(0).toUpperCase();
        }
        initialsEl.textContent = initials;
        initialsEl.style.display = 'block';
        imgEl.style.display = 'none';
    }
}

// Handle profile photo upload (frontend only)
function handleProfilePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        window.profilePictureBase64 = ev.target.result;
        if (dashboardManager && dashboardManager.currentUser) {
            dashboardManager.currentUser.profilePicture = ev.target.result;
            setProfileAvatar(dashboardManager.currentUser);
        }
    };
    reader.readAsDataURL(file);
}

// Popup modal utility
function showFetchingModal() {
    let modal = document.getElementById('fetchingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fetchingModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.35); z-index: 9999; display: flex; align-items: center; justify-content: center;
        `;
        modal.innerHTML = `
            <div style="background: #fff; padding: 32px 40px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); text-align: center; min-width: 260px;">
                <div style="font-size:2.2rem; color:#4CAF50; margin-bottom:12px;">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div style="font-size:1.2rem; color:#333;">Data is being fetched,<br>please wait...</div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }
}
function hideFetchingModal() {
    const modal = document.getElementById('fetchingModal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    // Helper to fetch and log data for a section
    async function fetchSection(endpoint, sectionName) {
        showFetchingModal();
        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            console.log(`Fetched ${sectionName}:`, data);
            // TODO: Render data in the UI for each section
            alert(`Fetched ${sectionName} from backend! Check console for data.`);
        } catch (err) {
            alert(`Failed to fetch ${sectionName}`);
        }
        hideFetchingModal();
    }

    // Map sidebar buttons to backend endpoints
    const sectionMap = {
        'dashboard': () => { /* Optionally reload dashboard stats */ },
        'orders': () => fetchSection('/api/orders', 'Orders'),
        'bookings': () => fetchSection('/api/bookings', 'Bookings'),
        'favorites': () => fetchSection('/api/favorites', 'Favorites'),
        'profile': () => {
            // Replace 'currentUserId' with actual user ID from session/localStorage
            const currentUser = JSON.parse(localStorage.getItem('farmconnect_current_user') || '{}');
            if (currentUser && (currentUser.id || currentUser._id)) {
                fetchSection(`/api/profile/${currentUser.id || currentUser._id}`, 'Profile');
            } else {
                alert('No user logged in');
            }
        },
        'payments': () => fetchSection('/api/payment-methods', 'Payment Methods'),
        'notifications': () => fetchSection('/api/notifications', 'Notifications')
    };

    // Attach click listeners to sidebar menu links
    document.querySelectorAll('.menu-link[data-section]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (sectionMap[section]) sectionMap[section]();
        });
    });
});