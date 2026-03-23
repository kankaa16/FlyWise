import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/common/SeatMap';
import { getFlightPrice, lockSeats } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './SeatSelection.css';

const fmt    = (d) => format(new Date(d), 'HH:mm');
const fmtDur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

const SeatSelection = () => {
  const navigate = useNavigate();
  const { selectedFlight, searchParams, setSelectedSeats, setSeatPricingMap } = useBooking();
  const { user, isAuthenticated } = useAuth();

  const [selectedSeatNums, setSelectedSeatNums] = useState([]);
  const [lockExpiry, setLockExpiry]             = useState(null);
  // seatPricing: { [seatNumber]: { base, appliedRules[], taxes, totalPrice } }
  const [seatPricing, setSeatPricing]           = useState({});
  const [fetchingSeat, setFetchingSeat]         = useState(null); // which seat is loading

  // Ref so handleSeatsSelected always sees latest seatPricing without stale closure
  const seatPricingRef = useRef({});

  if (!selectedFlight) { navigate('/'); return null; }
  if (!isAuthenticated) { navigate('/login?redirect=/seats'); return null; }

  const passengers = searchParams.passengers || 1;
  const f          = selectedFlight;

  // Called by SeatMap on every select / deselect
  const handleSeatsSelected = async (newSeatNums) => {
    const prev    = selectedSeatNums;
    const added   = newSeatNums.filter(s => !prev.includes(s));
    const removed = prev.filter(s => !newSeatNums.includes(s));

    // Remove deselected seats from pricing map immediately
    if (removed.length > 0) {
      const updated = { ...seatPricingRef.current };
      removed.forEach(s => delete updated[s]);
      seatPricingRef.current = updated;
      setSeatPricing({ ...updated });
    }

    setSelectedSeatNums(newSeatNums);

    // Fetch pricing for each newly added seat
    for (const seatNum of added) {
      try {
        setFetchingSeat(seatNum);
        const res = await getFlightPrice(f._id, {
          seatNumbers: [seatNum],
          passengers: 1,
        });
        const p = res.data.pricing;
        seatPricingRef.current = {
          ...seatPricingRef.current,
          [seatNum]: {
            base:         p.basePrice,
            appliedRules: p.appliedRules ?? [],
            taxes:        p.taxes,
            totalPrice:   p.totalPrice,
          },
        };
        setSeatPricing({ ...seatPricingRef.current });
      } catch (err) {
        console.error('Price fetch failed for', seatNum, err.response?.data || err.message);
        toast.error(`Failed to get price for seat ${seatNum}`);
      } finally {
        setFetchingSeat(null);
      }
    }
  };

  const handleContinue = async () => {
    if (selectedSeatNums.length < passengers) {
      toast.error(`Please select ${passengers} seat(s)`);
      return;
    }
    try {
      const res = await lockSeats({
        flightId: f._id,
        seatNumbers: selectedSeatNums,
      });
      setLockExpiry(res.data.lockExpiry);
      setSelectedSeats(selectedSeatNums);
      // Pass per-seat pricing map to BookingSummary via context
      if (typeof setSeatPricingMap === 'function') {
        setSeatPricingMap(seatPricingRef.current);
      }
      navigate('/booking-summary', { state: { lockExpiry: res.data.lockExpiry } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Seats not available anymore');
      setSelectedSeatNums([]);
    }
  };

  // ── Derived totals across all currently selected seats ──────────────────
  const selectedPricings = selectedSeatNums.map(s => seatPricing[s]).filter(Boolean);

  const runningBase = selectedPricings.reduce((sum, p) => sum + (p.base ?? 0), 0);
  const runningTax  = selectedPricings.reduce((sum, p) => sum + (p.taxes ?? 0), 0);
  const runningTotal = selectedPricings.reduce((sum, p) => sum + (p.totalPrice ?? 0), 0);

  // Merge surcharges by name across all selected seats
  const surchargeMap = {};
  selectedPricings.forEach(p => {
    (p.appliedRules ?? []).forEach(rule => {
      surchargeMap[rule.name] = (surchargeMap[rule.name] ?? 0) + rule.charge;
    });
  });
  const surchargeEntries = Object.entries(surchargeMap);

  const someLoading = fetchingSeat !== null;

  return (
    <div className="page-content seats-page">
      <div className="seats-header">
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back to Results</button>
          <h1 className="seats-title">Select Your Seats</h1>
          <p className="seats-meta">
            Select {passengers} seat{passengers > 1 ? 's' : ''} for your journey
          </p>
        </div>
      </div>

      <div className="section seats-layout">
        {/* Left: seat map */}
        <div className="seats-map-col">
          <div className="card seats-map-card">
            <div className="card-inner-header">
              <h3>Cabin View</h3>
              <span className="badge badge-blue">{f.flightNumber}</span>
            </div>
            <SeatMap
              flightId={f._id}
              maxSeats={passengers}
              onSeatsSelected={handleSeatsSelected}
              userId={user?._id}
            />
          </div>
        </div>

        {/* Right: flight info + price */}
        <div className="seats-info-col">
          {/* Flight card */}
          <div className="card seats-flight-card">
            <div className="sfc-airline-badge">{f.airlineCode}</div>
            <div className="sfc-route">
              <div className="sfc-city">
                <div className="sfc-time">{fmt(f.departureTime)}</div>
                <div className="sfc-code">{f.source.code}</div>
                <div className="sfc-name">{f.source.city}</div>
              </div>
              <div className="sfc-mid">
                <div className="sfc-dur">{fmtDur(f.duration)}</div>
                <div className="sfc-arrow">✈</div>
                <div className="sfc-nonstop">Non-stop</div>
              </div>
              <div className="sfc-city right">
                <div className="sfc-time">{fmt(f.arrivalTime)}</div>
                <div className="sfc-code">{f.destination.code}</div>
                <div className="sfc-name">{f.destination.city}</div>
              </div>
            </div>
            <div className="sfc-airline-name">{f.airline} · {f.aircraft}</div>
          </div>

          {/* Lock timer */}
          {lockExpiry && (
            <div className="lock-notice">
              <span className="lock-icon">🔒</span>
              <div>
                <strong>Seats locked!</strong>
                <p>Complete booking before {format(new Date(lockExpiry), 'HH:mm')} or seats will auto-release</p>
              </div>
            </div>
          )}

          {/* ── Live price panel ── */}
          <div className="card price-card">
            <h3 className="price-card-title">
              Price Breakdown
              {someLoading && <span className="price-fetching-badge">Updating…</span>}
            </h3>

            {selectedSeatNums.length === 0 ? (
              <p className="price-hint">Select a seat to see pricing</p>
            ) : (
              <div className="price-rows">
                <div className="price-row">
                  <span>Base fare ({selectedPricings.length}/{passengers} seat{passengers > 1 ? 's' : ''})</span>
                  <span>₹{runningBase.toLocaleString('en-IN')}</span>
                </div>

                {surchargeEntries.length > 0
                  ? surchargeEntries.map(([name, total]) => (
                      <div className="price-row surcharge" key={name}>
                        <span>{name}</span>
                        <span>+₹{total.toLocaleString('en-IN')}</span>
                      </div>
                    ))
                  : selectedPricings.length > 0 && (
                      <div className="price-row">
                        <span style={{ color: '#94a3b8' }}>No surcharges apply</span>
                      </div>
                    )
                }

                <div className="price-row">
                  <span>Taxes &amp; GST (18%)</span>
                  <span>₹{runningTax.toLocaleString('en-IN')}</span>
                </div>

                <hr className="divider" />
                <div className="price-row total">
                  <span>Total {selectedSeatNums.length < passengers ? `(so far)` : ''}</span>
                  <span>₹{runningTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleContinue}
            disabled={selectedSeatNums.length < passengers || someLoading}
          >
            Continue to Booking →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;