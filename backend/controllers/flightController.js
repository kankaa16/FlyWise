const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const { calculatePrice } = require('../middleware/pricing');

// Helper: create seats for a flight
const createSeatsForFlight = async (flightId, totalSeats = 60) => {
  const rows = Math.ceil(totalSeats / 6);
  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seats = [];

  for (let row = 1; row <= rows; row++) {
    for (let col of columns) {
      const seatNumber = `${row}${col}`;
      let seatType = 'MIDDLE';
      if (col === 'A' || col === 'F') seatType = 'WINDOW';
      else if (col === 'C' || col === 'D') seatType = 'AISLE';

      seats.push({
        flightId,
        seatNumber,
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

// @desc    Search flights (one-way and round-trip)
// @route   GET /api/flights/search
const searchFlights = async (req, res) => {
  const now = new Date();
  const { source, destination, date, passengers = 1, returnDate } = req.query;

  if (!source || !destination) {
    return res.status(400).json({ success: false, message: 'Source and destination are required.' });
  }

  const pax = parseInt(passengers);
  const minTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

  // Returns a Mongo date-range filter for a YYYY-MM-DD string.
  // Returns null when the 10-hour rule wipes out the entire day.
  const buildDateFilter = (dateStr) => {
    if (!dateStr) return { $gte: minTime };
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay   = new Date(dateStr + 'T23:59:59.999Z');
    const effectiveLower = new Date(Math.max(startOfDay.getTime(), minTime.getTime()));
    if (effectiveLower > endOfDay) return null;
    return { $gte: effectiveLower, $lte: endOfDay };
  };

  // Mongo query for one leg — matches source/destination by city OR airport code.
  const buildQuery = (src, dst, dateFilter) => ({
    $and: [
      { $or: [{ 'source.city': { $regex: src, $options: 'i' } }, { 'source.code': { $regex: src, $options: 'i' } }] },
      { $or: [{ 'destination.city': { $regex: dst, $options: 'i' } }, { 'destination.code': { $regex: dst, $options: 'i' } }] },
    ],
    isActive: true,
    status: 'SCHEDULED',
    availableSeats: { $gte: pax },
    departureTime: dateFilter,
  });

  const withPricing = (list) =>
    list.map(f => {
      const pricing = calculatePrice(f, [], pax);
      return { ...f.toObject(), dynamicPrice: pricing.totalPrice, priceBreakdown: pricing };
    });

  // ── Round Trip ───────────────────────────────────────────────────────────
  if (returnDate) {
    const outFilter = buildDateFilter(date);
    const retFilter = buildDateFilter(returnDate);

    if (!outFilter) {
      return res.json({
        success: true,
        outboundFlights: [],
        returnFlights: [],
        message: 'Outbound flights on this date fall within the 10-hour advance booking window.',
      });
    }

    const [rawOut, rawRet] = await Promise.all([
      Flight.find(buildQuery(source, destination, outFilter)).sort({ departureTime: 1 }),
      retFilter
        ? Flight.find(buildQuery(destination, source, retFilter)).sort({ departureTime: 1 })
        : Promise.resolve([]),
    ]);

    const response = {
      success: true,
      outboundFlights: withPricing(rawOut),
      returnFlights: retFilter ? withPricing(rawRet) : [],
    };
    if (!retFilter) {
      response.message = 'Return flights on this date fall within the 10-hour advance booking window.';
    }
    return res.json(response);
  }

  // ── One-way ──────────────────────────────────────────────────────────────
  const filter = buildDateFilter(date);

  if (!filter) {
    return res.json({
      success: true,
      count: 0,
      flights: [],
      message: 'All flights on this date fall within the 10-hour advance booking window. Please choose a later date.',
    });
  }

  const flights = await Flight.find(buildQuery(source, destination, filter)).sort({ departureTime: 1 });
  res.json({ success: true, count: flights.length, flights: withPricing(flights) });
};

// @desc    Get single flight
// @route   GET /api/flights/:id
const getFlightById = async (req, res) => {
  const flight = await Flight.findById(req.params.id);
  if (!flight) {
    return res.status(404).json({ success: false, message: 'Flight not found.' });
  }
  const pricing = calculatePrice(flight, [], 1);
  res.json({ success: true, flight: { ...flight.toObject(), priceBreakdown: pricing } });
};

// @desc    Get all flights (admin)
// @route   GET /api/flights
const getAllFlights = async (req, res) => {
  const flights = await Flight.find({}).sort({ departureTime: -1 });
  res.json({ success: true, count: flights.length, flights });
};

// @desc    Create flight (admin)
// @route   POST /api/flights
const createFlight = async (req, res) => {
  const {
    flightNumber, airline, airlineCode,
    sourceCity, sourceCode,
    destinationCity, destinationCode,
    departureTime, arrivalTime,
    basePrice, totalSeats, aircraft,
  } = req.body;

  const dep = new Date(departureTime);
  const arr = new Date(arrivalTime);
  const duration = Math.round((arr - dep) / (1000 * 60));

  const flight = await Flight.create({
    flightNumber,
    airline,
    airlineCode,
    source: { city: sourceCity, code: sourceCode },
    destination: { city: destinationCity, code: destinationCode },
    departureTime: dep,
    arrivalTime: arr,
    duration,
    basePrice,
    totalSeats: totalSeats || 60,
    availableSeats: totalSeats || 60,
    aircraft,
  });

  await createSeatsForFlight(flight._id, flight.totalSeats);

  res.status(201).json({ success: true, message: 'Flight created successfully.', flight });
};

// @desc    Update flight (admin)
// @route   PUT /api/flights/:id
const updateFlight = async (req, res) => {
  const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });
  res.json({ success: true, flight });
};

// @desc    Delete flight (admin)
// @route   DELETE /api/flights/:id
const deleteFlight = async (req, res) => {
  const flight = await Flight.findById(req.params.id);
  if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });
  await Seat.deleteMany({ flightId: flight._id });
  await flight.deleteOne();
  res.json({ success: true, message: 'Flight deleted.' });
};

// @desc    Get price preview
// @route   POST /api/flights/:id/price
const getFlightPrice = async (req, res) => {
  const { seatNumbers = [], passengers = 1 } = req.body;
  const flight = await Flight.findById(req.params.id);
  if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

  let seats = [];
  if (seatNumbers.length > 0) {
    seats = await Seat.find({ flightId: flight._id, seatNumber: { $in: seatNumbers } });
  }

  const pricing = calculatePrice(flight, seats, passengers);
  res.json({ success: true, pricing });
};

module.exports = {
  searchFlights, getFlightById, getAllFlights,
  createFlight, updateFlight, deleteFlight, getFlightPrice,
};
