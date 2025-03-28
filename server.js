const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const sanitizeHtml = require('sanitize-html');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'shop_user',
    password: process.env.DB_PASSWORD || 'Fd&5cb4VZ',
    database: process.env.DB_NAME || 'shopping_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // Add .promise() here if you want to use promises everywhere

// Add this right after creating the pool
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Database connected successfully');
    connection.release();
});

// Middleware
app.use(cors({
    origin: 'https://ierg4210.koreacentral.cloudapp.azure.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(__dirname)); // Serve root
app.use('/public', express.static(path.join(__dirname, 'public'))); // Serve admin.html

// CSRF Protection
const generateCsrfToken = () => crypto.randomBytes(16).toString('hex');
app.use((req, res, next) => {
    if (!req.cookies.csrfToken) {
        const token = generateCsrfToken();
        res.cookie('csrfToken', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    }
    next();
});

const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.cookies.csrfToken;
    const bodyToken = req.body.csrfToken || req.headers['x-csrf-token'];
    if (!csrfToken || !bodyToken || csrfToken !== bodyToken) {
        return res.status(403).send('CSRF token validation failed');
    }
    next();
};

// Authentication Middleware
const authenticate = (req, res, next) => {
    const authToken = req.cookies.authToken;
    if (!authToken) return res.redirect('/login.html');
    db.query('SELECT * FROM users WHERE auth_token = ?', [authToken], (err, results) => {
        if (err) {
            console.error('Auth error:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (!results.length) return res.redirect('/login.html');
        req.user = results[0];
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) return res.status(403).send('Admin access required');
    next();
};

// Escape HTML function
const escapeHtml = (text) => sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });

// Routes
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.cookies.csrfToken });
});

app.get('/user', (req, res) => {
    const authToken = req.cookies.authToken;
    if (!authToken) return res.json({ email: 'Guest', isAdmin: false });
    db.query('SELECT email, is_admin FROM users WHERE auth_token = ?', [authToken], (err, results) => {
        if (err) {
            console.error('User fetch error:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (!results.length) return res.json({ email: 'Guest', isAdmin: false });
        res.json({ email: results[0].email, isAdmin: results[0].is_admin });
    });
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, results) => {
        if (err) {
            console.error('Categories error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(results.map(row => ({ catid: row.catid, name: escapeHtml(row.name) })));
    });
});

app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.error('Products error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(results.map(row => ({
            pid: row.pid,
            catid: row.catid,
            name: escapeHtml(row.name),
            price: row.price,
            description: escapeHtml(row.description),
            image: row.image,
            thumbnail: row.thumbnail
        })));
    });
});

app.get('/products/:catid', (req, res) => {
    const sql = 'SELECT * FROM products WHERE catid = ?';
    db.query(sql, [req.params.catid], (err, results) => {
        if (err) {
            console.error('Products by catid error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(results.map(row => ({
            pid: row.pid,
            catid: row.catid,
            name: escapeHtml(row.name),
            price: row.price,
            description: escapeHtml(row.description),
            image: row.image,
            thumbnail: row.thumbnail
        })));
    });
});

app.get('/product/:pid', (req, res) => {
    const sql = 'SELECT * FROM products WHERE pid = ?';
    db.query(sql, [req.params.pid], (err, results) => {
        if (err) {
            console.error('Product error:', err);
            return res.status(500).send('Internal Server Error');
        }
        const product = results[0] || {};
        res.json({
            pid: product.pid,
            name: escapeHtml(product.name || ''),
            price: product.price || 0,
            description: escapeHtml(product.description || ''),
            image: product.image || ''
        });
    });
});

app.post('/login', validateCsrfToken, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get a connection from the pool
        const connection = await db.getConnection();
        
        try {
            // Execute query using promise interface
            const [users] = await connection.query(
                'SELECT userid, email, password, is_admin FROM users WHERE email = ?', 
                [email]
            );

            if (users.length === 0) {
                connection.release();
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = users[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (!match) {
                connection.release();
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const authToken = crypto.randomBytes(32).toString('hex');
            
            await connection.query(
                'UPDATE users SET auth_token = ? WHERE userid = ?',
                [authToken, user.userid]
            );

            connection.release();

            res.cookie('authToken', authToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 2 * 24 * 60 * 60 * 1000,
                path: '/'
            });

            res.json({ 
                role: user.is_admin ? 'admin' : 'user',
                email: user.email
            });

        } catch (err) {
            connection.release();
            console.error('Login error:', err.stack);
            res.status(500).json({ 
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? err.message : null
            });
        }
    } catch (err) {
        console.error('Connection error:', err.stack);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
});

app.post('/logout', validateCsrfToken, authenticate, (req, res) => {
    db.query('UPDATE users SET auth_token = NULL WHERE userid = ?', [req.user.userid], (err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.clearCookie('authToken');
        res.clearCookie('csrfToken');
        res.redirect('/login.html');
    });
});

app.post('/change-password', validateCsrfToken, authenticate, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).send('Invalid input: New password must be at least 8 characters');
    }

    bcrypt.compare(currentPassword, req.user.password, (err, match) => {
        if (err || !match) return res.status(401).send('Current password incorrect');
        bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
                console.error('Hash error:', err);
                return res.status(500).send('Internal Server Error');
            }
            db.query('UPDATE users SET password = ?, auth_token = NULL WHERE userid = ?', [hash, req.user.userid], (err) => {
                if (err) {
                    console.error('Password update error:', err);
                    return res.status(500).send('Internal Server Error');
                }
                res.clearCookie('authToken');
                res.clearCookie('csrfToken');
                res.redirect('/login.html');
            });
        });
    });
});

app.post('/add-product', validateCsrfToken, authenticate, isAdmin, upload.single('image'), (req, res) => {
    const { catid, name, price, description } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const sanitizedName = sanitizeHtml(name);
    const sanitizedDesc = sanitizeHtml(description);

    if (!catid || !sanitizedName || !price || !sanitizedDesc || isNaN(price) || price < 0) {
        return res.status(400).send('Invalid input');
    }

    if (imagePath) {
        sharp(req.file.path)
            .resize(200, 200)
            .toFile(`uploads/thumbnail-${req.file.filename}`, (err) => {
                if (err) {
                    console.error('Image resize error:', err);
                    return res.status(500).send('Internal Server Error');
                }
                const thumbnailPath = `/uploads/thumbnail-${req.file.filename}`;
                const sql = 'INSERT INTO products (catid, name, price, description, image, thumbnail) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(sql, [catid, sanitizedName, price, sanitizedDesc, imagePath, thumbnailPath], (err) => {
                    if (err) {
                        console.error('Add product error:', err);
                        return res.status(500).send('Internal Server Error');
                    }
                    res.send('Product added');
                });
            });
    } else {
        const sql = 'INSERT INTO products (catid, name, price, description) VALUES (?, ?, ?, ?)';
        db.query(sql, [catid, sanitizedName, price, sanitizedDesc], (err) => {
            if (err) {
                console.error('Add product error:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.send('Product added');
        });
    }
});

app.put('/update-product/:pid', validateCsrfToken, authenticate, isAdmin, upload.single('image'), (req, res) => {
    const { catid, name, price, description } = req.body;
    const pid = req.params.pid;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const sanitizedName = sanitizeHtml(name);
    const sanitizedDesc = sanitizeHtml(description);

    if (!catid || !sanitizedName || !price || !sanitizedDesc || isNaN(price) || price < 0) {
        return res.status(400).send('Invalid input');
    }

    if (imagePath) {
        sharp(req.file.path)
            .resize(200, 200)
            .toFile(`uploads/thumbnail-${req.file.filename}`, (err) => {
                if (err) {
                    console.error('Image resize error:', err);
                    return res.status(500).send('Internal Server Error');
                }
                const thumbnailPath = `/uploads/thumbnail-${req.file.filename}`;
                const sql = 'UPDATE products SET catid=?, name=?, price=?, description=?, image=?, thumbnail=? WHERE pid=?';
                db.query(sql, [catid, sanitizedName, price, sanitizedDesc, imagePath, thumbnailPath, pid], (err) => {
                    if (err) {
                        console.error('Update product error:', err);
                        return res.status(500).send('Internal Server Error');
                    }
                    res.send('Product updated');
                });
            });
    } else {
        const sql = 'UPDATE products SET catid=?, name=?, price=?, description=? WHERE pid=?';
        db.query(sql, [catid, sanitizedName, price, sanitizedDesc, pid], (err) => {
            if (err) {
                console.error('Update product error:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.send('Product updated');
        });
    }
});

app.post('/add-category', validateCsrfToken, authenticate, isAdmin, (req, res) => {
    const { name } = req.body;
    const sanitizedName = sanitizeHtml(name);
    if (!sanitizedName) return res.status(400).send('Category name required');
    db.query('INSERT INTO categories (name) VALUES (?)', [sanitizedName], (err) => {
        if (err) {
            console.error('Add category error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.send('Category added');
    });
});

app.put('/update-category/:catid', validateCsrfToken, authenticate, isAdmin, (req, res) => {
    const { name } = req.body;
    const catid = req.params.catid;
    const sanitizedName = sanitizeHtml(name);
    if (!sanitizedName) return res.status(400).send('Category name required');
    db.query('UPDATE categories SET name=? WHERE catid=?', [sanitizedName, catid], (err) => {
        if (err) {
            console.error('Update category error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.send('Category updated');
    });
});

app.delete('/delete-product/:pid', validateCsrfToken, authenticate, isAdmin, (req, res) => {
    db.query('DELETE FROM products WHERE pid = ?', [req.params.pid], (err) => {
        if (err) {
            console.error('Delete product error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.send('Product deleted');
    });
});

app.delete('/delete-category/:catid', validateCsrfToken, authenticate, isAdmin, (req, res) => {
    db.query('DELETE FROM categories WHERE catid = ?', [req.params.catid], (err) => {
        if (err) {
            console.error('Delete category error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.send('Category deleted');
    });
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).send('Internal Server Error');
});

http.createServer(app).listen(3443, '0.0.0.0', () => {
    console.log('HTTP Server running on port 3443');
});