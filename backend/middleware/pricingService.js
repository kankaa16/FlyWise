const Seat = require('../models/Seat');
const PricingRule = require('../models/PricingRule');

/**
 * Calculate dynamic price for one or more seats on a flight
 * @param {Object} flight         - Flight document
 * @param {Array}  seats          - Array of Seat documents
 * @param {Number} passengerCount - Number of passengers (defaults to seats.length)
 * @returns {Object} priceBreakdown
 */
const calculatePrice = async (flight, seats, passengerCount) => {
  // Accept a single seat object for backwards-compat; normalise to array
  const seatsArr = Array.isArray(seats) ? seats : [seats];
  const numPassengers = passengerCount || seatsArr.length;

  const basePrice = flight.basePrice * numPassengers;
  let demandSurcharge = 0;
  let lastMinuteSurcharge = 0;
  let seatCharges = 0;
  const appliedRules = [];

  // Fetch active pricing rules from DB
  const rules = await PricingRule.find({ isActive: true });

  // Calculate seat occupancy
  const totalSeats = await Seat.countDocuments({ flightId: flight._id });
  const bookedSeats = await Seat.countDocuments({
    flightId: flight._id,
    status: { $in: ['CONFIRMED', 'LOCKED'] },
  });
  const occupancyPercent = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

  // Hours before departure
  const now = new Date();
  const departure = new Date(flight.departureTime);
  const hoursUntilDeparture = (departure - now) / (1000 * 60 * 60);

  // Flags so flight-level rules only fire once
  let demandRuleApplied = false;
  let timeRuleApplied = false;

  for (const rule of rules) {
    if (!rule.isActive) continue;

    switch (rule.type) {
      // ── Flight-level surcharges (applied once, not per-seat) ──────────────
      case 'DEMAND':
        if (
          !demandRuleApplied &&
          rule.condition.threshold != null &&
          occupancyPercent >= rule.condition.threshold
        ) {
          demandSurcharge += rule.charge;
          demandRuleApplied = true;
          appliedRules.push({ name: rule.name, type: rule.type, charge: rule.charge });
        }
        break;

      case 'TIME':
        if (
          !timeRuleApplied &&
          rule.condition.hoursBeforeDeparture != null &&
          hoursUntilDeparture <= rule.condition.hoursBeforeDeparture
        ) {
          lastMinuteSurcharge += rule.charge;
          timeRuleApplied = true;
          appliedRules.push({ name: rule.name, type: rule.type, charge: rule.charge });
        }
        break;

      // ── Per-seat surcharges ───────────────────────────────────────────────
      case 'SEAT_TYPE':
        for (const seat of seatsArr) {
          if (rule.condition.seatType && seat.seatType === rule.condition.seatType) {
            seatCharges += rule.charge;
            appliedRules.push({
              name: `${rule.name} (${seat.seatNumber})`,
              type: rule.type,
              charge: rule.charge,
            });
          }
        }
        break;

      case 'CLASS':
        for (const seat of seatsArr) {
          if (rule.condition.class && seat.class === rule.condition.class) {
            seatCharges += rule.charge;
            appliedRules.push({
              name: `${rule.name} (${seat.seatNumber})`,
              type: rule.type,
              charge: rule.charge,
            });
          }
        }
        break;

      default:
        break;
    }
  }

  // Fallback defaults when no rules exist in DB yet
  if (rules.length === 0) {
    if (occupancyPercent >= 70) {
      demandSurcharge = 1000;
      appliedRules.push({ name: 'High Demand Surcharge', type: 'DEMAND', charge: 1000 });
    }
    if (hoursUntilDeparture <= 48) {
      lastMinuteSurcharge = 1500;
      appliedRules.push({ name: 'Last-Minute Surcharge', type: 'TIME', charge: 1500 });
    }
    for (const seat of seatsArr) {
      if (seat.seatType === 'WINDOW') {
        seatCharges += 300;
        appliedRules.push({ name: `Window Seat (${seat.seatNumber})`, type: 'SEAT_TYPE', charge: 300 });
      } else if (seat.seatType === 'AISLE') {
        seatCharges += 150;
        appliedRules.push({ name: `Aisle Seat (${seat.seatNumber})`, type: 'SEAT_TYPE', charge: 150 });
      }
    }
  }

  const subtotal = basePrice + demandSurcharge + lastMinuteSurcharge + seatCharges;
  const taxes = Math.round(subtotal * 0.18);
  const totalPrice = subtotal + taxes;

  return {
    basePrice,
    demandSurcharge,
    lastMinuteSurcharge,
    seatCharges,
    taxes,
    totalPrice,
    appliedRules,
    occupancyPercent: Math.round(occupancyPercent),
    hoursUntilDeparture: Math.round(hoursUntilDeparture),
  };
};

module.exports = { calculatePrice };