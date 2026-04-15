const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = "super_secret_car_key"; // Demo only

// --- Auth Routes ---
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({error: "Fields required"});

    const hashedPassword = bcrypt.hashSync(password, 8);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(err) {
        if (err) return res.status(400).json({error: "Username taken"});
        res.json({success: true, message: "User registered"});
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) return res.status(401).json({error: "Invalid credentials"});
        
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) return res.status(401).json({error: "Invalid credentials"});

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {expiresIn: '24h'});
        res.json({ token, username: user.username });
    });
});

// Middleware to check auth
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({error: "Unauthorized"});
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({error: "Invalid token"});
        req.user = decoded;
        next();
    });
}

// --- Car Routes ---
app.get('/api/cars', (req, res) => {
    db.all(`
        SELECT c.*, 
               (SELECT MAX(amount) FROM bids WHERE car_id = c.id) as highest_bid
        FROM cars c 
        WHERE c.status = 'available'
    `, [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/cars/:id', (req, res) => {
    db.get("SELECT * FROM cars WHERE id = ?", [req.params.id], (err, car) => {
        if (car && car.type === 'auction') {
            db.all("SELECT b.*, u.username FROM bids b JOIN users u ON b.user_id = u.id WHERE car_id = ? ORDER BY amount DESC", [car.id], (err, bids) => {
                car.bids = bids || [];
                res.json(car);
            });
        } else {
            res.json(car);
        }
    });
});

// Buy a car directly
app.post('/api/cars/:id/buy', authenticate, (req, res) => {
    const carId = req.params.id;
    db.get("SELECT * FROM cars WHERE id = ? AND type = 'sale' AND status = 'available'", [carId], (err, car) => {
        if (!car) return res.status(400).json({error: "Car not available for sale"});
        
        db.run("UPDATE cars SET status = 'sold' WHERE id = ?", [carId], function(err) {
            if (err) return res.status(500).json({error: "Purchase failed"});
            res.json({success: true, message: "Car purchased successfully!"});
        });
    });
});

// Place a bid
app.post('/api/cars/:id/bid', authenticate, (req, res) => {
    const carId = req.params.id;
    const { amount } = req.body;

    db.get("SELECT * FROM cars WHERE id = ? AND type = 'auction' AND status = 'available'", [carId], (err, car) => {
        if (!car) return res.status(400).json({error: "Auction not available"});
        if (car.end_time < Date.now()) return res.status(400).json({error: "Auction ended"});
        
        db.get("SELECT MAX(amount) as highest FROM bids WHERE car_id = ?", [carId], (err, row) => {
            const currentHighest = row.highest || car.price;
            if (amount <= currentHighest) return res.status(400).json({error: "Bid must be higher than current price"});
            
            db.run("INSERT INTO bids (car_id, user_id, amount, timestamp) VALUES (?, ?, ?, ?)", 
                [carId, req.user.id, amount, Date.now()], function(err) {
                    if (err) return res.status(500).json({error: "Bidding failed"});
                    res.json({success: true, message: "Bid placed successfully!", newBid: amount});
                });
        });
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
