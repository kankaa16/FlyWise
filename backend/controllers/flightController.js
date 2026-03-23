const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const { calculatePrice } = require('../middleware/pricingService');

// Helper: generate column labels from count (e.g. 6 → ['A','B','C','D','E','F'])
const getColumnLabels = (count) =>
  Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));

// Helper: create seats for a flight based on rows/columns/businessRows
const createSeatsForFlight = async (flight) => {
  const { _id: flightId, rows, columns, businessRows } = flight;
  const colLabels = getColumnLabels(columns);
  const seats = [];

  for (let row = 1; row <= rows; row++) {
    for (let col of colLabels) {
      const seatNumber = `${row}${col}`;
      const colIndex = colLabels.indexOf(col);

      let seatType = 'MIDDLE';
      if (colIndex === 0 || colIndex === colLabels.length - 1) seatType = 'WINDOW';
      else if (colIndex === Math.floor(colLabels.length / 2) - 1 || colIndex === Math.floor(colLabels.length / 2)) seatType = 'AISLE';

      seats.push({
        flightId,
        seatNumber,
        row,
        column: col,
        seatType,
        class: row <= businessRows ? 'BUSINESS' : 'ECONOMY',
        status: 'AVAILABLE',
      });
    }
  }

  await Seat.insertMany(seats);
};

// @desc    Search flights
// @route   GET /api/flights/search
const searchFlights = async (req, res) => {
  const { source, destination, date, passengers = 1 } = req.query;

  if (!source || !destination || !date) {
    return res.status(400).json({ success: false, message: 'Source, destination, and date are required.' });
  }

  const searchDate = new Date(date);
  const nextDay = new Date(searchDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const flights = await Flight.find({
    'source.city': { $regex: source, $options: 'i' },
    'destination.city': { $regex: destination, $options: 'i' },
    departureTime: { $gte: searchDate, $lt: nextDay },
    isActive: true,
    status: 'SCHEDULED',
    availableSeats: { $gte: parseInt(passengers) },
  }).sort({ departureTime: 1 });

  const flightsWithPricing = await Promise.all(flights.map(async (flight) => {
    const pricing = await calculatePrice(flight, [], parseInt(passengers));
    return {
      ...flight.toObject(),
      dynamicPrice: pricing.totalPrice,
      priceBreakdown: pricing,
    };
  }));

  res.json({ success: true, count: flights.length, flights: flightsWithPricing });
};

// @desc    Get single flight
// @route   GET /api/flights/:id
const getFlightById = async (req, res) => {
  const flight = await Flight.findById(req.params.id);
  if (!flight) {
    return res.status(404).json({ success: false, message: 'Flight not found.' });
  }
  const pricing = await calculatePrice(flight, [], 1);
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
    basePrice, rows, columns, businessRows, aircraft,
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
    rows: rows || 10,
    columns: columns || 6,
    businessRows: businessRows || 3,
    aircraft,
  });

  await createSeatsForFlight(flight);

  res.status(201).json({
    success: true,
    message: `Flight created with ${flight.totalSeats} seats (${flight.rows} rows × ${flight.columns} columns).`,
    flight,
  });
};

// @desc    Update flight (admin)
// @route   PUT /api/flights/:id
const updateFlight = async (req, res) => {
  const flight = await Flight.findById(req.params.id);
  if (!flight) return res.status(404).json({ success: false, message: 'Flight not found.' });

  const oldRows = flight.rows;
  const oldColumns = flight.columns;
  const oldBusinessRows = flight.businessRows;

  // Apply all updates
  Object.assign(flight, req.body);

  const seatsChanged =
    (req.body.rows != null && req.body.rows !== oldRows) ||
    (req.body.columns != null && req.body.columns !== oldColumns) ||
    (req.body.businessRows != null && req.body.businessRows !== oldBusinessRows);

  if (seatsChanged) {
    // Recalculate totalSeats and availableSeats
    const newTotal = flight.rows * flight.columns;
    const confirmedSeats = await Seat.countDocuments({
      flightId: flight._id,
      status: { $in: ['CONFIRMED', 'LOCKED'] },
    });

    flight.totalSeats = newTotal;
    flight.availableSeats = newTotal - confirmedSeats;

    // Rebuild seat map
    await Seat.deleteMany({ flightId: flight._id });
    await createSeatsForFlight(flight);
  }

  await flight.save();
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

// @desc  Get dynamic price for selected seats
// @route POST /api/flights/:id/price
const getFlightPrice = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight)
      return res.status(404).json({ success: false, message: 'Flight not found.' });

    const { seatNumbers, passengers } = req.body;

    if (!seatNumbers?.length) {
      return res.status(400).json({ success: false, message: 'seatNumbers required.' });
    }

    const seats = await Seat.find({
      flightId: flight._id,
      seatNumber: { $in: seatNumbers },
    });

    const pricing = await calculatePrice(flight, seats, passengers);

    res.json({ success: true, pricing });
  } catch (err) {
    console.error('getFlightPrice error:', err);
    res.status(500).json({ success: false, message: 'Price calculation failed.' });
  }
};

module.exports = {
  searchFlights, getFlightById, getAllFlights,
  createFlight, updateFlight, deleteFlight, getFlightPrice,
};