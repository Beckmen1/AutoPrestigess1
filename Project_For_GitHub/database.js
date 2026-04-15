const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'cars.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            make TEXT,
            model TEXT,
            year INTEGER,
            price REAL,
            type TEXT,
            status TEXT DEFAULT 'available',
            image_url TEXT,
            end_time INTEGER,
            description TEXT
        )`, (err) => {
            if (!err) {
                // Seed data if empty
                db.get("SELECT COUNT(*) AS count FROM cars", (err, row) => {
                    if (row.count === 0) {
                        const insert = `INSERT INTO cars (make, model, year, price, type, status, image_url, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                        
                        const genImgUrl = (text) => `https://via.placeholder.com/600x400/1e1e1e/E63946?text=${encodeURIComponent(text)}`;
                        
                        db.run(insert, ["Ferrari", "488 Spider", 2021, 280000, "sale", "available", "/images/ferrari.png", null]);
                        db.run(insert, ["Tesla", "Model S Plaid", 2023, 85000, "auction", "available", "/images/tesla.png", Date.now() + 86400000]);
                        db.run(insert, ["BMW", "M4 Competition", 2022, 65000, "auction", "available", "/images/bmw.png", Date.now() + 3600000]);
                        
                        // New cars
                        db.run(insert, ["Porsche", "911 GT3", 2022, 195000, "auction", "available", genImgUrl("Porsche 911 GT3"), Date.now() + 172800000]);
                        db.run(insert, ["Mercedes", "AMG GT", 2021, 140000, "sale", "available", genImgUrl("Mercedes AMG GT"), null]);
                        db.run(insert, ["Audi", "R8 V10", 2020, 160000, "auction", "available", genImgUrl("Audi R8 V10"), Date.now() + 43200000]);
                        db.run(insert, ["Lamborghini", "Huracan", 2022, 260000, "sale", "available", genImgUrl("Lamborghini Huracan"), null]);
                        db.run(insert, ["McLaren", "720S", 2021, 299000, "auction", "available", genImgUrl("McLaren 720S"), Date.now() + 7200000]);
                        db.run(insert, ["Aston Martin", "Vantage", 2023, 145000, "sale", "available", genImgUrl("Aston Martin Vantage"), null]);
                    }
                });
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS bids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            car_id INTEGER,
            user_id INTEGER,
            amount REAL,
            timestamp INTEGER,
            FOREIGN KEY(car_id) REFERENCES cars(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
    }
});

module.exports = db;
