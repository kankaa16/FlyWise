require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const PricingRule = require('../models/PricingRule');
const Booking = require('../models/Booking');
const connectDB = require('../config/db');

mongoose.connect(process.env.MONGO_URI);

// Default layout constants — change these and everything updates automatically
const DEFAULT_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEFAULT_ROWS = 20;
const BUSINESS_ROWS = 3; // rows 1–3 are Business class

const createSeats = async (flightId, rows = DEFAULT_ROWS, columns = DEFAULT_COLUMNS) => {
  const seats = [];
  for (let row = 1; row <= rows; row++) {
    for (const col of columns) {
      let seatType = 'MIDDLE';
      if (col === columns[0] || col === columns[columns.length - 1]) seatType = 'WINDOW';
      else if (col === columns[Math.floor(columns.length / 2) - 1] ||
               col === columns[Math.floor(columns.length / 2)]) seatType = 'AISLE';

      seats.push({
        flightId,
        seatNumber: `${row}${col}`,
        row,
        column: col,
        seatType,
        class: row <= BUSINESS_ROWS ? 'BUSINESS' : 'ECONOMY',
        status: 'AVAILABLE',
      });
    }
  }
  await Seat.insertMany(seats);
};

const seed = async () => {
  await connectDB();
  await User.deleteMany({});
  await Flight.deleteMany({});
  await Seat.deleteMany({});
  await PricingRule.deleteMany({});
  await Booking.deleteMany({});

  // Create admin
  await User.create({
    name: 'Admin User',
    email: 'admin@flywise.com',
    password: 'admin123',
    role: 'ADMIN',
    phone: '9999999999',
  });

  // Create test user
  await User.create({
    name: 'Test User',
    email: 'user@flywise.com',
    password: 'user1234',
    role: 'USER',
    phone: '8888888888',
  });

  const totalSeats = DEFAULT_ROWS * DEFAULT_COLUMNS.length; // 120

  const now = new Date();
  const flightsData = [
    { flightNumber: 'FW101', airline: 'FlyWise Air', airlineCode: 'FW', source: { city: 'Mumbai', code: 'BOM' }, destination: { city: 'Delhi', code: 'DEL' }, daysOffset: 1, depHour: 6, duration: 120, basePrice: 4500 },
    { flightNumber: 'FW102', airline: 'FlyWise Air', airlineCode: 'FW', source: { city: 'Mumbai', code: 'BOM' }, destination: { city: 'Delhi', code: 'DEL' }, daysOffset: 1, depHour: 14, duration: 125, basePrice: 5200 },
    { flightNumber: 'FW201', airline: 'SkyJet', airlineCode: 'SJ', source: { city: 'Delhi', code: 'DEL' }, destination: { city: 'Bangalore', code: 'BLR' }, daysOffset: 1, depHour: 8, duration: 150, basePrice: 3800 },
    { flightNumber: 'FW202', airline: 'SkyJet', airlineCode: 'SJ', source: { city: 'Delhi', code: 'DEL' }, destination: { city: 'Bangalore', code: 'BLR' }, daysOffset: 1, depHour: 18, duration: 155, basePrice: 4100 },
    { flightNumber: 'FW301', airline: 'IndiaWings', airlineCode: 'IW', source: { city: 'Chennai', code: 'MAA' }, destination: { city: 'Hyderabad', code: 'HYD' }, daysOffset: 2, depHour: 10, duration: 80, basePrice: 2800 },
    { flightNumber: 'FW401', airline: 'AirBharat', airlineCode: 'AB', source: { city: 'Kolkata', code: 'CCU' }, destination: { city: 'Mumbai', code: 'BOM' }, daysOffset: 2, depHour: 7, duration: 160, basePrice: 5500 },
    { flightNumber: 'FW501', airline: 'FlyWise Air', airlineCode: 'FW', source: { city: 'Goa', code: 'GOI' }, destination: { city: 'Delhi', code: 'DEL' }, daysOffset: 3, depHour: 9, duration: 140, basePrice: 6200 },
    { flightNumber: 'FW601', airline: 'SkyJet', airlineCode: 'SJ', source: { city: 'Mumbai', code: 'BOM' }, destination: { city: 'Goa', code: 'GOI' }, daysOffset: 1, depHour: 11, duration: 75, basePrice: 2500 },
  ];

  for (const f of flightsData) {
    const dep = new Date(now);
    dep.setDate(dep.getDate() + f.daysOffset);
    dep.setHours(f.depHour, 0, 0, 0);
    const arr = new Date(dep.getTime() + f.duration * 60000);

    const flight = await Flight.create({
      flightNumber: f.flightNumber,
      airline: f.airline,
      airlineCode: f.airlineCode,
      source: f.source,
      destination: f.destination,
      departureTime: dep,
      arrivalTime: arr,
      duration: f.duration,
      basePrice: f.basePrice,
      totalSeats,
      availableSeats: totalSeats,
      aircraft: 'Airbus A320',
      rows: DEFAULT_ROWS,
      columns: DEFAULT_COLUMNS.length,
      businessRows: BUSINESS_ROWS,
    });

    await createSeats(flight._id); // uses DEFAULT_ROWS + DEFAULT_COLUMNS automatically
    console.log(`Created flight ${f.flightNumber} with ${totalSeats} seats (${DEFAULT_ROWS} rows × ${DEFAULT_COLUMNS.length} cols)`);
  }

  const pricingRulesData = [
    {
      name: 'High Demand Surcharge',
      description: 'Add surcharge when 70%+ seats are booked',
      type: 'DEMAND',
      condition: { threshold: 70 },
      charge: 1000
    },
    {
      name: 'Last Minute Booking',
      description: 'Surcharge for bookings within 48 hours of departure',
      type: 'TIME',
      condition: { hoursBeforeDeparture: 48 },
      charge: 1500
    },
    {
      name: 'Window Seat Premium',
      description: 'Extra charge for window seats',
      type: 'SEAT_TYPE',
      condition: { seatType: 'WINDOW' },
      charge: 300
    },
    {
      name: 'Aisle Seat Premium',
      description: 'Small premium for aisle seats',
      type: 'SEAT_TYPE',
      condition: { seatType: 'AISLE' },
      charge: 150
    }
  ];
  await PricingRule.insertMany(pricingRulesData);

  console.log('\nSeed complete!');
  console.log('Admin: admin@flywise.com / admin123');
  console.log('User:  user@flywise.com / user1234');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });