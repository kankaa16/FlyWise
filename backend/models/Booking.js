const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingRef: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true,
  },
  seats: [{
    seatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat' },
    seatNumber: String,
    seatType: String,
    seatCharge: Number,
  }],
  passengers: [{
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    seatNumber: String,
  }],
  priceBreakdown: {
    basePrice: { type: Number, required: true },
    demandSurcharge: { type: Number, default: 0 },
    lastMinuteSurcharge: { type: Number, default: 0 },
    seatCharges: { type: Number, default: 0 },
    // taxes: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
  },
  bookingStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    default: 'CONFIRMED',
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'REFUNDED'],
    default: 'PAID',
  },
  cancellationReason: {
    type: String,
    default: '',
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Auto-generate booking reference
bookingSchema.pre('validate', function (next) {
  if (!this.bookingRef) {
    this.bookingRef = 'FW' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
