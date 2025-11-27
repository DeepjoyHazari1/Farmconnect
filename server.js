const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const smsBooking = require('./sms-booking'); // Make sure sms-booking.js exists in the same folder
const Razorpay = require('razorpay'); // npm install razorpay
const crypto = require('crypto'); // Node.js built-in
const app = express();
const PORT = 5500;

// Razorpay instance (replace with your actual Razorpay key/secret)
const razorpay = new Razorpay({
    key_id: 'your_razorpay_key',
    key_secret: 'your_razorpay_secret'
});

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/farmconnect', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully to farmconnect database');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        return false;
    }
};

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'farmer', 'admin'], default: 'customer' },
    phone: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    images: [String],
    stock: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: Date
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
    orderId: String,
    paymentId: String,
    signature: String,
    amount: Number,
    currency: String,
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    userId: String,
    bookingId: String,
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// Server-side localStorage simulation
const localStorage = {
    data: {},
    setItem: function(key, value) {
        this.data[key] = value;
    },
    getItem: function(key) {
        return this.data[key] || null;
    },
    removeItem: function(key) {
        delete this.data[key];
    }
};

// Initialize farmconnect in localStorage
if (!localStorage.getItem('farmconnect')) {
    localStorage.setItem('farmconnect', JSON.stringify({
        users: [],
        products: [],
        orders: [],
        categories: [],
        settings: {}
    }));
    console.log('💾 farmconnect localStorage initialized');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Check MongoDB connection status
app.use((req, res, next) => {
    const mongoConnected = mongoose.connection.readyState === 1;
    if (mongoConnected && req.method === 'POST') {
        console.log('🔗 MongoDB: CONNECTED - Data will be stored in MongoDB');
    }
    next();
});

// Your original routes for serving HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/machinery', (req, res) => {
    res.sendFile(path.join(__dirname, 'machinery.html'));
});

app.get('/labour', (req, res) => {
    res.sendFile(path.join(__dirname, 'labour.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// Fallback for any other HTML files
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `${page}.html`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Page not found' });
    }
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'MongoDB connected' : 'MongoDB disconnected';
    res.json({ 
        status: 'Server is running',
        database: dbStatus,
        localStorage: 'farmconnect initialized',
        timestamp: new Date().toISOString()
    });
});

// Database Info Check
app.get('/api/db-info', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const databaseName = db.databaseName;
        const collections = await db.listCollections().toArray();
        
        // Count documents in each collection
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        
        res.json({
            currentDatabase: databaseName,
            collections: collections.map(c => c.name),
            counts: {
                users: userCount,
                products: productCount,
                orders: orderCount
            },
            connection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            mongoDBStatus: mongoose.connection.readyState
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, address } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        let newUser = null;
        const useMongoDB = mongoose.connection.readyState === 1;

        if (useMongoDB) {
            console.log('🔄 Checking MongoDB for existing user...');
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            console.log('💾 Saving user to MongoDB...');
            newUser = new User({
                name,
                email,
                password,
                role: role || 'customer',
                phone,
                address,
                lastLogin: new Date()
            });
            await newUser.save();
            console.log('✅ User saved to MongoDB with ID:', newUser._id);
            
            // Save to localStorage as backup
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            farmconnect.users.push({
                id: newUser._id.toString(),
                name,
                email,
                password,
                role: role || 'customer',
                phone,
                address,
                createdAt: new Date(),
                lastLogin: new Date()
            });
            localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
        } else {
            console.log('ℹ️ MongoDB not connected, using localStorage only');
            // Save to localStorage only
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            const userId = Date.now().toString();
            
            farmconnect.users.push({
                id: userId,
                name,
                email,
                password,
                role: role || 'customer',
                phone,
                address,
                createdAt: new Date(),
                lastLogin: new Date()
            });
            localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
            newUser = { _id: userId };
        }

        res.status(201).json({ 
            message: 'User registered successfully',
            user: {
                id: newUser._id.toString(),
                name,
                email,
                role: role || 'customer'
            },
            database: useMongoDB ? 'MongoDB' : 'LocalStorage'
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        let user = null;
        const useMongoDB = mongoose.connection.readyState === 1;

        // Try MongoDB first
        if (useMongoDB) {
            console.log('🔄 Checking MongoDB for user...');
            user = await User.findOne({ email });
            if (user && user.password === password) {
                user.lastLogin = new Date();
                await user.save();
                console.log('✅ User login via MongoDB:', user.email);
            } else {
                user = null;
            }
        }

        // If not found in MongoDB, check localStorage
        if (!user) {
            console.log('🔄 Checking localStorage for user...');
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            user = farmconnect.users.find(u => u.email === email && u.password === password);
            
            if (user) {
                user.lastLogin = new Date().toISOString();
                localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
                console.log('ℹ️ User login via LocalStorage:', user.email);
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ 
            message: 'Login successful',
            user: {
                id: user._id || user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            database: useMongoDB ? 'MongoDB' : 'LocalStorage'
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Add Product
app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, category, farmerId, stock, unit } = req.body;
        
        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Name, price, and category are required' });
        }

        let newProduct = null;
        const useMongoDB = mongoose.connection.readyState === 1;

        if (useMongoDB) {
            console.log('💾 Saving product to MongoDB...');
            newProduct = new Product({
                name,
                description,
                price,
                category,
                farmerId: farmerId || null,
                stock: stock || 0,
                unit: unit || 'kg',
                isAvailable: true
            });
            await newProduct.save();
            console.log('✅ Product saved to MongoDB with ID:', newProduct._id);
            
            // Save to localStorage as backup
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            farmconnect.products.push({
                id: newProduct._id.toString(),
                name,
                description,
                price,
                category,
                farmerId: farmerId || null,
                stock: stock || 0,
                unit: unit || 'kg',
                isAvailable: true,
                createdAt: new Date()
            });
            localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
        } else {
            console.log('ℹ️ MongoDB not connected, using localStorage only');
            // Save to localStorage only
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            const productId = Date.now().toString();
            
            farmconnect.products.push({
                id: productId,
                name,
                description,
                price,
                category,
                farmerId: farmerId || null,
                stock: stock || 0,
                unit: unit || 'kg',
                isAvailable: true,
                createdAt: new Date()
            });
            localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
            newProduct = { _id: productId };
        }

        res.status(201).json({ 
            message: 'Product added successfully',
            product: {
                id: newProduct._id.toString(),
                name,
                description,
                price,
                category,
                stock: stock || 0,
                unit: unit || 'kg',
                isAvailable: true
            },
            database: useMongoDB ? 'MongoDB' : 'LocalStorage'
        });
    } catch (error) {
        console.error('❌ Product creation error:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

const csvPath = path.join(__dirname, 'orders.csv');
const jsonPath = path.join(__dirname, 'orders.json');

// Ensure orders.csv and orders.json exist and are initialized
function ensureOrderFiles() {
    if (!fs.existsSync(csvPath) || fs.readFileSync(csvPath, 'utf8').trim() === '') {
        const csvHeader = [
            'customer_fullName', 'customer_email', 'customer_phone', 'customer_address',
            'item_id', 'item_name', 'item_price', 'item_type', 'quantity',
            'orderDate', 'orderId', 'payment_method', 'payment_amount', 'status', 'total'
        ].join(',') + '\n';
        fs.writeFileSync(csvPath, csvHeader, 'utf8');
        console.log('orders.csv initialized');
    }
    if (!fs.existsSync(jsonPath) || fs.readFileSync(jsonPath, 'utf8').trim() === '') {
        fs.writeFileSync(jsonPath, '[]', 'utf8');
        console.log('orders.json initialized');
    }
}
ensureOrderFiles();

// Helper to append order to CSV
function appendOrderToCSV(order) {
    try {
        ensureOrderFiles();
        const isNewFile = !fs.existsSync(csvPath);
        const fields = [
            'customer_fullName', 'customer_email', 'customer_phone', 'customer_address',
            'item_id', 'item_name', 'item_price', 'item_type', 'quantity',
            'orderDate', 'orderId', 'payment_method', 'payment_amount', 'status', 'total'
        ];
        let csvLine = '';
        if (isNewFile) {
            csvLine += fields.join(',') + '\n';
        }
        order.items.forEach(item => {
            const row = [
                order.customer_fullName || '',
                order.customer_email || '',
                order.customer_phone || '',
                order.customer_address || '',
                item.id || item.productId || '',
                item.name || '',
                item.price || '',
                item.type || '',
                item.quantity || 1,
                order.orderDate || '',
                item.orderId || order.orderId || '',
                order.payment_method || '',
                order.payment_amount || '',
                order.status || '',
                order.total || ''
            ];
            csvLine += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        fs.appendFileSync(csvPath, csvLine, 'utf8');
        console.log('Order appended to orders.csv');
    } catch (err) {
        console.error('Failed to write to orders.csv:', err);
    }
}

// Helper to append order to JSON
function appendOrderToJSON(order) {
    try {
        ensureOrderFiles();
        let orders = [];
        if (fs.existsSync(jsonPath)) {
            try {
                orders = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) || [];
            } catch (e) {
                orders = [];
            }
        }
        order.items.forEach(item => {
            orders.push({
                customer_fullName: order.customer_fullName || '',
                customer_email: order.customer_email || '',
                customer_phone: order.customer_phone || '',
                customer_address: order.customer_address || '',
                item_id: item.id || item.productId || '',
                item_name: item.name || '',
                item_price: item.price || '',
                item_type: item.type || '',
                quantity: item.quantity || 1,
                orderDate: order.orderDate || '',
                orderId: item.orderId || order.orderId || '',
                payment_method: order.payment_method || '',
                payment_amount: order.payment_amount || '',
                status: order.status || '',
                total: order.total || ''
            });
        });
        fs.writeFileSync(jsonPath, JSON.stringify(orders, null, 2), 'utf8');
        console.log('Order appended to orders.json');
    } catch (err) {
        console.error('Failed to write to orders.json:', err);
    }
}

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        const { customerId, customer, items, totalAmount, total, shippingAddress, payment } = req.body;

        // Accept order if either customerId or customer object is present
        const finalTotalAmount = typeof totalAmount !== 'undefined' ? totalAmount : total;
        if ((!customerId && !customer) || !items || !finalTotalAmount) {
            return res.status(400).json({ error: 'Customer info, items, and total amount are required' });
        }

        let newOrder = null;
        const useMongoDB = mongoose.connection.readyState === 1;

        // --- Fetch customer info for export ---
        let customerInfo = {};
        if (customerId && useMongoDB) {
            const userDoc = await User.findById(customerId);
            if (userDoc) {
                customerInfo = {
                    fullName: userDoc.name,
                    email: userDoc.email,
                    phone: userDoc.phone,
                    address: [
                        userDoc.address?.street,
                        userDoc.address?.city,
                        userDoc.address?.state,
                        userDoc.address?.zipCode
                    ].filter(Boolean).join(', ')
                };
            }
        } else if (customer) {
            customerInfo = {
                fullName: customer.fullName || customer.fullname || '',
                email: customer.email || '',
                phone: customer.phone || '',
                address: typeof customer.address === 'string'
                    ? customer.address
                    : [
                        customer.address?.street,
                        customer.address?.city,
                        customer.address?.state,
                        customer.address?.zipCode
                    ].filter(Boolean).join(', ')
            };
        }

        // --- Fix for MongoDB/localStorage save: always use address object ---
        let shippingAddrObj = shippingAddress;
        if (!shippingAddrObj && customerInfo.address) {
            // If address is a string, put it in street
            shippingAddrObj = { street: customerInfo.address };
        }

        if (useMongoDB && customerId) {
            console.log('💾 Saving order to MongoDB...');
            
            // Convert string IDs to MongoDB ObjectId
            const orderItems = items.map(item => ({
                productId: new mongoose.Types.ObjectId(item.productId),
                quantity: item.quantity,
                price: item.price
            }));

            newOrder = new Order({
                customerId: new mongoose.Types.ObjectId(customerId),
                items: orderItems,
                totalAmount: totalAmount,
                shippingAddress: shippingAddrObj || {},
                status: 'pending',
                paymentStatus: 'pending',
                orderDate: new Date()
            });
            
            await newOrder.save();
            console.log('✅ Order saved to MongoDB with ID:', newOrder._id);
            
            // Save to localStorage as backup
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            farmconnect.orders.push({
                id: newOrder._id.toString(),
                customerId: customerId,
                items: items,
                totalAmount: totalAmount,
                shippingAddress: shippingAddrObj || {},
                status: 'pending',
                paymentStatus: 'pending',
                orderDate: new Date()
            });
            localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
        } else {
            console.log('ℹ️ MongoDB not connected, using localStorage only');
            // Save to localStorage only
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            const orderId = Date.now().toString();
            
            farmconnect.orders.push({
                id: orderId,
                customerId: customerId,
                items: items,
                totalAmount: totalAmount,
                shippingAddress: shippingAddrObj || {},
                status: 'pending',
                paymentStatus: 'pending',
                orderDate: new Date()
            });
            localStorage.setItem('farmconnect', JSON.stringify(farmconnect));
            newOrder = { _id: orderId };
        }

        // --- Always export each item as a separate order in CSV/JSON ---
        const now = new Date();
        const orderIdBase = 'FC' + now.getTime();
        const exportOrder = {
            customer_fullName: customerInfo.fullName || '',
            customer_email: customerInfo.email || '',
            customer_phone: customerInfo.phone || '',
            customer_address: customerInfo.address || '',
            items: items.map((item, idx) => ({
                ...item,
                orderId: orderIdBase + '-' + (idx + 1)
            })),
            orderDate: now.toISOString(),
            orderId: orderIdBase,
            payment_method: payment?.method || '',
            payment_amount: payment?.amount || '',
            status: 'confirmed',
            total: finalTotalAmount,
            payment: payment || {}
        };

        appendOrderToCSV(exportOrder);
        appendOrderToJSON(exportOrder);

        res.status(201).json({ 
            message: 'Order created successfully',
            order: {
                customer: customerInfo,
                items: items,
                totalAmount: finalTotalAmount,
                status: 'confirmed',
                paymentStatus: 'pending',
                orderDate: now
            },
            database: useMongoDB ? 'MongoDB' : 'LocalStorage'
        });
    } catch (error) {
        console.error('❌ Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order: ' + error.message });
    }
});

// Payment: Create Razorpay Order
app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount, currency, receipt, userId, bookingId } = req.body;
        const options = {
            amount: amount * 100, // in paise
            currency: currency || 'INR',
            receipt: receipt,
            payment_capture: 1
        };
        const order = await razorpay.orders.create(options);

        // Store payment order in DB
        await Payment.create({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            userId,
            bookingId
        });

        res.json({ order, key_id: razorpay.key_id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create payment order', details: err.message });
    }
});

// Payment: Verify Razorpay Signature
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { paymentId, orderId, signature, userId, bookingId } = req.body;
        const payment = await Payment.findOne({ orderId });

        // Verify signature
        const generatedSignature = crypto.createHmac('sha256', razorpay.key_secret)
            .update(orderId + "|" + paymentId)
            .digest('hex');

        if (generatedSignature === signature) {
            // Update payment record
            payment.paymentId = paymentId;
            payment.signature = signature;
            payment.status = 'paid';
            await payment.save();

            // Update booking/order status (implement your logic here)
            // Example: Order.updateOne({ _id: bookingId }, { status: 'confirmed', paymentStatus: 'paid' });

            // Send notification (stub)
            // sendPaymentConfirmation(userId, bookingId, paymentId);

            res.json({ verified: true, message: 'Payment successful' });
        } else {
            payment.status = 'failed';
            await payment.save();
            res.status(400).json({ verified: false, message: 'Payment verification failed' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Payment verification error', details: err.message });
    }
});

// SMS Booking API
app.post('/api/sms-booking', (req, res) => {
    const { smsText, phoneNumber } = req.body;
    if (!smsText || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'smsText and phoneNumber required' });
    }
    const result = smsBooking.handleSMSBooking(smsText, phoneNumber);
    res.json(result);
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        let users = [];
        const useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            console.log('📥 Fetching users from MongoDB...');
            users = await User.find().select('-password');
        } else {
            console.log('📥 Fetching users from localStorage...');
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            users = farmconnect.users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
        }
        
        res.json({
            users: users,
            database: useMongoDB ? 'MongoDB' : 'LocalStorage',
            count: users.length
        });
    } catch (error) {
        console.error('❌ Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        let products = [];
        const useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            console.log('📥 Fetching products from MongoDB...');
            products = await Product.find().populate('farmerId', 'name email');
        } else {
            console.log('📥 Fetching products from localStorage...');
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            products = farmconnect.products;
        }
        
        res.json({
            products: products,
            database: useMongoDB ? 'MongoDB' : 'LocalStorage',
            count: products.length
        });
    } catch (error) {
        console.error('❌ Products fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        let orders = [];
        const useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            console.log('📥 Fetching orders from MongoDB...');
            orders = await Order.find()
                .populate('customerId', 'name email')
                .populate('items.productId', 'name price');
        } else {
            console.log('📥 Fetching orders from localStorage...');
            const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
            orders = farmconnect.orders;
        }
        
        res.json({
            orders: orders,
            database: useMongoDB ? 'MongoDB' : 'LocalStorage',
            count: orders.length
        });
    } catch (error) {
        console.error('❌ Orders fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// --- Bookings (placeholder, extend with real model if needed) ---
app.get('/api/bookings', async (req, res) => {
    res.json({ bookings: [] });
});

// --- Favorites (placeholder, extend with real model if needed) ---
app.get('/api/favorites', async (req, res) => {
    res.json({ favorites: [] });
});

// --- Profile (GET/POST for profile section) ---
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
app.post('/api/profile/:userId', async (req, res) => {
    try {
        const update = req.body;
        delete update.password; // Don't allow password change here
        const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user, message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// --- Payment Methods (placeholder, extend with real model if needed) ---
app.get('/api/payment-methods', async (req, res) => {
    res.json({ methods: [] });
});

// --- Notifications (placeholder, extend with real model if needed) ---
app.get('/api/notifications', async (req, res) => {
    res.json({ notifications: [] });
});

// Get farmconnect data (for debugging)
app.get('/api/farmconnect', (req, res) => {
    const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
    res.json({
        users: farmconnect.users.length,
        products: farmconnect.products.length,
        orders: farmconnect.orders.length,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Location-based search API
app.get('/api/nearby', async (req, res) => {
    const { lat, lng, location } = req.query;
    let items = [];
    // Example: search machinery by location
    if (lat && lng) {
        // MongoDB: Find machinery within 50km radius
        // For demo, filter localStorage machinery by city/pincode
        const allMachinery = JSON.parse(localStorage.getItem('farmconnect')).products || [];
        items = allMachinery.filter(m => m.location && m.location.lat && m.location.lng)
            .map(m => {
                m.distance = calculateDistance(lat, lng, m.location.lat, m.location.lng);
                return m;
            })
            .filter(m => m.distance <= 50);
    } else if (location) {
        // Filter by city/pincode
        const allMachinery = JSON.parse(localStorage.getItem('farmconnect')).products || [];
        items = allMachinery.filter(m =>
            m.location?.city?.toLowerCase().includes(location.toLowerCase()) ||
            m.location?.pincode === location
        );
    }
    res.json({ items });
});

// Helper for backend distance calculation
function calculateDistance(lat1, lng1, lat2, lng2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server only after checking MongoDB connection
const startServer = async () => {
    const mongoConnected = await connectDB();

    app.listen(PORT, () => {
        console.log(`\n🚀 FarmConnect server running at http://localhost:${PORT}`);
        console.log(`📊 Database: ${mongoConnected ? 'MongoDB connected' : 'Using localStorage only'}`);
        console.log(`💾 LocalStorage: farmconnect data structure ready`);
        
        console.log(`\n📋 Available Pages:`);
        console.log(`- Home: http://localhost:${PORT}/`);
        console.log(`- Dashboard: http://localhost:${PORT}/dashboard`);
        console.log(`- Machinery: http://localhost:${PORT}/machinery`);
        console.log(`- Labour: http://localhost:${PORT}/labour`);
        console.log(`- Login: http://localhost:${PORT}/login`);
        console.log(`- Register: http://localhost:${PORT}/register`);
        
        console.log(`\n🔗 API Endpoints:`);
        console.log(`- Health Check: http://localhost:${PORT}/api/health`);
        console.log(`- Database Info: http://localhost:${PORT}/api/db-info`);
        console.log(`- Register: POST http://localhost:${PORT}/api/register`);
        console.log(`- Login: POST http://localhost:${PORT}/api/login`);
        
        // Log actual database name
        if (mongoConnected) {
            console.log(`🗄️ Connected to database: ${mongoose.connection.db.databaseName}`);
        }
    });
};

startServer();
module.exports = app;

// ==================== BOOKING CALENDAR & AVAILABILITY ====================

// Enhanced Booking Schema with Date Ranges
const bookingSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    machineryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machinery', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machinery', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: Number, required: true }, // in days
    pickupTime: String,
    returnTime: String,
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    specialRequirements: String,
    orderDate: { type: Date, default: Date.now },
    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date
});
const Booking = mongoose.model('Booking', bookingSchema);

// Machinery Availability Schema
const availabilitySchema = new mongoose.Schema({
    machineryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machinery', required: true },
    date: { type: Date, required: true },
    availableQuantity: { type: Number, default: 1 },
    totalQuantity: { type: Number, required: true },
    bookings: [{
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
        quantity: Number
    }]
});
const Availability = mongoose.model('Availability', availabilitySchema);

// Machinery Schema Enhancement
const machinerySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    priceType: { type: String, enum: ['per_day', 'per_hour', 'per_week'], default: 'per_day' },
    category: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    images: [String],
    totalStock: { type: Number, default: 1 },
    availableStock: { type: Number, default: 1 },
    minBookingDays: { type: Number, default: 1 },
    maxBookingDays: { type: Number, default: 30 },
    advanceBookingDays: { type: Number, default: 60 },
    isAvailable: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceUntil: Date,
    location: {
        address: String,
        city: String,
        state: String,
        coordinates: { lat: Number, lng: Number }
    },
    specifications: Map,
    features: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Machinery = mongoose.model('Machinery', machinerySchema);

// ==================== CALENDAR & AVAILABILITY API ROUTES ====================

// Check Availability for Date Range
app.get('/api/availability/check', async (req, res) => {
    try {
        const { machineryId, startDate, endDate, quantity = 1 } = req.query;
        if (!machineryId || !startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Machinery ID, start date, and end date are required' });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const machinery = await Machinery.findById(machineryId);
        if (!machinery) return res.status(404).json({ success: false, error: 'Machinery not found' });
        if (!machinery.isAvailable || machinery.maintenanceMode) {
            return res.json({ available: false, reason: machinery.maintenanceMode ? 'Under maintenance' : 'Not available' });
        }
        const conflictingBookings = await Booking.find({
            machineryId: machineryId,
            status: { $in: ['confirmed', 'ongoing'] },
            $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
        });
        const availabilityReport = await generateAvailabilityReport(machineryId, start, end);
        const isAvailable = availabilityReport.isAvailable && availabilityReport.minAvailableQuantity >= quantity;
        res.json({
            available: isAvailable,
            machinery: {
                id: machinery._id,
                name: machinery.name,
                price: machinery.price,
                priceType: machinery.priceType,
                totalStock: machinery.totalStock
            },
            availability: availabilityReport,
            conflictingBookings: conflictingBookings.length,
            duration: calculateDuration(start, end),
            totalPrice: calculateTotalPrice(machinery.price, start, end, machinery.priceType)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Availability check failed: ' + error.message });
    }
});

// Get Monthly Availability Calendar
app.get('/api/availability/calendar/:machineryId', async (req, res) => {
    try {
        const { machineryId } = req.params;
        const { year, month } = req.query;
        const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        const machinery = await Machinery.findById(machineryId);
        if (!machinery) return res.status(404).json({ success: false, error: 'Machinery not found' });
        const calendar = await generateMonthlyCalendar(machineryId, startOfMonth, endOfMonth);
        res.json({
            success: true,
            machinery: { id: machinery._id, name: machinery.name, totalStock: machinery.totalStock },
            calendar: calendar,
            month: targetDate.toLocaleString('default', { month: 'long', year: 'numeric' })
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Calendar generation failed: ' + error.message });
    }
});

// Create Booking with Date Range
app.post('/api/bookings/create', async (req, res) => {
    try {
        const { customerId, machineryId, startDate, endDate, quantity = 1, deliveryAddress, specialRequirements } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (start < today) return res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
        if (end <= start) return res.status(400).json({ success: false, error: 'End date must be after start date' });
        const machinery = await Machinery.findById(machineryId);
        if (!machinery) return res.status(404).json({ success: false, error: 'Machinery not found' });
        const availabilityCheck = await checkAvailability(machineryId, start, end, quantity);
        if (!availabilityCheck.available) return res.status(400).json({ success: false, error: 'Machinery not available for selected dates' });
        const duration = calculateDuration(start, end);
        const totalAmount = calculateTotalPrice(machinery.price, start, end, machinery.priceType) * quantity;
        const booking = new Booking({
            customerId,
            machineryId,
            items: [{ productId: machineryId, quantity: quantity, price: machinery.price }],
            totalAmount,
            status: 'pending',
            paymentStatus: 'pending',
            startDate: start,
            endDate: end,
            duration: duration,
            deliveryAddress,
            specialRequirements
        });
        await booking.save();
        await updateAvailability(machineryId, booking._id, start, end, quantity);
        res.status(201).json({
            success: true,
            booking: {
                id: booking._id,
                machinery: machinery.name,
                startDate: booking.startDate,
                endDate: booking.endDate,
                duration: booking.duration,
                totalAmount: booking.totalAmount,
                status: booking.status
            },
            message: 'Booking created successfully. Please complete payment to confirm.'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Booking creation failed: ' + error.message });
    }
});

// Get Bookings for Machinery
app.get('/api/bookings/machinery/:machineryId', async (req, res) => {
    try {
        const { machineryId } = req.params;
        const { startDate, endDate } = req.query;
        let query = { machineryId: machineryId, status: { $in: ['confirmed', 'ongoing'] } };
        if (startDate && endDate) {
            query.$or = [{ startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }];
        }
        const bookings = await Booking.find(query)
            .populate('customerId', 'name email phone')
            .sort({ startDate: 1 });
        res.json({
            success: true,
            bookings: bookings.map(booking => ({
                id: booking._id,
                customer: booking.customerId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                duration: booking.duration
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bookings: ' + error.message });
    }
});

// Update Booking Status
app.put('/api/bookings/:bookingId/status', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;
        const validStatuses = ['confirmed', 'ongoing', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
        booking.status = status;
        if (status === 'confirmed') booking.confirmedAt = new Date();
        else if (status === 'completed') booking.completedAt = new Date();
        else if (status === 'cancelled') {
            booking.cancelledAt = new Date();
            await freeUpAvailability(booking.machineryId, booking.startDate, booking.endDate);
        }
        await booking.save();
        res.json({
            success: true,
            booking: { id: booking._id, status: booking.status, updatedAt: booking.updatedAt },
            message: `Booking ${status} successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Status update failed: ' + error.message });
    }
});

// ==================== CALENDAR HELPER FUNCTIONS ====================

async function generateMonthlyCalendar(machineryId, startOfMonth, endOfMonth) {
    const calendar = [];
    const currentDate = new Date(startOfMonth);
    const bookings = await Booking.find({
        machineryId: machineryId,
        status: { $in: ['confirmed', 'ongoing'] },
        startDate: { $lte: endOfMonth },
        endDate: { $gte: startOfMonth }
    });
    while (currentDate <= endOfMonth) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = bookings.filter(booking =>
            currentDate >= booking.startDate && currentDate <= booking.endDate
        );
        const available = dayBookings.length === 0;
        calendar.push({
            date: new Date(currentDate),
            dateStr: dateStr,
            available: available,
            bookings: dayBookings.length,
            isToday: isToday(currentDate),
            isPast: currentDate < new Date().setHours(0, 0, 0, 0)
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return calendar;
}

async function checkAvailability(machineryId, startDate, endDate, quantity = 1) {
    const machinery = await Machinery.findById(machineryId);
    if (!machinery.isAvailable || machinery.maintenanceMode) {
        return { available: false, reason: 'Machinery not available' };
    }
    const conflictingBookings = await Booking.find({
        machineryId: machineryId,
        status: { $in: ['confirmed', 'ongoing'] },
        $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }]
    });
    const isAvailable = conflictingBookings.length === 0;
    return {
        available: isAvailable,
        conflictingBookings: conflictingBookings.length,
        availableQuantity: isAvailable ? machinery.totalStock : 0,
        reason: isAvailable ? null : 'Already booked for selected dates'
    };
}

async function generateAvailabilityReport(machineryId, startDate, endDate) {
    const report = {
        isAvailable: true,
        days: [],
        minAvailableQuantity: Number.MAX_SAFE_INTEGER,
        unavailableDates: []
    };
    const currentDate = new Date(startDate);
    const machinery = await Machinery.findById(machineryId);
    const bookings = await Booking.find({
        machineryId: machineryId,
        status: { $in: ['confirmed', 'ongoing'] },
        $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }]
    });
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = bookings.filter(booking =>
            currentDate >= booking.startDate && currentDate <= booking.endDate
        );
        const availableQuantity = machinery.totalStock - dayBookings.length;
        const isAvailable = availableQuantity > 0;
        report.days.push({
            date: new Date(currentDate),
            dateStr: dateStr,
            available: isAvailable,
            availableQuantity: availableQuantity,
            bookings: dayBookings.length
        });
        if (!isAvailable) {
            report.isAvailable = false;
            report.unavailableDates.push(dateStr);
        }
        if (availableQuantity < report.minAvailableQuantity) {
            report.minAvailableQuantity = availableQuantity;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return report;
}

async function updateAvailability(machineryId, bookingId, startDate, endDate, quantity) {
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        let availability = await Availability.findOne({
            machineryId: machineryId,
            date: currentDate
        });
        if (!availability) {
            const machinery = await Machinery.findById(machineryId);
            availability = new Availability({
                machineryId: machineryId,
                date: new Date(currentDate),
                availableQuantity: machinery.totalStock - quantity,
                totalQuantity: machinery.totalStock,
                bookings: [{ bookingId: bookingId, quantity: quantity }]
            });
        } else {
            availability.availableQuantity -= quantity;
            availability.bookings.push({ bookingId: bookingId, quantity: quantity });
        }
        await availability.save();
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

async function freeUpAvailability(machineryId, startDate, endDate) {
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const availability = await Availability.findOne({
            machineryId: machineryId,
            date: currentDate
        });
        if (availability) {
            availability.availableQuantity += 1; // Simplified
            await availability.save();
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

function calculateDuration(startDate, endDate) {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function calculateTotalPrice(pricePerDay, startDate, endDate, priceType) {
    const duration = calculateDuration(startDate, endDate);
    switch (priceType) {
        case 'per_hour': return pricePerDay * duration * 8;
        case 'per_week': return pricePerDay * Math.ceil(duration / 7);
        default: return pricePerDay * duration;
    }
}

function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isPast(date) {
    return date < new Date().setHours(0, 0, 0, 0);
}

// ==================== LABOUR CALENDAR & AVAILABILITY ====================

// Labour Schema
const labourSchema = new mongoose.Schema({
    name: { type: String, required: true },
    skills: [String],
    experience: { type: Number, default: 0 },
    dailyRate: { type: Number, required: true },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    totalSlots: { type: Number, default: 1 },
    availableSlots: { type: Number, default: 1 },
    isAvailable: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceUntil: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Labour = mongoose.model('Labour', labourSchema);

// Labour Availability Schema
const labourAvailabilitySchema = new mongoose.Schema({
    labourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Labour', required: true },
    date: { type: Date, required: true },
    availableSlots: { type: Number, default: 1 },
    totalSlots: { type: Number, required: true },
    bookings: [{
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourBooking' },
        slots: Number
    }]
});
const LabourAvailability = mongoose.model('LabourAvailability', labourAvailabilitySchema);

// Labour Booking Schema
const labourBookingSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    labourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Labour', required: true },
    slots: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: Number, required: true },
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    specialRequirements: String,
    orderDate: { type: Date, default: Date.now },
    confirmedAt: Date,
    completedAt: Date
});
const LabourBooking = mongoose.model('LabourBooking', labourBookingSchema);

// Admin: Get all data from both MongoDB and localStorage
app.get('/api/admin/all-data', async (req, res) => {
    let mongoUsers = [], mongoProducts = [], mongoOrders = [];
    let localUsers = [], localProducts = [], localOrders = [];
    try {
        // MongoDB data
        if (mongoose.connection.readyState === 1) {
            mongoUsers = await User.find().select('-password');
            mongoProducts = await Product.find();
            mongoOrders = await Order.find();
        }
        // LocalStorage data
        const farmconnect = JSON.parse(localStorage.getItem('farmconnect'));
        localUsers = farmconnect.users || [];
        localProducts = farmconnect.products || [];
        localOrders = farmconnect.orders || [];
        res.json({
            mongo: {
                users: mongoUsers,
                products: mongoProducts,
                orders: mongoOrders
            },
            local: {
                users: localUsers,
                products: localProducts,
                orders: localOrders
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all admin data', details: error.message });
    }
});