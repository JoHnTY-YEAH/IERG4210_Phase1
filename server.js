const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Enable CORS
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'shop_user',
    password: process.env.DB_PASSWORD || 'Fd&5cb4VZ',
    database: process.env.DB_NAME || 'shopping_db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); // Serve root directory for images, uploads, etc.

// Serve index.html explicitly
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get all categories
app.get('/categories', (req, res) => {
    const sql = 'SELECT * FROM categories';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Get all products
app.get('/products', (req, res) => {
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Get products by category ID
app.get('/products/:catid', (req, res) => {
    const catid = req.params.catid;
    const sql = 'SELECT * FROM products WHERE catid = ?';
    db.query(sql, [catid], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Get single product by ID
app.get('/product/:pid', (req, res) => {
    const pid = req.params.pid;
    const sql = 'SELECT * FROM products WHERE pid = ?';
    db.query(sql, [pid], (err, results) => {
        if (err) throw err;
        res.json(results[0] || {});
    });
});

// Add a new product with validation
app.post('/add-product', upload.single('image'), (req, res) => {
    const { catid, name, price, description } = req.body;
    const imagePath = req.file ? req.file.path : null;

    // Server-side validation
    if (!catid || !name || !price || !description || isNaN(price) || price < 0) {
        return res.status(400).send('Invalid input: All fields are required and price must be a non-negative number');
    }
    if (imagePath && req.file.size > 10 * 1024 * 1024) {
        return res.status(400).send('Image size exceeds 10MB');
    }

    if (imagePath) {
        sharp(imagePath)
            .resize(200, 200)
            .toFile(`uploads/thumbnail-${req.file.filename}`, (err) => {
                if (err) throw err;
                const thumbnailPath = `uploads/thumbnail-${req.file.filename}`;
                const sql = 'INSERT INTO products (catid, name, price, description, image, thumbnail) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(sql, [catid, name, price, description, imagePath, thumbnailPath], (err) => {
                    if (err) throw err;
                    res.send('Product added');
                });
            });
    } else {
        const sql = 'INSERT INTO products (catid, name, price, description) VALUES (?, ?, ?, ?)';
        db.query(sql, [catid, name, price, description], (err) => {
            if (err) throw err;
            res.send('Product added');
        });
    }
});

// Update a product
app.put('/update-product/:pid', upload.single('image'), (req, res) => {
    const { catid, name, price, description } = req.body;
    const pid = req.params.pid;
    const imagePath = req.file ? req.file.path : null;

    // Server-side validation
    if (!catid || !name || !price || !description || isNaN(price) || price < 0) {
        return res.status(400).send('Invalid input: All fields are required and price must be a non-negative number');
    }
    if (imagePath && req.file.size > 10 * 1024 * 1024) {
        return res.status(400).send('Image size exceeds 10MB');
    }

    if (imagePath) {
        sharp(imagePath)
            .resize(200, 200)
            .toFile(`uploads/thumbnail-${req.file.filename}`, (err) => {
                if (err) throw err;
                const thumbnailPath = `uploads/thumbnail-${req.file.filename}`;
                const sql = 'UPDATE products SET catid=?, name=?, price=?, description=?, image=?, thumbnail=? WHERE pid=?';
                db.query(sql, [catid, name, price, description, imagePath, thumbnailPath, pid], (err) => {
                    if (err) throw err;
                    res.send('Product updated');
                });
            });
    } else {
        const sql = 'UPDATE products SET catid=?, name=?, price=?, description=? WHERE pid=?';
        db.query(sql, [catid, name, price, description, pid], (err) => {
            if (err) throw err;
            res.send('Product updated');
        });
    }
});

// Add a new category
app.post('/add-category', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).send('Category name is required');
    }
    const sql = 'INSERT INTO categories (name) VALUES (?)';
    db.query(sql, [name], (err) => {
        if (err) throw err;
        res.send('Category added');
    });
});

// Update a category
app.put('/update-category/:catid', (req, res) => {
    const { name } = req.body;
    const catid = req.params.catid;
    if (!name) {
        return res.status(400).send('Category name is required');
    }
    const sql = 'UPDATE categories SET name=? WHERE catid=?';
    db.query(sql, [name, catid], (err) => {
        if (err) throw err;
        res.send('Category updated');
    });
});

// Delete a product
app.delete('/delete-product/:pid', (req, res) => {
    const pid = req.params.pid;
    const sql = 'DELETE FROM products WHERE pid = ?';
    db.query(sql, [pid], (err) => {
        if (err) throw err;
        res.send('Product deleted');
    });
});

// Delete a category
app.delete('/delete-category/:catid', (req, res) => {
    const catid = req.params.catid;
    const sql = 'DELETE FROM categories WHERE catid = ?';
    db.query(sql, [catid], (err) => {
        if (err) throw err;
        res.send('Category deleted');
    });
});

// Start server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});