// cart.js - Enhanced Cart Management System for FarmConnect
class CartManager {
    constructor() {
        this.cartKey = 'farmconnect_cart';
        this.ordersKey = 'farmconnect_orders';
        this.cart = this.loadCart();
        this.init();
    }

    // Initialize cart manager
    init() {
        this.updateCartCount();
        this.setupEventListeners();
        this.migrateOldCartData(); // Migrate from old cart format if needed
    }

    // Load cart from localStorage
    loadCart() {
        try {
            const cartData = localStorage.getItem(this.cartKey);
            if (!cartData) return [];
            
            const cart = JSON.parse(cartData);
            
            // Validate cart structure
            return Array.isArray(cart) ? cart : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            this.showError('Failed to load cart data');
            return [];
        }
    }

    // Save cart to localStorage
    saveCart() {
        try {
            localStorage.setItem(this.cartKey, JSON.stringify(this.cart));
            this.dispatchCartUpdateEvent();
        } catch (error) {
            console.error('Error saving cart:', error);
            this.showError('Failed to save cart data');
        }
    }

    // Migrate from old cart format if needed
    migrateOldCartData() {
        // Check if old cart format exists and migrate
        const oldCart = localStorage.getItem('farmconnect_cart_old');
        if (oldCart) {
            try {
                const oldCartData = JSON.parse(oldCart);
                if (Array.isArray(oldCartData) && oldCartData.length > 0) {
                    this.cart = oldCartData;
                    this.saveCart();
                    localStorage.removeItem('farmconnect_cart_old');
                    console.log('Migrated old cart data');
                }
            } catch (error) {
                console.error('Error migrating old cart data:', error);
            }
        }
    }

    // Add item to cart with enhanced validation
    addItem(item) {
        if (!this.validateItem(item)) {
            this.showError('Invalid item data');
            return false;
        }

        const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.updatedAt = new Date().toISOString();
        } else {
            this.cart.push({
                ...item,
                quantity: 1,
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        this.saveCart();
        this.updateCartCount();
        this.showNotification(`${item.name} added to cart!`);
        
        // Visual feedback
        this.animateAddToCart(item.id);
        return true;
    }

    // Remove item from cart
    removeItem(itemId) {
        const itemIndex = this.cart.findIndex(item => item.id === itemId);
        
        if (itemIndex > -1) {
            const removedItem = this.cart[itemIndex];
            this.cart.splice(itemIndex, 1);
            this.saveCart();
            this.updateCartCount();
            this.showNotification(`${removedItem.name} removed from cart`, 'warning');
            
            // Visual feedback
            this.animateRemoveFromCart(itemId);
        }
    }

    // Update item quantity with validation
    updateQuantity(itemId, quantity) {
        const quantityNum = parseInt(quantity);
        
        if (isNaN(quantityNum) || quantityNum < 0) {
            this.showError('Invalid quantity');
            return;
        }

        const item = this.cart.find(item => item.id === itemId);
        
        if (item) {
            if (quantityNum === 0) {
                this.removeItem(itemId);
            } else {
                item.quantity = quantityNum;
                item.updatedAt = new Date().toISOString();
                this.saveCart();
                this.updateCartCount();
            }
        }
    }

    // Clear entire cart
    clearCart() {
        if (this.cart.length > 0) {
            this.cart = [];
            this.saveCart();
            this.updateCartCount();
            this.showNotification('Cart cleared successfully', 'info');
        }
    }

    // Get cart items with optional sorting
    getItems(sortBy = 'addedAt') {
        const items = [...this.cart];
        
        switch (sortBy) {
            case 'name':
                return items.sort((a, b) => a.name.localeCompare(b.name));
            case 'price':
                return items.sort((a, b) => a.price - b.price);
            case 'quantity':
                return items.sort((a, b) => b.quantity - a.quantity);
            case 'addedAt':
            default:
                return items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        }
    }

    // Get total items count
    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Get total price
    getTotalPrice() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get item count for specific item
    getItemCount(itemId) {
        const item = this.cart.find(item => item.id === itemId);
        return item ? item.quantity : 0;
    }

    // Check if item is in cart
    hasItem(itemId) {
        return this.cart.some(item => item.id === itemId);
    }

    // Calculate savings compared to original price
    calculateSavings(originalPrice, ourPrice) {
        return Math.max(0, originalPrice - ourPrice);
    }

    // Get cart summary
    getCartSummary() {
        return {
            totalItems: this.getTotalItems(),
            totalPrice: this.getTotalPrice(),
            itemCount: this.cart.length,
            lastUpdated: new Date().toISOString()
        };
    }

    // Export cart data (for debugging or sharing)
    exportCartData() {
        return {
            items: this.cart,
            summary: this.getCartSummary(),
            exportedAt: new Date().toISOString()
        };
    }

    // Update cart count in UI
    updateCartCount() {
        const cartCountElements = document.querySelectorAll('#cartCount');
        const totalItems = this.getTotalItems();
        
        cartCountElements.forEach(element => {
            if (totalItems > 0) {
                element.textContent = totalItems > 99 ? '99+' : totalItems.toString();
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        });

        // Update any cart summary elements
        this.updateCartSummaryElements();
    }

    // Update cart summary elements on page
    updateCartSummaryElements() {
        const summaryElements = document.querySelectorAll('[data-cart-summary]');
        const summary = this.getCartSummary();
        
        summaryElements.forEach(element => {
            const summaryType = element.getAttribute('data-cart-summary');
            switch (summaryType) {
                case 'total-items':
                    element.textContent = summary.totalItems;
                    break;
                case 'total-price':
                    element.textContent = `₹${summary.totalPrice}`;
                    break;
                case 'item-count':
                    element.textContent = summary.itemCount;
                    break;
            }
        });
    }

    // Show cart notification
    showNotification(message = 'Item added to cart!', type = 'success') {
        // Remove existing notification if any
        const existingNotification = document.getElementById('cartNotification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.id = 'cartNotification';
        notification.className = `cart-notification ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.success}"></i>
            <span>${message}</span>
            <div class="cart-count">${this.getTotalItems()}</div>
        `;

        document.body.appendChild(notification);
        notification.style.display = 'flex';

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.5s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 500);
            }
        }, 3000);
    }

    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Animate add to cart action
    animateAddToCart(itemId) {
        const button = document.querySelector(`[data-id="${itemId}"]`);
        if (button) {
            button.classList.add('adding-to-cart');
            setTimeout(() => {
                button.classList.remove('adding-to-cart');
            }, 2000);
        }
    }

    // Animate remove from cart action
    animateRemoveFromCart(itemId) {
        const element = document.querySelector(`[data-id="${itemId}"]`);
        if (element) {
            element.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (element.parentNode) {
                    element.remove();
                }
            }, 300);
        }
    }

    // Setup event listeners for cart interactions
    setupEventListeners() {
        // Listen for storage events (sync across tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === this.cartKey) {
                this.cart = this.loadCart();
                this.updateCartCount();
            }
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible, refresh cart
                this.cart = this.loadCart();
                this.updateCartCount();
            }
        });
    }

    // Dispatch custom event when cart updates
    dispatchCartUpdateEvent() {
        const event = new CustomEvent('cartUpdated', {
            detail: {
                cart: this.cart,
                summary: this.getCartSummary()
            }
        });
        document.dispatchEvent(event);
    }

    // Validate item before adding to cart
    validateItem(item) {
        return item &&
               item.id &&
               item.name &&
               typeof item.price === 'number' &&
               item.price >= 0 &&
               item.type;
    }

    // Create order from cart
    createOrder(customerInfo, paymentMethod) {
        if (this.cart.length === 0) {
            throw new Error('Cannot create order: Cart is empty');
        }

        const order = {
            id: 'FC' + Date.now() + Math.random().toString(36).substr(2, 9),
            items: this.getItems(),
            customer: customerInfo,
            payment: {
                method: paymentMethod,
                amount: this.getTotalPrice(),
                status: paymentMethod === 'cod' ? 'pending' : 'completed'
            },
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            estimatedDelivery: this.calculateEstimatedDelivery(),
            orderTotal: this.getTotalPrice()
        };

        // Save order to localStorage
        this.saveOrder(order);
        
        // Clear cart after successful order
        this.clearCart();
        
        return order;
    }

    // Save order to localStorage
    saveOrder(order) {
        try {
            const orders = JSON.parse(localStorage.getItem(this.ordersKey)) || [];
            orders.unshift(order); // Add to beginning of array
            localStorage.setItem(this.ordersKey, JSON.stringify(orders));
        } catch (error) {
            console.error('Error saving order:', error);
            throw new Error('Failed to save order');
        }
    }

    // Calculate estimated delivery date
    calculateEstimatedDelivery() {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 2); // 2 days from now
        return deliveryDate.toISOString();
    }

    // Get order history
    getOrderHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.ordersKey)) || [];
        } catch (error) {
            console.error('Error loading order history:', error);
            return [];
        }
    }

    // Get order by ID
    getOrder(orderId) {
        const orders = this.getOrderHistory();
        return orders.find(order => order.id === orderId);
    }
}

// Initialize cart manager
const cartManager = new CartManager();

// Enhanced initialization with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Update cart count
        cartManager.updateCartCount();
        
        // Add to cart functionality with enhanced features
        const addToCartButtons = document.querySelectorAll('.add-to-cart');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', function() {
                const item = {
                    id: this.getAttribute('data-id'),
                    name: this.getAttribute('data-name'),
                    price: parseInt(this.getAttribute('data-price')),
                    type: this.getAttribute('data-type'),
                    image: this.getAttribute('data-image')
                };
                
                // Add item to cart
                const success = cartManager.addItem(item);
                
                if (success) {
                    // Enhanced button feedback
                    const originalContent = this.innerHTML;
                    const originalBg = this.style.background;
                    
                    this.innerHTML = '<i class="fas fa-check"></i> Added!';
                    this.style.background = '#2E7D32';
                    this.disabled = true;
                    
                    setTimeout(() => {
                        this.innerHTML = originalContent;
                        this.style.background = originalBg;
                        this.disabled = false;
                    }, 2000);
                }
            });
        });
        
        // Quantity controls
        const quantityControls = document.querySelectorAll('.quantity-controls');
        quantityControls.forEach(control => {
            const decreaseBtn = control.querySelector('.decrease-btn');
            const increaseBtn = control.querySelector('.increase-btn');
            const quantityInput = control.querySelector('.quantity-input');
            
            if (decreaseBtn && increaseBtn && quantityInput) {
                const itemId = control.closest('[data-id]').getAttribute('data-id');
                
                decreaseBtn.addEventListener('click', () => {
                    const currentValue = parseInt(quantityInput.value) || 1;
                    if (currentValue > 1) {
                        quantityInput.value = currentValue - 1;
                        cartManager.updateQuantity(itemId, currentValue - 1);
                    }
                });
                
                increaseBtn.addEventListener('click', () => {
                    const currentValue = parseInt(quantityInput.value) || 1;
                    quantityInput.value = currentValue + 1;
                    cartManager.updateQuantity(itemId, currentValue + 1);
                });
                
                quantityInput.addEventListener('change', (e) => {
                    const newValue = parseInt(e.target.value) || 1;
                    if (newValue > 0) {
                        cartManager.updateQuantity(itemId, newValue);
                    } else {
                        e.target.value = 1;
                    }
                });
            }
        });
        
        // Mobile menu toggle with enhanced functionality
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', function() {
                this.classList.toggle('active');
                navMenu.classList.toggle('active');
                
                // Close menu when clicking outside
                if (navMenu.classList.contains('active')) {
                    const closeMenu = (e) => {
                        if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                            navMenu.classList.remove('active');
                            hamburger.classList.remove('active');
                            document.removeEventListener('click', closeMenu);
                        }
                    };
                    
                    setTimeout(() => {
                        document.addEventListener('click', closeMenu);
                    }, 100);
                }
            });
        }
        
        // Listen for cart updates to refresh UI
        document.addEventListener('cartUpdated', (e) => {
            console.log('Cart updated:', e.detail);
            // You can add specific UI updates here based on cart changes
        });
        
        console.log('FarmConnect Cart Manager initialized successfully');
        
    } catch (error) {
        console.error('Error initializing FarmConnect:', error);
        cartManager.showError('Failed to initialize application');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CartManager, cartManager };
}