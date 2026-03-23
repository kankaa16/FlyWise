const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  type: {
    type: String,
    // DEMAND     → fires when occupancy ≥ threshold %
    // TIME       → fires when hours until departure ≤ hoursBeforeDeparture
    // SEAT_TYPE  → fires per seat matching seatType (WINDOW | MIDDLE | AISLE)
    // CLASS      → fires per seat matching class (ECONOMY | BUSINESS)
    enum: ['DEMAND', 'TIME', 'SEAT_TYPE', 'CLASS'],
    required: true,
  },

  condition: {
    // DEMAND
    threshold: { type: Number, min: 0, max: 100 },          // occupancy % e.g. 70
    // TIME
    hoursBeforeDeparture: { type: Number, min: 0 },          // e.g. 48
    // SEAT_TYPE
    seatType: { type: String, enum: ['WINDOW', 'MIDDLE', 'AISLE'] },
    // CLASS
    class: { type: String, enum: ['ECONOMY', 'BUSINESS'] },
  },

  // Flat rupee charge applied when the condition is met
  charge: { type: Number, required: true, min: 0 },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);