const API_URL = '/api';

// State
let allCars = [];
let currentUser = null;
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');

if(token && username) {
    currentUser = username;
}

// Check auth state
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');

    if (currentUser) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        userDisplay.textContent = `Welcome, ${currentUser}`;
        userDisplay.classList.remove('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        userDisplay.classList.add('hidden');
    }
}

// Navigation
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        const targetId = e.target.getAttribute('data-target');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        if(targetId === 'auctions' || targetId === 'sales') {
            loadCars();
        }
    });
});

// Modals
const authModal = document.getElementById('auth-modal');
const actionModal = document.getElementById('action-modal');
let isLogin = true;

document.getElementById('login-btn').addEventListener('click', () => {
    authModal.classList.add('show');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    currentUser = null;
    token = null;
    updateAuthUI();
});

window.closeModals = function() {
    authModal.classList.remove('show');
    actionModal.classList.remove('show');
    const detailsModal = document.getElementById('details-modal');
    if(detailsModal) detailsModal.classList.remove('show');
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('action-error').style.display = 'none';
}

document.getElementById('switch-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    document.getElementById('auth-title').textContent = isLogin ? 'Login' : 'Register';
    e.target.textContent = isLogin ? 'Register' : 'Login';
});

// Auth Submit
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const endpoint = isLogin ? '/login' : '/register';

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: user, password: pass})
        });
        const data = await res.json();

        if (res.ok) {
            if (isLogin) {
                token = data.token;
                currentUser = data.username;
                localStorage.setItem('token', token);
                localStorage.setItem('username', currentUser);
                closeModals();
                updateAuthUI();
                loadCars();
            } else {
                isLogin = true;
                document.getElementById('auth-title').textContent = 'Login';
                document.getElementById('switch-to-register').textContent = 'Register';
                alert('Registration successful! Please login.');
                document.getElementById('password').value = '';
            }
        } else {
            const errEl = document.getElementById('auth-error');
            errEl.textContent = data.error;
            errEl.style.display = 'block';
        }
    } catch(err) {
        console.error(err);
    }
});

// Load Cars
async function loadCars() {
    try {
        const res = await fetch(`${API_URL}/cars`);
        const cars = await res.json();
        allCars = cars;
        
        const auctionsGrid = document.getElementById('auctions-grid');
        const salesGrid = document.getElementById('sales-grid');
        
        auctionsGrid.innerHTML = '';
        salesGrid.innerHTML = '';

        cars.forEach(car => {
            const card = document.createElement('div');
            card.className = 'car-card';
            
            const isAuction = car.type === 'auction';
            const priceLabel = isAuction ? (car.highest_bid ? 'Highest Bid' : 'Starting Bid') : 'Price';
            const priceVal = isAuction ? (car.highest_bid || car.price) : car.price;

            let timeStr = '';
            if (isAuction && car.end_time) {
                const timeLeft = car.end_time - Date.now();
                if (timeLeft > 0) {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    timeStr = `<span class="car-timer">⏱ ${hours}h left</span>`;
                } else {
                    timeStr = `<span class="car-timer" style="color:red">Ended</span>`;
                }
            }

            card.innerHTML = `
                <img src="${car.image_url}" alt="${car.make} ${car.model}" class="car-img pointer" onclick="window.openDetailsModal(${car.id})" onerror="this.src='/images/tesla.png'">
                <div class="car-info">
                    <h3 class="car-title">${car.make} ${car.model} (${car.year})</h3>
                    <div class="car-meta">
                        <span>#${car.id}</span>
                        ${timeStr}
                    </div>
                    <div class="car-price">${priceLabel}: $${priceVal.toLocaleString()}</div>
                    <button class="btn ${isAuction ? 'outline' : 'primary'} full-width" onclick="window.openActionModal(${car.id})">
                        ${isAuction ? 'Place Bid' : 'Buy Now'}
                    </button>
                </div>
            `;

            if (isAuction) auctionsGrid.appendChild(card);
            else salesGrid.appendChild(card);
        });

        if (auctionsGrid.innerHTML === '') auctionsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No active auctions.</p>';
        if (salesGrid.innerHTML === '') salesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No cars for sale.</p>';

    } catch(err) {
        console.error(err);
    }
}

// Details Modal
window.openDetailsModal = function(carId) {
    const car = allCars.find(c => c.id === carId);
    if (!car) return;

    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-content');

    let timeStr = '';
    if (car.type === 'auction' && car.end_time) {
        const timeLeft = car.end_time - Date.now();
        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            timeStr = `<strong>Time Left:</strong> ${hours} hours`;
        } else {
            timeStr = `<strong>Status:</strong> <span style="color:red">Ended</span>`;
        }
    }

    const priceLabel = car.type === 'auction' ? 'Current Bid' : 'Price';
    const priceVal = car.type === 'auction' ? (car.highest_bid || car.price) : car.price;

    content.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 2rem;">
            <div style="flex: 1; min-width: 300px;">
                <img src="${car.image_url}" alt="${car.make} ${car.model}" style="width: 100%; border-radius: 10px; border: 1px solid var(--glass-border); object-fit: cover; height: 350px;">
            </div>
            <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; justify-content: center;">
                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--accent);">${car.make} <span style="color: #fff;">${car.model}</span></h2>
                <div style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.8;">
                    <p><strong>Year:</strong> ${car.year}</p>
                    <p><strong>Type:</strong> <span style="text-transform: capitalize;">${car.type}</span></p>
                    ${car.description ? `<p style="margin-top: 10px; font-style: italic; border-left: 3px solid var(--accent); padding-left: 10px;">${car.description}</p>` : ''}
                    ${timeStr ? `<p style="margin-top: 10px;">${timeStr}</p>` : ''}
                </div>
                <div style="background: rgba(0,0,0,0.5); padding: 1.5rem; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <p style="font-size: 1.2rem; color: var(--text-muted); margin-bottom: 5px;">${priceLabel}</p>
                    <h3 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;">$${priceVal.toLocaleString()}</h3>
                    <button class="btn primary full-width" style="font-size: 1.1rem; padding: 1rem;" 
                            onclick="closeModals(); window.openActionModal(${car.id})">
                        ${car.type === 'auction' ? 'Place a Bid Now' : 'Buy Now'}
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('show');
}

// Action Modal
window.openActionModal = function(carId) {
    const car = allCars.find(c => c.id === carId);
    if (!car) return;

    if (!token) {
        authModal.classList.add('show');
        return;
    }

    const type = car.type;
    const currentPrice = car.highest_bid || car.price;

    const titleEl = document.getElementById('action-title');
    const contentEl = document.getElementById('action-content');
    
    let timeStr = '';
    if (type === 'auction' && car.end_time) {
        const timeLeft = car.end_time - Date.now();
        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            timeStr = `<p style="color: #ffb703; font-weight: 600; font-size: 0.9rem;">⏱ ${hours}h left</p>`;
        } else {
            timeStr = `<p style="color:red; font-size: 0.9rem;">Ended</p>`;
        }
    }

    const carDetailsHtml = `
        <div style="display: flex; gap: 15px; margin-bottom: 20px; text-align: left; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
            <img src="${car.image_url}" alt="${car.make}" style="width: 100px; height: 75px; object-fit: cover; border-radius: 5px;">
            <div>
                <h3 style="margin-bottom: 5px; font-size: 1.2rem; color: #fff;">${car.make} ${car.model}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 3px;">Year: ${car.year} | ${type === 'auction' ? 'Auction' : 'For Sale'}</p>
                ${timeStr}
            </div>
        </div>
    `;
    
    if (type === 'auction') {
        titleEl.textContent = 'Place a Bid';
        const minBid = currentPrice + 100;
        contentEl.innerHTML = `
            ${carDetailsHtml}
            <p style="margin-bottom: 5px;">Current highest bid: <strong style="color: var(--accent); font-size: 1.2rem;">$${currentPrice.toLocaleString()}</strong></p>
            <p style="margin-bottom: 10px; font-size: 0.9rem; color: var(--text-muted);">Quick Bid Options:</p>
            <div class="preset-container">
                <button class="preset-btn" onclick="document.getElementById('bid-amount').value = ${minBid}">Min ($${minBid.toLocaleString()})</button>
                <button class="preset-btn" onclick="document.getElementById('bid-amount').value = ${minBid + 500}">+$500</button>
                <button class="preset-btn" onclick="document.getElementById('bid-amount').value = ${minBid + 1000}">+$1000</button>
                <button class="preset-btn" onclick="document.getElementById('bid-amount').value = ${minBid + 5000}">+$5000</button>
            </div>
            <div class="bid-input-group" style="display: flex; gap: 10px;">
                <input type="number" id="bid-amount" min="${minBid}" step="100" placeholder="Custom Amount" required style="flex:1; padding: 0.8rem; border-radius: 5px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.5); color: #fff;">
                <button class="btn primary" onclick="window.submitBid(${carId})">Submit Bid</button>
            </div>
        `;
    } else {
        titleEl.textContent = 'Confirm Purchase';
        contentEl.innerHTML = `
            ${carDetailsHtml}
            <p style="margin-bottom: 5px;">Total Price:</p>
            <h2 style="color: var(--accent); margin-bottom: 20px;">$${currentPrice.toLocaleString()}</h2>
            <button class="btn primary full-width" onclick="window.submitBuy(${carId})">Confirm & Pay</button>
        `;
    }

    actionModal.classList.add('show');
}

window.submitBid = async function(carId) {
    const amount = document.getElementById('bid-amount').value;
    if (!amount) return;

    try {
        const res = await fetch(`${API_URL}/cars/${carId}/bid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({amount: parseFloat(amount)})
        });
        const data = await res.json();
        
        if (res.ok) {
            closeModals();
            loadCars();
            alert('Bid placed successfully!');
        } else {
            const errEl = document.getElementById('action-error');
            errEl.textContent = data.error;
            errEl.style.display = 'block';
        }
    } catch(err) {
        console.error(err);
    }
}

window.submitBuy = async function(carId) {
    try {
        const res = await fetch(`${API_URL}/cars/${carId}/buy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        
        if (res.ok) {
            closeModals();
            loadCars();
            alert('Purchase successful! Congratulations!');
        } else {
            const errEl = document.getElementById('action-error');
            errEl.textContent = data.error;
            errEl.style.display = 'block';
        }
    } catch(err) {
        console.error(err);
    }
}

// Initial setup
updateAuthUI();
loadCars();
