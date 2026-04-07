require('dotenv').config();
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config();
}
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
connectDB();
app.set('trust proxy', 1);

//rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

//middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://fly-wise-nine.vercel.app/"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

//routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/addons', require('./routes/addons'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/pricing-rules', require('./routes/pricingRules'));

//health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'FlyWise API running' }));

//404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

//err handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT=process.env.PORT || 5000;

if (process.env.NODE_ENV !=="test") {
  app.listen(PORT, () => {
    console.log(`FlyWise server running on port ${PORT}`);
  });
}

module.exports=app;