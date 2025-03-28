const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const dotenv = require('dotenv');
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const https = require('https');
const http = require('http'); // Added for HTTP redirect
const fs = require('fs');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

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

function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${generateNonce()}'; style-src 'self'; img-src 'self' data:`);
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.locals.nonce = generateNonce();
    next();
});

function sanitizeInput(input) {
    return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
}

function authenticate(req, res, next) {
    const token = req.cookies.authToken;
    if (!token) return res.redirect('/login.html');
    db.query('SELECT * FROM users WHERE auth_token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.redirect('/login.html');
        req.user = results[0];
        next();
    });
}

function validateCsrfToken(req, res, next) {
    const csrfToken = req.body['csrf-token'];
    if (!csrfToken || csrfToken !== res.locals.nonce) {
        return res.status(403).send('CSRF token invalid');
    }
    next();
}

app.get('/csrf-token', (req, res) => {
    res.json({ token: res.locals.nonce });
});

app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', authenticate, (req, res) => {
    if (!req.user.is_admin) return res.redirect('/index.html');
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get('/products/:catid', (req, res) => {
    const catid = req.params.catid;
    db.query('SELECT * FROM products WHERE catid = ?', [catid], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get('/product/:pid', (req, res) => {
    const pid = req.params.pid;
    db.query('SELECT * FROM products WHERE pid = ?', [pid], (err, results) => {
        if (err) throw err;
        res.json(results[0] || {});
    });
});

app.post('/add-product', authenticate, validateCsrfToken, upload.single('image'), (req, res) => {
    if (!req.user.is_admin) return res.status(403).send('Unauthorized');
    const { catid, name, price, description } = req.body;
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedPrice = parseFloat(price);
    const imagePath = req.file ? req.file.path : null;

    if (!catid || !sanitizedName || isNaN(sanitizedPrice) || sanitizedPrice < 0 || !sanitizedDescription) {
        return res.status(400).send('Invalid input');
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
                db.query('INSERT INTO products (catid, name, price, description, image, thumbnail) VALUES (?, ?, ?, ?, ?, ?)', 
                    [catid, sanitizedName, sanitizedPrice, sanitizedDescription, imagePath, thumbnailPath], (err) => {
                        if (err) throw err;
                        res.send('Product added');
                    });
            });
    } else {
        db.query('INSERT INTO products (catid, name, price, description) VALUES (?, ?, ?, ?)', 
            [catid, sanitizedName, sanitizedPrice, sanitizedDescription], (err) => {
                if (err) throw err;
                res.send('Product added');
            });
    }
});

app.put('/update-product/:pid', authenticate, validateCsrfToken, upload.single('image'), (req, res) => {
    if (!req.user.is_admin) return res.status(403).send('Unauthorized');
    const { catid, name, price, description } = req.body;
    const pid = req.params.pid;
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedPrice = parseFloat(price);
    const imagePath = req.file ? req.file.path : null;

    if (!catid || !sanitizedName || isNaN(sanitizedPrice) || sanitizedPrice < 0 || !sanitizedDescription) {
        return res.status(400).send('Invalid input');
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
                db.query('UPDATE products SET catid=?, name=?, price=?, description=?, image=?, thumbnail=? WHERE pid=?', 
                    [catid, sanitizedName, sanitizedPrice, sanitizedDescription, imagePath, thumbnailPath, pid], (err) => {
                        if (err) throw err;
                        res.send('Product updated');
                    });
            });
    } else {
        db.query('UPDATE products SET catid=?, name=?, price=?, description=? WHERE pid=?', 
            [catid, sanitizedName, sanitizedPrice, sanitizedDescription, pid], (err) => {
                if (err) throw err;
                res.send('Product updated');
            });
    }
});

app.post('/add-category', authenticate, validateCsrfToken, (req, res) => {
    if (!req.user.is_admin) return res.status(403).send('Unauthorized');
    const { name } = req.body;
    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName) {
        return res.status(400).send('Category name is required');
    }
    db.query('INSERT INTO categories (name) VALUES (?)', [sanitizedName], (err) => {
        if (err) throw err;
        res.send('Category added');
    });
});

app.put('/update-category/:catid', authenticate, validateCsrfToken, (req, res) => {
    if (!req.user.is_admin) return res.status(403).send('Unauthorized');
    const { name } = req.body;
    const catid = req.params.catid;
    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName) {
        return res.status(400).send('Category name is required');
    }
    db.query('UPDATE categories SET name=? WHERE catid=?', [sanitizedName, catid], (err) => {
        if (err) throw err;
        res.send('Category updated');
    });
});

app.delete('/delete-product/:pid', authenticate, validateCsrfToken, (req, res) => {
    if (!req.user.is_admin) return res.status(403).send('Unauthorized');
    const pid = req.params.pid;
    db.query('DELETE FROM products WHERE pid = ?', [pid], (err) => {
        if (err) throw err;
        res.send('Product deleted');
    });
});

app.delete('/delete-category/:catid', authenticate, validateCsrfToken, (req, res) => {
    if (!req.user.is_admin) return res.status(403).send('Unauthorized');
    const catid = req.params.catid;
    db.query('DELETE FROM categories WHERE catid = ?', [catid], (err) => {
        if (err) throw err;
        res.send('Category deleted');
    });
});

app.post('/login', validateCsrfToken, (req, res) => {
    const { email, password } = req.body;
    const sanitizedEmail = sanitizeInput(email); // Added sanitization
    const sanitizedPassword = sanitizeInput(password); // Added sanitization
    
    if (!sanitizedEmail.match(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/) || sanitizedPassword.length < 8 || sanitizedPassword.length > 50) {
        return res.json({ success: false });
    }

    db.query('SELECT * FROM users WHERE email = ?', [sanitizedEmail], async (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false });
        }
        const user = results[0];
        const match = await bcrypt.compare(sanitizedPassword, user.password);
        if (match) {
            const token = crypto.randomBytes(32).toString('hex');
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Secure only in production (HTTPS)
                maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
                sameSite: 'strict'
            });
            db.query('UPDATE users SET auth_token = ? WHERE userid = ?', [token, user.userid], (err) => {
                if (err) throw err;
                res.json({ success: true, is_admin: user.is_admin });
            });
        } else {
            res.json({ success: false });
        }
    });
});

app.post('/logout', (req, res) => {
    const token = req.cookies.authToken;
    db.query('UPDATE users SET auth_token = NULL WHERE auth_token = ?', [token], () => {
        res.clearCookie('authToken');
        res.redirect('/index.html');
    });
});

app.get('/user', (req, res) => {
    const token = req.cookies.authToken;
    if (!token) return res.json({});
    db.query('SELECT email FROM users WHERE auth_token = ?', [token], (err, results) => {
        if (err) throw err;
        res.json(results[0] || {});
    });
});

app.post('/change-password', authenticate, async (req, res) => {
    const { current, newPass } = req.body;
    const sanitizedCurrent = sanitizeInput(current); // Added sanitization
    const sanitizedNewPass = sanitizeInput(newPass); // Added sanitization
    
    if (sanitizedNewPass.length < 8 || sanitizedNewPass.length > 50) {
        return res.status(400).send('New password must be 8-50 characters');
    }

    const user = req.user;
    if (await bcrypt.compare(sanitizedCurrent, user.password)) {
        const hashed = await bcrypt.hash(sanitizedNewPass, 10);
        db.query('UPDATE users SET password = ? WHERE userid = ?', [hashed, user.userid], (err) => {
            if (err) throw err;
            res.send('Password changed');
        });
    } else {
        res.status(400).send('Invalid current password');
    }
});

// HTTPS options with strong ciphers
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/20.249.188.8/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/20.249.188.8/fullchain.pem'),
    ciphers: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        '!RC4', // Disable weak ciphers
        '!MD5',
        '!DES'
    ].join(':'),
    honorCipherOrder: true
};

// HTTP server to redirect to HTTPS
http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://20.249.188.8:443${req.url}` });
    res.end();
}).listen(3000, () => {
    console.log('HTTP server redirecting to HTTPS on port 3000');
});

// HTTPS server
https.createServer(options, app).listen(443, () => {
    console.log('HTTPS server started on port 443');
});