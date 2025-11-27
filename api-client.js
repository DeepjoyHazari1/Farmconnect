// api-client.js - Frontend API client for MongoDB backend
class APIClient {
    constructor() {
        this.BASE_URL = 'http://localhost:5500/api'; // Your server port
    }

    // Generic request method
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // ===== USER OPERATIONS =====
    async registerUser(userData) {
        return await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async loginUser(credentials) {
        return await this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async getUserById(userId) {
        return await this.request(`/users/${userId}`);
    }

    async getUserByEmail(email) {
        const users = await this.request('/users');
        return users.find(user => user.email === email) || null;
    }

    async updateUser(userId, userData) {
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    // ===== PRODUCT/MACHINERY OPERATIONS =====
    async getAllProducts() {
        return await this.request('/products');
    }

    async addProduct(productData) {
        return await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    }

    async getProductsByCategory(category) {
        const products = await this.request('/products');
        return products.filter(product => product.category === category);
    }

    // ===== ORDER OPERATIONS =====
    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async getUserOrders(userId) {
        const orders = await this.request('/orders');
        return orders.filter(order => order.customerId === userId);
    }

    async getAllOrders() {
        return await this.request('/orders');
    }

    // ===== HEALTH CHECK =====
    async healthCheck() {
        return await this.request('/health');
    }

    async getDatabaseInfo() {
        return await this.request('/db-info');
    }
}

// Create global instance
const apiClient = new APIClient();
window.apiClient = apiClient;