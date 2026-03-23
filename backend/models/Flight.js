const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  airline: {
    type: String,
    required: [true, 'Airline name is required'],
  },
  airlineCode: {
    type: String,
    required: true,
    uppercase: true,
  },
  source: {
    city: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
  },
  destination: {
    city: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
  },
  departureTime: {
    type: Date,
    required: true,
  },
  arrivalTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  rows: {
    type: Number,
    required: true,
    default: 10,
    min: 2,
  },
  columns: {
    type: Number,
    required: true,
    default: 6,
    min: 2,
    max: 10,
  },
  businessRows: {
    type: Number,
    required: true,
    default: 3, // first N rows are business class
  },
  totalSeats: {
    type: Number,
  },
  availableSeats: {
    type: Number,
  },
  aircraft: {
    type: String,
    default: 'Airbus A320',
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'DELAYED', 'CANCELLED', 'COMPLETED'],
    default: 'SCHEDULED',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Auto-compute totalSeats from rows * columns before save
flightSchema.pre('save', function (next) {
  this.totalSeats = this.rows * this.columns;
  if (this.availableSeats == null) {
    this.availableSeats = this.totalSeats;
  }
  next();
});

// Virtual for occupancy percentage
flightSchema.virtual('occupancyPercent').get(function () {
  return ((this.totalSeats - this.availableSeats) / this.totalSeats) * 100;
});

module.exports = mongoose.model('Flight', flightSchema);