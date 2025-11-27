// seedData.js
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for seeding...');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        // Clear existing data
        await User.deleteMany();
        await Product.deleteMany();
        await Order.deleteMany();

        // Create farmers
        const farmer1 = await User.create({
            name: 'Rajesh Kumar',
            email: 'rajesh@greenfarm.com',
            password: 'password123',
            role: 'farmer',
            phone: '9876543210',
            address: {
                street: 'Farm Road, Village Green',
                city: 'Nashik',
                state: 'Maharashtra',
                zipCode: '422101',
                country: 'India'
            },
            farmName: 'Green Valley Farms'
        });

        const farmer2 = await User.create({
            name: 'Priya Sharma',
            email: 'priya@organicfarms.com',
            password: 'password123',
            role: 'farmer',
            phone: '9876543211',
            address: {
                street: 'Organic Street',
                city: 'Pune',
                state: 'Maharashtra',
                zipCode: '411001',
                country: 'India'
            },
            farmName: 'Organic Paradise'
        });

        // Create customer
        const customer = await User.create({
            name: 'Amit Patel',
            email: 'amit@gmail.com',
            password: 'password123',
            role: 'customer',
            phone: '9876543212',
            address: {
                street: 'MG Road',
                city: 'Mumbai',
                state: 'Maharashtra',
                zipCode: '400001',
                country: 'India'
            }
        });

        // Create products
        const products = await Product.create([
            {
                name: 'Fresh Alphonso Mangoes',
                description: 'Sweet and juicy alphonso mangoes, freshly harvested',
                price: 120,
                category: 'fruits',
                farmerId: farmer1._id,
                images: ['mangoes.jpg'],
                stock: 100,
                unit: 'kg',
                isAvailable: true
            },
            {
                name: 'Organic Tomatoes',
                description: 'Fresh organic tomatoes, pesticide-free',
                price: 40,
                category: 'vegetables',
                farmerId: farmer1._id,
                images: ['tomatoes.jpg'],
                stock: 50,
                unit: 'kg',
                isAvailable: true
            },
            {
                name: 'Basmati Rice',
                description: 'Premium quality basmati rice',
                price: 80,
                category: 'grains',
                farmerId: farmer2._id,
                images: ['rice.jpg'],
                stock: 200,
                unit: 'kg',
                isAvailable: true
            },
            {
                name: 'Fresh Spinach',
                description: 'Green leafy spinach, rich in iron',
                price: 25,
                category: 'vegetables',
                farmerId: farmer2._id,
                images: ['spinach.jpg'],
                stock: 30,
                unit: 'bunch',
                isAvailable: true
            },
            {
                name: 'Sweet Bananas',
                description: 'Naturally ripened bananas',
                price: 60,
                category: 'fruits',
                farmerId: farmer1._id,
                images: ['bananas.jpg'],
                stock: 75,
                unit: 'dozen',
                isAvailable: true
            }
        ]);

        console.log('Sample data created successfully!');
        console.log('Farmers created:', farmer1.email, farmer2.email);
        console.log('Customer created:', customer.email);
        console.log('Products created:', products.length);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

connectDB().then(() => {
    seedData();
});