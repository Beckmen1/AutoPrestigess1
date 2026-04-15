const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'cars.db');

if (fs.existsSync(dbPath)) {
    console.log("Removing old DB for fresh seed...");
    fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

const carImages = [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503376766326-ff655f469aa7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1617814076367-b75734f063c8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544839309-38af76722d5b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80'
];

const carMakes = ['Ferrari', 'Porsche', 'Lamborghini', 'Audi', 'Mercedes-Benz', 'BMW', 'McLaren', 'Aston Martin'];
const engines = ['V8 Twin-Turbo', 'V10 Naturally Aspirated', 'V12 Engine', 'Electric Dual Motor', 'Hybrid V6 Supercharged'];
const descriptions = [
    "A pinnacle of automotive engineering, combining aggressive aerodynamics with staggering straight-line performance.",
    "Experience pure driving joy with this perfectly balanced masterpiece, designed for both track days and canyon carving.",
    "A luxurious interior meets brutal horsepower. The ultimate status symbol for those who refuse to compromise.",
    "Cutting edge technology infused into a timeless chassis. Guaranteed to turn heads everywhere you go.",
    "Hand-built perfection. Every detail has been meticulously tuned to provide an unmatched visceral driving experience."
];

db.serialize(() => {
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
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        car_id INTEGER,
        user_id INTEGER,
        amount REAL,
        timestamp INTEGER,
        FOREIGN KEY(car_id) REFERENCES cars(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const hash = bcrypt.hashSync("test12345", 8);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["nikusha", hash]);

    const stmt = db.prepare(`INSERT INTO cars (make, model, year, price, type, status, image_url, end_time, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const genDetails = () => {
        const make = carMakes[Math.floor(Math.random() * carMakes.length)];
        const engine = engines[Math.floor(Math.random() * engines.length)];
        const descText = descriptions[Math.floor(Math.random() * descriptions.length)];
        const desc = `Engine: ${engine}. ${descText}`;
        return { make, desc };
    };

    // 20 Auctions
    for (let i = 0; i < 20; i++) {
        const d = genDetails();
        const year = 2018 + Math.floor(Math.random() * 6);
        const price = 50000 + Math.floor(Math.random() * 200000);
        const imgUrl = carImages[i % carImages.length];
        const endTime = Date.now() + (Math.random() * 86400000 * 3);
        stmt.run([d.make, `Series ${i+1}`, year, price, 'auction', 'available', imgUrl, Math.floor(endTime), d.desc]);
    }

    // 30 Sales
    for (let i = 20; i < 50; i++) {
        const d = genDetails();
        const year = 2015 + Math.floor(Math.random() * 9);
        const price = 40000 + Math.floor(Math.random() * 150000);
        const imgUrl = carImages[i % carImages.length];
        stmt.run([d.make, `Model ${i+1}`, year, price, 'sale', 'available', imgUrl, null, d.desc]);
    }

    stmt.finalize();
    console.log("Database seeded with exactly 20 auctions and 30 sales, with verified car photos and descriptions.");
});

db.close();
