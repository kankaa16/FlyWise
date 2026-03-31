const Seat = require('../models/Seat');
const Flight = require('../models/Flight');

const LOCK_DURATION_MINUTES=5; // seats auto-unlock after 5 min

//release expired locks
const releaseExpiredLocks = async (flightId) => {
  const now = new Date();
  await Seat.updateMany(
    { flightId, status: 'LOCKED', lockExpiry: { $lt: now } },
    { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
  );
};

//Get seats for a flight
//GET /api/seats/:flightId
const getSeats = async (req, res) => {
  const { flightId } = req.params;
  await releaseExpiredLocks(flightId);

  const seats = await Seat.find({ flightId }).sort({ row: 1, column: 1 });
  if (!seats.length) {
    return res.json({ success: true, seats: seats || [] }); ;
  }

  res.json({ success: true, seats });
};

//Lock seats (user selecting)
//POST /api/seats/lock
const lockSeats = async (req, res) => {
  const { flightId, seatNumbers } = req.body;
  const userId = req.user._id;

  if (!flightId || !seatNumbers || !seatNumbers.length) {
    return res.status(400).json({ success: false, message: 'Flight ID and seat numbers required.' });
  }

  await releaseExpiredLocks(flightId);

  //check all requested seats are available
  const seats = await Seat.find({
    flightId,
    seatNumber: { $in: seatNumbers },
  });

  if (seats.length !== seatNumbers.length) {
    return res.status(400).json({ success: false, message: 'Some seats not found.' });
  }

  const unavailable = seats.filter(s => s.status !== 'AVAILABLE' && !(s.status === 'LOCKED' && s.lockedBy?.toString() === userId.toString()));
  if (unavailable.length > 0) {
    return res.status(409).json({
      success: false,
      message: `Seats ${unavailable.map(s => s.seatNumber).join(', ')} are not available.`,
    });
  }

  const lockExpiry = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  //release any previous locks by this user on this flight
  await Seat.updateMany(
    { flightId, lockedBy: userId, status: 'LOCKED' },
    { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
  );

  //;ock the new seats
  await Seat.updateMany(
    { flightId, seatNumber: { $in: seatNumbers } },
    {
      status: 'LOCKED',
      lockedBy: userId,
      lockedAt: new Date(),
      lockExpiry,
    }
  );

  const updatedSeats = await Seat.find({ flightId, seatNumber: { $in: seatNumbers } });

  res.json({
    success: true,
    message: `${seatNumbers.length} seat(s) locked for 10 minutes.`,
    seats: updatedSeats,
    lockExpiry,
  });
};

//Unlock seats (user deselecting)
//POST /api/seats/unlock
const unlockSeats = async (req, res) => {
  const { flightId, seatNumbers } = req.body;
  const userId = req.user._id;

  await Seat.updateMany(
    { flightId, seatNumber: { $in: seatNumbers }, lockedBy: userId, status: 'LOCKED' },
    { status: 'AVAILABLE', lockedBy: null, lockedAt: null, lockExpiry: null }
  );

  res.json({ success: true, message: 'Seats unlocked.' });
};

module.exports = { getSeats, lockSeats, unlockSeats };
