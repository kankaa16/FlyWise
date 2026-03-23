const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const { calculatePrice } = require('../middleware/pricingService');

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING CRUD
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Create booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  const { flightId, seatNumbers, passengers } = req.body;
  const userId = req.user._id;

  if (!flightId || !seatNumbers?.length || !passengers?.length) {
    return res.status(400).json({
      success: false,
      message: 'Flight, seats, and passenger details are required.',
    });
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

  // Calculate final price — pass full seat documents so per-seat rules apply
  const priceBreakdown = await calculatePrice(flight, seats, passengers.length);

  // Map passengers to seats
  const passengersWithSeats = passengers.map((p, i) => ({
    ...p,
    seatNumber: seatNumbers[i] ?? seatNumbers[0],
  }));

  const booking = await Booking.create({
    userId,
    flightId,
    seats: seats.map((seat) => ({
      seatId: seat._id,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      class: seat.class,
    })),
    passengers: passengersWithSeats,
    priceBreakdown: {
      basePrice: priceBreakdown.basePrice,
      demandSurcharge: priceBreakdown.demandSurcharge,
      lastMinuteSurcharge: priceBreakdown.lastMinuteSurcharge,
      seatCharges: priceBreakdown.seatCharges,
      taxes: priceBreakdown.taxes,
      totalPrice: priceBreakdown.totalPrice,
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

// @desc    Get user bookings
// @route   GET /api/bookings/my
const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id })
    .populate(
      'flightId',
      'flightNumber airline source destination departureTime arrivalTime duration aircraft'
    )
    .sort({ createdAt: -1 });

  res.json({ success: true, count: bookings.length, bookings });
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('flightId')
    .populate('userId', 'name email phone');

  if (!booking)
    return res.status(404).json({ success: false, message: 'Booking not found.' });

  if (
    booking.userId._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'ADMIN'
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  res.json({ success: true, booking });
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking)
    return res.status(404).json({ success: false, message: 'Booking not found.' });

  if (
    booking.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'ADMIN'
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  if (booking.bookingStatus === 'CANCELLED') {
    return res.status(400).json({ success: false, message: 'Booking already cancelled.' });
  }

  const seatNumbers = booking.seats.map((s) => s.seatNumber);

  await Seat.updateMany(
    { flightId: booking.flightId, seatNumber: { $in: seatNumbers } },
    { status: 'AVAILABLE', bookedBy: null, lockedBy: null, lockExpiry: null }
  );

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

// @desc    Get all bookings (admin)
// @route   GET /api/bookings/all
const getAllBookings = async (req, res) => {
  const bookings = await Booking.find({})
    .populate('flightId', 'flightNumber airline source destination departureTime')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: bookings.length, bookings });
};

// @desc    Admin stats
// @route   GET /api/bookings/stats
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

module.exports = {
  // bookings
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  getStats
};