const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const { calculatePrice } = require('../middleware/pricing');

//Create booking
//POST /api/bookings
const createBooking = async (req, res) => {
  const { flightId, seatNumbers, passengers , addOns=[]} = req.body;
  console.log("SCHEMA CHECK:", Booking.schema.obj.addOns);
  const userId = req.user._id;

  if (!flightId || !seatNumbers?.length || !passengers?.length) {
    return res.status(400).json({ success: false, message: 'Flight, seats, and passenger details are required.' });
  }

  const flight = await Flight.findById(flightId);
  if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

// Verify all seats are locked by this user
  const seats = await Seat.find({
    flightId,
    seatNumber: { $in: seatNumbers },
    lockedBy: userId,
    status: 'LOCKED',
  });

  if (seats.length !== seatNumbers.length) {
    return res.status(409).json({
      success: false,
      message: 'Seat lock expired or seats not locked by you. Please re-select seats.',
    });
  }

//for final pricing
  const pricing = await calculatePrice(flight, seats, passengers.length);

let safeAddOns = [];
//debug, lol
console.log("ADDONS RECEIVED:", addOns);
console.log("TYPE:", typeof addOns);
console.log("IS ARRAY:", Array.isArray(addOns));


if (Array.isArray(addOns)) {
  safeAddOns = addOns;
} else if (typeof addOns === "string") {
  try {
    safeAddOns = JSON.parse(addOns);
  } catch {
    safeAddOns = [];
  }
}

if (!Array.isArray(safeAddOns)) {
  safeAddOns = [];
}

const cleanedAddOns = safeAddOns.map(a => ({
  name: a?.name || "Unknown",
  price: Number(a?.price) || 0,
  type: a?.type || (a?.baggageWeight ? "baggage" : "meal"),
  baggageWeight: a?.baggageWeight || null
}));

const addOnTotal = cleanedAddOns.reduce((sum, a) => sum + a.price, 0);

const mealTotal = cleanedAddOns
  .filter(a => a.type === "meal")
  .reduce((sum, a) => sum + a.price, 0);

const baggageTotal = cleanedAddOns
  .filter(a => a.type === "baggage")
  .reduce((sum, a) => sum + a.price, 0);

  // Build seat details
  const seatDetails = seats.map(seat => ({
    seatId: seat._id,
    seatNumber: seat.seatNumber,
    seatType: seat.seatType,
    seatCharge: seat.seatType === 'WINDOW' ? 300 : seat.seatType === 'AISLE' ? 150 : 0,
  }));

  // Map passengers to seats
  const passengersWithSeats = passengers.map((p, i) => ({
    ...p,
    seatNumber: seatNumbers[i] || seatNumbers[0],
  }));

  console.log("FINAL ADDONS:", cleanedAddOns);
  const {discount = 0 } = req.body;
  const booking = await Booking.create({
    userId,
    flightId,
    addOns:cleanedAddOns,
    seats: seatDetails,
    passengers: passengersWithSeats,
    priceBreakdown: {
      basePrice: pricing.basePrice,
      demandSurcharge: pricing.demandSurcharge,
      lastMinuteSurcharge: pricing.lastMinuteSurcharge,
      seatCharges: pricing.seatCharges,
      taxes: pricing.taxes,
      mealTotal,
      baggageTotal,
      addOnTotal,
      originalPrice: pricing.totalPrice + addOnTotal,
      discount,
      totalPrice: pricing.totalPrice + addOnTotal
    },
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
  });

  // Confirm seats
  await Seat.updateMany(
    { flightId, seatNumber: { $in: seatNumbers } },
    { status: 'CONFIRMED', bookedBy: userId, lockedBy: null, lockExpiry: null }
  );

  // Update flight available seats
  await Flight.findByIdAndUpdate(flightId, {
    $inc: { availableSeats: -seatNumbers.length },
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate('flightId', 'flightNumber airline source destination departureTime arrivalTime duration')
    .populate('userId', 'name email');

  res.status(201).json({
    success: true,
    message: 'Booking confirmed!',
    booking: populatedBooking,
  });
};

//Get user bookings
// GET /api/bookings/my
const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id })
    .populate('flightId', 'flightNumber airline source destination departureTime arrivalTime duration aircraft')
    .select('+addOns')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: bookings.length, bookings });
};

//Get single booking
//GET /api/bookings/:id
const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('flightId')
    .populate('userId', 'name email phone');

  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  // Only allow owner or admin
  if (booking.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  res.json({ success: true, booking });
};

//Cancel booking
//PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  if (booking.bookingStatus === 'CANCELLED') {
    return res.status(400).json({ success: false, message: 'Booking already cancelled.' });
  }

  const seatNumbers = booking.seats.map(s => s.seatNumber);

  // Release seats
  await Seat.updateMany(
    { flightId: booking.flightId, seatNumber: { $in: seatNumbers } },
    { status: 'AVAILABLE', bookedBy: null, lockedBy: null, lockExpiry: null }
  );

  // Restore available seats count
  await Flight.findByIdAndUpdate(booking.flightId, {
    $inc: { availableSeats: seatNumbers.length },
  });

  booking.bookingStatus = 'CANCELLED';
  booking.paymentStatus = 'REFUNDED';
  booking.cancellationReason = req.body.reason || 'Cancelled by user';
  booking.cancelledAt = new Date();
  await booking.save();

  res.json({ success: true, message: 'Booking cancelled and seats released.', booking });
};

//Get all bookings (admin)
//GET /api/bookings/all
const getAllBookings = async (req, res) => {
  const bookings = await Booking.find({})
    .populate('flightId', 'flightNumber airline source destination departureTime')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: bookings.length, bookings });
};

// Admin stats
// GET /api/bookings/stats
const getStats = async (req, res) => {
  const totalBookings = await Booking.countDocuments({});
  const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'CONFIRMED' });
  const cancelledBookings = await Booking.countDocuments({ bookingStatus: 'CANCELLED' });

  const revenueResult = await Booking.aggregate([
    { $match: { bookingStatus: 'CONFIRMED' } },
    { $group: { _id: null, total: { $sum: '$priceBreakdown.totalPrice' } } },
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;

  const totalFlights = await Flight.countDocuments({ isActive: true });

  res.json({
    success: true,
    stats: { totalBookings, confirmedBookings, cancelledBookings, totalRevenue, totalFlights },
  });
};

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking, getAllBookings, getStats };
