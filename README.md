
# FlyWise

# ✈ FlyWise — Smart Flight Booking App

A full-stack MERN flight booking application with dynamic pricing, seat locking, and booking lifecycle management.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

---

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and set your MONGO_URI
```

Default `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/flywise
JWT_SECRET=flywise_super_secret_jwt_key_2024
JWT_EXPIRE=7d
NODE_ENV=development
```

---

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates:
- **8 sample flights** between major Indian cities
- **Admin account**: `admin@flywise.com` / `admin123`
- **Test user**: `user@flywise.com` / `user1234`
- **60 seats per flight** (auto-generated with window/aisle/middle layout)

---

### 4. Run the App

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev     # or: npm start
# Runs on http://localhost:5000
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

---

## 📁 Project Structure

```
flywise/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── seed.js            # Database seeder
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── flightController.js
│   │   ├── seatController.js
│   │   └── bookingController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + adminOnly
│   │   └── pricing.js         # Dynamic pricing engine
│   ├── models/
│   │   ├── User.js
│   │   ├── Flight.js
│   │   ├── Seat.js
│   │   └── Booking.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── flights.js
│   │   ├── seats.js
│   │   └── bookings.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── common/
        │   │   ├── FlightCard.js     # Flight result card
        │   │   ├── SeatMap.js        # Interactive seat map
        │   │   └── ProtectedRoute.js
        │   └── layout/
        │       └── Navbar.js
        ├── context/
        │   ├── AuthContext.js
        │   └── BookingContext.js
        ├── pages/
        │   ├── Home.js               # Landing + search
        │   ├── Flights.js            # Search results
        │   ├── SeatSelection.js      # Seat map + lock
        │   ├── BookingSummary.js     # Passenger details + confirm
        │   ├── Dashboard.js          # User booking history
        │   ├── AdminDashboard.js     # Admin panel
        │   ├── Login.js
        │   └── Register.js
        ├── utils/
        │   └── api.js                # Axios instance + all endpoints
        ├── App.js
        └── index.js
```

---

## ✨ Features

### Booking Flow
1. **Search** flights by source city, destination, date, passengers
2. **Browse** results with dynamic pricing indicators
3. **Select seats** on interactive cabin map (window/aisle/middle)
4. **Seat locking** — seats lock for 10 minutes on selection
5. **Enter passenger** details with seat assignment
6. **Confirm booking** with full price breakdown
7. **View & cancel** bookings from dashboard

### Dynamic Pricing Engine
- Base price per flight (set by admin)
- **+₹1,000** demand surcharge when >70% seats booked
- **+₹1,500** last-minute surcharge when booking within 2 days
- **+₹300** per window seat
- **+₹150** per aisle seat
- **18% GST** applied on total

### Seat Locking (Concurrency Handling)
- Status: `AVAILABLE → LOCKED → CONFIRMED → AVAILABLE` (on cancel)
- Seats auto-unlock after 10 minutes if booking not completed
- Expired locks released on every seat map load
- User can only lock seats not already locked by others

### Authentication
- JWT-based auth with 7-day expiry
- Roles: `USER` and `ADMIN`
- Protected routes on both frontend and backend

### Admin Panel
- View system stats (bookings, revenue, flights)
- Add / edit / delete flights
- Seat layout auto-generated on flight creation
- View all user bookings with full details

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | User |
| PUT | `/api/auth/profile` | User |

### Flights
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/flights/search?source=&destination=&date=&passengers=` | Public |
| GET | `/api/flights/:id` | Public |
| GET | `/api/flights` | Admin |
| POST | `/api/flights` | Admin |
| PUT | `/api/flights/:id` | Admin |
| DELETE | `/api/flights/:id` | Admin |
| POST | `/api/flights/:id/price` | User |

### Seats
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/seats/:flightId` | Public |
| POST | `/api/seats/lock` | User |
| POST | `/api/seats/unlock` | User |

### Bookings
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/bookings` | User |
| GET | `/api/bookings/my` | User |
| GET | `/api/bookings/:id` | User/Admin |
| PUT | `/api/bookings/:id/cancel` | User/Admin |
| GET | `/api/bookings/all` | Admin |
| GET | `/api/bookings/stats` | Admin |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios |
| Styling | Custom CSS with design tokens (no Tailwind required) |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Dev Tools | Nodemon, Morgan, express-rate-limit |

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@flywise.com | admin123 |
| User | user@flywise.com | user1234 |
