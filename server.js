// QUEEN BELLA COLLECTION FASHION - Server Configuration
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allows base64 image payload upload
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection setup for Neon Postgres
const connectionString = process.env.DATABASE_URL;

// Corrected SSL settings for Neon PostgreSQL
const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString ? { rejectUnauthorized: false } : false
});

// Seed sample data if table is empty
async function seedDefaultProducts() {
    try {
        const checkCount = await pool.query('SELECT COUNT(*) FROM products');
        if (parseInt(checkCount.rows[0].count) === 0) {
            const defaultItems = [
                ['Uffata Amayyaa Dubartii', 'clothes', 2500, 'QUEEN BELLA Collection - Uffata bareedaa fi mijataa ta\'e kan waqtii kamiyyuu uffatamu.', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=600&q=80'],
                ['Uffata Aadaa Miidhagaa', 'clothes', 4000, 'QUEEN BELLA Collection - Uffata aadaa hojii harkaatiin bareechifame kan ayyaanaaf ta\'u.', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80'],
                ['Girdoo Mana Jireenyaa', 'curtains', 1800, 'Mana keessaniif ifa fi bareedina kennu, ruumii keessaniif mijataa.', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'],
                ['Girdoo Mana Ciisaa (Luxury Velvet)', 'curtains', 2200, 'Huccuu furdaa dukkaneessuu danda\'u, mana ciisaatiif bayyee gaarii.', 'https://images.unsplash.com/photo-1540518614846-7ede433c5173?auto=format&fit=crop&w=600&q=80']
            ];
            
            for (const item of defaultItems) {
                await pool.query(
                    'INSERT INTO products (name, category, price, description, image) VALUES ($1, $2, $3, $4, $5)',
                    item
                );
            }
            console.log('Sample products seeded into Neon database.');
        }
    } catch (err) {
        console.error('Error seeding default products:', err.message);
    }
}

// Automatically initialize database table on boot
async function initDB() {
    if (!connectionString) {
        console.warn('WARNING: DATABASE_URL environment variable is missing on Render!');
        return;
    }

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price NUMERIC(10, 2) NOT NULL,
            description TEXT,
            image TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(createTableQuery);
        console.log('PostgreSQL database table verified successfully.');
        await seedDefaultProducts();
    } catch (err) {
        console.error('Database connection / initialization error:', err.message);
    }
}

initDB();

// API ROUTES

// 1. Fetch all products from Neon DB
app.get('/api/products', async (req, res) => {
    try {
        if (!connectionString) {
            return res.status(500).json({ error: 'DATABASE_URL missing in Render environment variables.' });
        }
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Add new product to Neon DB (Admin function)
app.post('/api/products', async (req, res) => {
    const { name, category, price, desc, image } = req.body;

    if (!name || !category || !price || !image) {
        return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    try {
        const insertQuery = `
            INSERT INTO products (name, category, price, description, image)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [name, category, price, desc, image];
        const result = await pool.query(insertQuery, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding product:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Delete product from Neon DB (Admin function)
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Product deleted successfully.' });
    } catch (err) {
        console.error('Error deleting product:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend for all unmatched GET routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
