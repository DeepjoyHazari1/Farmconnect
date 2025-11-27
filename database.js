// database.js - Local Database for FarmConnect
class FarmConnectDB {
    constructor() {
        this.dbName = 'FarmConnectDB';
        this.version = 1;
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users table
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    usersStore.createIndex('email', 'email', { unique: true });
                    usersStore.createIndex('phone', 'phone', { unique: true });
                    usersStore.createIndex('userID', 'userID', { unique: true });
                }

                // Machinery table
                if (!db.objectStoreNames.contains('machinery')) {
                    const machineryStore = db.createObjectStore('machinery', { keyPath: 'id', autoIncrement: true });
                    machineryStore.createIndex('name', 'name', { unique: false });
                    machineryStore.createIndex('type', 'type', { unique: false });
                    machineryStore.createIndex('location', 'location', { unique: false });
                }

                // Labour table
                if (!db.objectStoreNames.contains('labour')) {
                    const labourStore = db.createObjectStore('labour', { keyPath: 'id', autoIncrement: true });
                    labourStore.createIndex('name', 'name', { unique: false });
                    labourStore.createIndex('skill', 'skill', { unique: false });
                    labourStore.createIndex('location', 'location', { unique: false });
                }

                // Bookings table
                if (!db.objectStoreNames.contains('bookings')) {
                    const bookingsStore = db.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
                    bookingsStore.createIndex('userId', 'userId', { unique: false });
                    bookingsStore.createIndex('type', 'type', { unique: false });
                    bookingsStore.createIndex('status', 'status', { unique: false });
                    bookingsStore.createIndex('bookingDate', 'bookingDate', { unique: false });
                }

                // Cart table
                if (!db.objectStoreNames.contains('cart')) {
                    const cartStore = db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
                    cartStore.createIndex('userId', 'userId', { unique: false });
                    cartStore.createIndex('itemType', 'itemType', { unique: false });
                }

                console.log('FarmConnect Database initialized successfully');
            };
        });
    }

    // ===== USER OPERATIONS =====
    async addUser(userData) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...userData,
                created: new Date().toISOString(),
                status: 'active'
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserByEmail(email) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('email');

        return new Promise((resolve, reject) => {
            const request = index.get(email);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserById(userId) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');

        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllUsers() {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ===== MACHINERY OPERATIONS =====
    async addMachinery(machineryData) {
        const transaction = this.db.transaction(['machinery'], 'readwrite');
        const store = transaction.objectStore('machinery');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...machineryData,
                created: new Date().toISOString(),
                status: 'available'
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllMachinery() {
        const transaction = this.db.transaction(['machinery'], 'readonly');
        const store = transaction.objectStore('machinery');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getMachineryByType(type) {
        const transaction = this.db.transaction(['machinery'], 'readonly');
        const store = transaction.objectStore('machinery');
        const index = store.index('type');

        return new Promise((resolve, reject) => {
            const request = index.getAll(type);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ===== LABOUR OPERATIONS =====
    async addLabour(labourData) {
        const transaction = this.db.transaction(['labour'], 'readwrite');
        const store = transaction.objectStore('labour');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...labourData,
                created: new Date().toISOString(),
                status: 'available'
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllLabour() {
        const transaction = this.db.transaction(['labour'], 'readonly');
        const store = transaction.objectStore('labour');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getLabourBySkill(skill) {
        const transaction = this.db.transaction(['labour'], 'readonly');
        const store = transaction.objectStore('labour');
        const index = store.index('skill');

        return new Promise((resolve, reject) => {
            const request = index.getAll(skill);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ===== BOOKING OPERATIONS =====
    async addBooking(bookingData) {
        const transaction = this.db.transaction(['bookings'], 'readwrite');
        const store = transaction.objectStore('bookings');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...bookingData,
                bookingDate: new Date().toISOString(),
                status: 'confirmed'
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserBookings(userId) {
        const transaction = this.db.transaction(['bookings'], 'readonly');
        const store = transaction.objectStore('bookings');
        const index = store.index('userId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllBookings() {
        const transaction = this.db.transaction(['bookings'], 'readonly');
        const store = transaction.objectStore('bookings');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ===== CART OPERATIONS =====
    async addToCart(cartData) {
        const transaction = this.db.transaction(['cart'], 'readwrite');
        const store = transaction.objectStore('cart');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...cartData,
                addedDate: new Date().toISOString()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserCart(userId) {
        const transaction = this.db.transaction(['cart'], 'readonly');
        const store = transaction.objectStore('cart');
        const index = store.index('userId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearUserCart(userId) {
        const transaction = this.db.transaction(['cart'], 'readwrite');
        const store = transaction.objectStore('cart');
        const index = store.index('userId');

        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only(userId));
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // ===== DATA EXPORT/IMPORT =====
    async exportData() {
        const users = await this.getAllUsers();
        const machinery = await this.getAllMachinery();
        const labour = await this.getAllLabour();
        const bookings = await this.getAllBookings();

        return {
            users,
            machinery,
            labour,
            bookings,
            exportDate: new Date().toISOString()
        };
    }

    async importData(data) {
        // Import users
        if (data.users) {
            for (const user of data.users) {
                await this.addUser(user);
            }
        }

        // Import machinery
        if (data.machinery) {
            for (const machine of data.machinery) {
                await this.addMachinery(machine);
            }
        }

        // Import labour
        if (data.labour) {
            for (const worker of data.labour) {
                await this.addLabour(worker);
            }
        }
    }
}

// Create global database instance
const farmConnectDB = new FarmConnectDB();

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await farmConnectDB.init();
        console.log('FarmConnect Database ready');
        
        // Add sample data if database is empty
        await addSampleData();
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
});

// Add sample data to database
async function addSampleData() {
    try {
        // Check if we already have data
        const existingMachinery = await farmConnectDB.getAllMachinery();
        const existingLabour = await farmConnectDB.getAllLabour();

        if (existingMachinery.length === 0) {
            // Add sample machinery
            const sampleMachinery = [
                {
                    name: "John Deere 5050D Tractor",
                    type: "tractor",
                    price: 800,
                    location: "kalyani",
                    specifications: "45 HP, Diesel, 4WD",
                    features: ["Power Steering", "ROPS Cabin", "3-Point Hitch"],
                    image: "https://cdn.tractorsdekho.com/in/john-deere/5050-d/john-deere-5050-d-53440.jpg",
                    description: "Reliable and efficient tractor perfect for various farming operations."
                },
                {
                    name: "Mahindra 6050 Tractor",
                    type: "tractor",
                    price: 1200,
                    location: "nadia",
                    specifications: "60 HP, Diesel, 4WD",
                    features: ["AC Cabin", "Heavy Duty", "Multi-speed"],
                    image: "https://www.mahindratractor.com/sites/default/files/2024-07/ARJUN-NOVO-605-DI%E2%80%93i-4WD-Desktop_1.webp",
                    description: "Powerful heavy-duty tractor with AC cabin for comfortable operation."
                },
                {
                    name: "Kubota Harvester",
                    type: "harvester",
                    price: 2000,
                    location: "krishnanagar",
                    specifications: "75 HP, Diesel, Combine Harvester",
                    features: ["Auto Steering", "Grain Tank", "Straw Chopper"],
                    image: "https://www.kubota.com/content/dam/kubota/product/gray/tractor/m7-series/M7-131/M7-131_01.jpg",
                    description: "Advanced combine harvester for efficient crop harvesting."
                },
                {
                    name: "Farmtrac Rotavator",
                    type: "rotavator",
                    price: 600,
                    location: "kalyani",
                    specifications: "Medium Duty, 6 Feet",
                    features: ["Heavy Duty Blades", "Adjustable Depth", "Easy Operation"],
                    image: "https://5.imimg.com/data5/SELLER/Default/2023/4/297388833/YY/YK/KK/155726061/farmtrac-45-rotavator-500x500.jpg",
                    description: "Perfect for soil preparation and tilling operations."
                }
            ];

            for (const machine of sampleMachinery) {
                await farmConnectDB.addMachinery(machine);
            }
        }

        if (existingLabour.length === 0) {
            // Add sample labour
            const sampleLabour = [
                {
                    name: "Rajesh Kumar",
                    skill: "harvesting",
                    experience: 5,
                    location: "kalyani",
                    wage: 500,
                    rating: 4.2,
                    reviews: 24,
                    features: ["Rice Harvesting", "Wheat Cutting", "Team Leader"],
                    image: "https://images.unsplash.com/photo-1581093452885-4c70b82c5032?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                    description: "Specialized in rice and wheat harvesting with excellent team leadership skills."
                },
                {
                    name: "Sunil Patel",
                    skill: "tractor",
                    experience: 8,
                    location: "krishnanagar",
                    wage: 600,
                    rating: 4.8,
                    reviews: 31,
                    features: ["Tractor Expert", "Ploughing", "Maintenance"],
                    image: "https://images.unsplash.com/photo-1560253023-3ec6b69bc42a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                    description: "Expert tractor operator with extensive knowledge of farm machinery."
                },
                {
                    name: "Amit Sharma",
                    skill: "irrigation",
                    experience: 6,
                    location: "nadia",
                    wage: 450,
                    rating: 4.5,
                    reviews: 18,
                    features: ["Drip Irrigation", "Sprinkler Systems", "Water Management"],
                    image: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                    description: "Skilled in modern irrigation techniques and water conservation."
                },
                {
                    name: "Priya Singh",
                    skill: "planting",
                    experience: 4,
                    location: "kalyani",
                    wage: 400,
                    rating: 4.3,
                    reviews: 15,
                    features: ["Seed Planting", "Crop Management", "Organic Farming"],
                    image: "https://images.unsplash.com/photo-1577223625819-1f47c3d67085?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                    description: "Expert in crop planting techniques and organic farming practices."
                }
            ];

            for (const worker of sampleLabour) {
                await farmConnectDB.addLabour(worker);
            }
        }

        console.log('Sample data added successfully');
    } catch (error) {
        console.error('Error adding sample data:', error);
    }
}

// Export database functions to global scope
window.farmConnectDB = farmConnectDB;