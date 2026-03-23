const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true,
  },
  seatNumber: {
    type: String,
    required: true,
  },
  row: {
    type: Number,
    required: true,
  },
  column: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D', 'E', 'F'],
  },
  seatType: {
    type: String,
    enum: ['WINDOW', 'MIDDLE', 'AISLE'],
    required: true,
  },
  class: {
    type: String,
    enum: ['ECONOMY', 'BUSINESS'],
    default: 'ECONOMY',
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'LOCKED', 'CONFIRMED'],
    default: 'AVAILABLE',
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lockedAt: {
    type: Date,
    default: null,
  },
  lockExpiry: {
    type: Date,
    default: null,
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // extraCharge: {
  //   type: Number,
  //   default: 0,
  // },
}, { timestamps: true });

// Compound index for efficient queries
seatSchema.index({ flightId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ flightId: 1, status: 1 });

module.exports = mongoose.model('Seat', seatSchema);
