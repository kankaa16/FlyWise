import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { createBooking, getFlightPrice } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './BookingSummary.css';

const fmt     = (d) => format(new Date(d), 'HH:mm');
const fmtDate = (d) => format(new Date(d), 'dd MMM yyyy');
const fmtDur  = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

const BookingSummary = () => {
  const navigate = useNavigate();
  const { selectedFlight, selectedSeats, searchParams, clearBooking, seatPricingMap } = useBooking();
  const { user } = useAuth();
  const passengers = searchParams.passengers || 1;

  const [passengerForms, setPassengerForms] = useState(
    Array.from({ length: passengers }, (_, i) => ({
      name:   i === 0 ? user?.name || '' : '',
      age:    '',
      gender: 'MALE',
    }))
  );

  const [booking,   setBooking]   = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  if (!selectedFlight || !selectedSeats.length) {
    navigate('/');
    return null;
  }

  const f = selectedFlight;

  // Build per-seat data from the map carried over from SeatSelection
  // seatPricingMap shape: { [seatNumber]: { base, appliedRules[], taxes, totalPrice } }
  const perSeatData = selectedSeats.map(sn => ({
    seatNumber:   sn,
    base:         seatPricingMap?.[sn]?.base         ?? 0,
    appliedRules: seatPricingMap?.[sn]?.appliedRules ?? [],
    taxes:        seatPricingMap?.[sn]?.taxes        ?? 0,
    total:        seatPricingMap?.[sn]?.totalPrice   ?? 0,
  }));

  const grandTotal = perSeatData.reduce((sum, s) => sum + s.total, 0);

  const updatePassenger = (i, field, value) =>
    setPassengerForms((forms) =>
      forms.map((form, idx) => (idx === i ? { ...form, [field]: value } : form))
    );

  const handleConfirm = async () => {
    const invalid = passengerForms.find((p) => !p.name || !p.age);
    if (invalid) { toast.error('Please fill in all passenger details'); return; }

    try {
      setBooking(true);
      const res = await createBooking({
        flightId:    f._id,
        seatNumbers: selectedSeats,
        passengers:  passengerForms,
      });
      setConfirmed(res.data.booking);
      clearBooking();
      toast.success('🎉 Booking confirmed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="page-content confirmation-page">
        <div className="confirm-wrap">
          <div className="confirm-icon">✅</div>
          <h1 className="confirm-title">Booking Confirmed!</h1>
          <p className="confirm-sub">Your booking reference is</p>
          <div className="confirm-ref">{confirmed.bookingRef}</div>
          <div className="confirm-details card">
            <div className="confirm-route">
              {confirmed.flightId?.source?.city} → {confirmed.flightId?.destination?.city}
            </div>
            <div className="confirm-date">{fmtDate(confirmed.flightId?.departureTime)}</div>
            <div className="confirm-seats">
              Seats: {confirmed.seats?.map((s) => s.seatNumber).join(', ')}
            </div>
            <div className="confirm-total">
              Total paid:{' '}
              <strong>₹{confirmed.priceBreakdown?.totalPrice?.toLocaleString('en-IN')}</strong>
            </div>
          </div>
          <div className="confirm-actions">
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              View My Trips
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Book Another Flight
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Summary screen ───────────────────────────────────────────────────────
  return (
    <div className="page-content summary-page">
      <div className="summary-header">
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="summary-title">Booking Summary</h1>
        </div>
      </div>

      <div className="section summary-layout">
        {/* Left: passenger forms */}
        <div className="summary-left">
          <div className="card summary-card">
            <h3 className="sc-title">Passenger Details</h3>
            {passengerForms.map((p, i) => (
              <div key={i} className="passenger-form">
                <div className="pf-label">Passenger {i + 1} · Seat {selectedSeats[i]}</div>
                <div className="pf-fields">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      className="form-input"
                      placeholder="As on ID"
                      value={p.name}
                      onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="25"
                      min="1"
                      max="120"
                      value={p.age}
                      onChange={(e) => updatePassenger(i, 'age', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-input"
                      value={p.gender}
                      onChange={(e) => updatePassenger(i, 'gender', e.target.value)}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: flight info + price breakdown */}
        <div className="summary-right">
          {/* Flight summary */}
          <div className="card summary-card">
            <h3 className="sc-title">Flight Details</h3>
            <div className="sf-airline-row">
              <div className="sf-badge">{f.airlineCode}</div>
              <div>
                <div className="sf-airline">{f.airline}</div>
                <div className="sf-num">{f.flightNumber} · {f.aircraft}</div>
              </div>
            </div>
            <div className="sf-route">
              <div className="sf-city">
                <div className="sf-time">{fmt(f.departureTime)}</div>
                <div className="sf-code">{f.source?.code}</div>
              </div>
              <div className="sf-arrow-wrap">
                <div className="sf-dur">{fmtDur(f.duration)}</div>
                <div className="sf-line">──── ✈ ────</div>
              </div>
              <div className="sf-city right">
                <div className="sf-time">{fmt(f.arrivalTime)}</div>
                <div className="sf-code">{f.destination?.code}</div>
              </div>
            </div>
            <div className="sf-date">{fmtDate(f.departureTime)}</div>
            <div className="sf-seats-row">
              <span className="sf-seats-label">Selected Seats:</span>
              {selectedSeats.map((s) => (
                <span key={s} className="badge badge-blue">{s}</span>
              ))}
            </div>
          </div>

          {/* ── Per-seat price breakdown ── */}
          <div className="card summary-card">
            <h3 className="sc-title">Price Breakdown</h3>

            <div className="seat-breakdown-list">
              {perSeatData.map((seat, idx) => (
                <div key={seat.seatNumber} className="seat-breakdown-item">
                  <div className="sb-seat-header">
                    <span className="badge badge-blue">{seat.seatNumber}</span>
                    <span className="sb-passenger-label">
                      {passengerForms[idx]?.name || `Passenger ${idx + 1}`}
                    </span>
                  </div>

                  <div className="sb-rows">
                    <div className="price-row sb-row">
                      <span>Base fare</span>
                      <span>₹{seat.base?.toLocaleString('en-IN')}</span>
                    </div>

                    {seat.appliedRules?.length > 0
                      ? seat.appliedRules.map((rule, ri) => (
                          <div className="price-row surcharge sb-row" key={ri}>
                            <span>{rule.name}</span>
                            <span>+₹{rule.charge?.toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      : <div className="price-row sb-row">
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>No surcharges</span>
                        </div>
                    }

                    <div className="price-row sb-row">
                      <span>Tax &amp; GST (18%)</span>
                      <span>₹{seat.taxes?.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="price-row sb-subtotal">
                      <span>Seat subtotal</span>
                      <span>₹{seat.total?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="price-rows grand-total-section">
              <hr className="divider" />
              <div className="price-row total">
                <span>Total Amount</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleConfirm}
            disabled={booking}
          >
            {booking
              ? <><div className="spinner" /> Confirming…</>
              : `✓ Confirm & Pay ₹${grandTotal.toLocaleString('en-IN')}`}
          </button>
          <p className="summary-tnc">
            By confirming, you agree to our Terms &amp; Conditions. Fare includes all taxes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;