require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('./db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Flight = require('../models/Flight');
const Seat = require('../models/Seat');

const createSeats = async (flightId, totalSeats) => {
  const rows = Math.ceil(totalSeats / 6);
  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seats = [];
  for (let row = 1; row <= rows; row++) {
    for (let col of columns) {
      let seatType = 'MIDDLE';
      if (col === 'A' || col === 'F') seatType = 'WINDOW';
      else if (col === 'C' || col === 'D') seatType = 'AISLE';
      seats.push({
        flightId,
        seatNumber: `${row}${col}`,
        row,
        column: col,
        seatType,
        class: row <= 3 ? 'BUSINESS' : 'ECONOMY',
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

  // Create admin
  const admin = await User.create({
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

  // Base routes — every pair is defined in both directions
  const baseRoutes = [
    // BOM ↔ DEL (morning + afternoon each way)
    { airlineCode: 'FW', airline: 'FlyWise Air', source: { city: 'Mumbai', code: 'BOM' }, destination: { city: 'Delhi',     code: 'DEL' }, depHour:  6, duration: 120, basePrice: 4500 },
    { airlineCode: 'FW', airline: 'FlyWise Air', source: { city: 'Mumbai', code: 'BOM' }, destination: { city: 'Delhi',     code: 'DEL' }, depHour: 14, duration: 125, basePrice: 5200 },
    { airlineCode: 'FW', airline: 'FlyWise Air', source: { city: 'Delhi',  code: 'DEL' }, destination: { city: 'Mumbai',    code: 'BOM' }, depHour:  8, duration: 120, basePrice: 4500 },
    { airlineCode: 'FW', airline: 'FlyWise Air', source: { city: 'Delhi',  code: 'DEL' }, destination: { city: 'Mumbai',    code: 'BOM' }, depHour: 16, duration: 125, basePrice: 5200 },

    // DEL ↔ BLR (morning + evening each way)
    { airlineCode: 'SJ', airline: 'SkyJet',      source: { city: 'Delhi',     code: 'DEL' }, destination: { city: 'Bangalore', code: 'BLR' }, depHour:  8, duration: 150, basePrice: 3800 },
    { airlineCode: 'SJ', airline: 'SkyJet',      source: { city: 'Delhi',     code: 'DEL' }, destination: { city: 'Bangalore', code: 'BLR' }, depHour: 18, duration: 155, basePrice: 4100 },
    { airlineCode: 'SJ', airline: 'SkyJet',      source: { city: 'Bangalore', code: 'BLR' }, destination: { city: 'Delhi',     code: 'DEL' }, depHour: 10, duration: 150, basePrice: 3800 },
    { airlineCode: 'SJ', airline: 'SkyJet',      source: { city: 'Bangalore', code: 'BLR' }, destination: { city: 'Delhi',     code: 'DEL' }, depHour: 20, duration: 155, basePrice: 4100 },

    // MAA ↔ HYD
    { airlineCode: 'IW', airline: 'IndiaWings',  source: { city: 'Chennai',   code: 'MAA' }, destination: { city: 'Hyderabad', code: 'HYD' }, depHour: 10, duration:  80, basePrice: 2800 },
    { airlineCode: 'IW', airline: 'IndiaWings',  source: { city: 'Hyderabad', code: 'HYD' }, destination: { city: 'Chennai',   code: 'MAA' }, depHour: 14, duration:  80, basePrice: 2800 },

    // CCU ↔ BOM
    { airlineCode: 'AB', airline: 'AirBharat',   source: { city: 'Kolkata', code: 'CCU' }, destination: { city: 'Mumbai',  code: 'BOM' }, depHour:  7, duration: 160, basePrice: 5500 },
    { airlineCode: 'AB', airline: 'AirBharat',   source: { city: 'Mumbai',  code: 'BOM' }, destination: { city: 'Kolkata', code: 'CCU' }, depHour: 12, duration: 160, basePrice: 5500 },

    // GOI ↔ DEL
    { airlineCode: 'FW', airline: 'FlyWise Air', source: { city: 'Goa',   code: 'GOI' }, destination: { city: 'Delhi', code: 'DEL' }, depHour:  9, duration: 140, basePrice: 6200 },
    { airlineCode: 'FW', airline: 'FlyWise Air', source: { city: 'Delhi', code: 'DEL' }, destination: { city: 'Goa',   code: 'GOI' }, depHour: 15, duration: 140, basePrice: 6200 },

    // BOM ↔ GOI
    { airlineCode: 'SJ', airline: 'SkyJet',      source: { city: 'Mumbai', code: 'BOM' }, destination: { city: 'Goa',    code: 'GOI' }, depHour: 11, duration: 75, basePrice: 2500 },
    { airlineCode: 'SJ', airline: 'SkyJet',      source: { city: 'Goa',    code: 'GOI' }, destination: { city: 'Mumbai', code: 'BOM' }, depHour: 16, duration: 75, basePrice: 2500 },
  ];

  // Generate one flight per route per day for days 1–7
  const now = new Date();
  let counter = 100;

  for (let day = 1; day <= 7; day++) {
    for (const route of baseRoutes) {
      counter++;
      const flightNumber = `FW${counter}`;

      const dep = new Date(now);
      dep.setDate(dep.getDate() + day);
      dep.setHours(route.depHour, 0, 0, 0);
      const arr = new Date(dep.getTime() + route.duration * 60000);

      const flight = await Flight.create({
        flightNumber,
        airline: route.airline,
        airlineCode: route.airlineCode,
        source: route.source,
        destination: route.destination,
        departureTime: dep,
        arrivalTime: arr,
        duration: route.duration,
        basePrice: route.basePrice,
        totalSeats: 60,
        availableSeats: 60,
        aircraft: 'Airbus A320',
      });
      await createSeats(flight._id, 60);
      console.log(`✅ Day +${day} | ${flightNumber} | ${route.source.code} → ${route.destination.code}`);
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log(`   ${baseRoutes.length} routes × 7 days = ${baseRoutes.length * 7} flights`);
  console.log('Admin: admin@flywise.com / admin123');
  console.log('User:  user@flywise.com / user1234');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
