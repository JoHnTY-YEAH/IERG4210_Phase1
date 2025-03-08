const express = require('express');
const mysql = require('mysql2/promise');
const fileUpload = require('express-fileupload');
const sharp = require('sharp');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public'));

// MySQL Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'shop_user',
    password: 'Fd&5cb4VZ',
    database: 'shopping_db'
});

// Routes for Main Page
app.get('/categories', async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM categories');
    res.json(rows);
});

app.get('/products', async (req, res) => {
    const catid = req.query.catid;
    const [rows] = await db.execute('SELECT * FROM products WHERE catid = ?', [catid]);
    res.json(rows);
});

app.get('/product', async (req, res) => {
    const { pid } = req.query;
    const [rows] = await db.execute('SELECT * FROM products WHERE pid = ?', [pid]);
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).send('Product not found');
});

// Admin Routes
app.get('/admin/categories', async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM categories');
    res.json(rows);
});

app.post('/admin/add-product', async (req, res) => {
    const { pid, catid, name, price, description } = req.body;
    const image = req.files?.image;

    // Server-side validation
    if (!name || !price || !description || !catid) return res.status(400).send('All fields are required');
    if (isNaN(price) || price <= 0) return res.status(400).send('Invalid price');
    if (!pid && (!image || image.size > 10 * 1024 * 1024)) {
        return res.status(400).send('Image required for new products, max 10MB');
    }

    const fileExt = image ? path.extname(image.name) : '';
    const fileName = pid ? `prod_${pid}` : `prod_${Date.now()}`;
    const thumbPath = image ? `public/images/thumb_${fileName}${fileExt}` : null;
    const largePath = image ? `public/images/large_${fileName}${fileExt}` : null;

    try {
        if (pid) {
            const [existing] = await db.execute('SELECT image_thumbnail, image_large FROM products WHERE pid = ?', [pid]);
            const updateFields = [catid, name, price, description];
            if (image) {
                await sharp(image.data).resize(100, 100).toFile(thumbPath);
                await sharp(image.data).resize(500, 500).toFile(largePath);
                updateFields.push(thumbPath.replace('public/', ''), largePath.replace('public/', ''));
            } else {
                updateFields.push(existing[0].image_thumbnail, existing[0].image_large);
            }
            updateFields.push(pid);
            await db.execute(
                'UPDATE products SET catid=?, name=?, price=?, description=?, image_thumbnail=?, image_large=? WHERE pid=?',
                updateFields
            );
        } else {
            await sharp(image.data).resize(100, 100).toFile(thumbPath);
            await sharp(image.data).resize(500, 500).toFile(largePath);
            await db.execute(
                'INSERT INTO products (catid, name, price, description, image_thumbnail, image_large) VALUES (?, ?, ?, ?, ?, ?)',
                [catid, name, price, description, thumbPath.replace('public/', ''), largePath.replace('public/', '')]
            );
        }
        res.redirect('/admin.html');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/admin/delete-product', async (req, res) => {
    const { pid } = req.body;
    try {
        await db.execute('DELETE FROM products WHERE pid = ?', [pid]);
        res.redirect('/admin.html');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/admin/add-category', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).send('Name is required');
    try {
        await db.execute('INSERT INTO categories (name) VALUES (?)', [name]);
        res.redirect('/admin.html');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/admin/delete-category', async (req, res) => {
    const { catid } = req.body;
    try {
        await db.execute('DELETE FROM categories WHERE catid = ?', [catid]);
        res.redirect('/admin.html');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));