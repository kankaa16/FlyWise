import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/common/SeatMap';
import { getFlightPrice,lockSeats } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './SeatSelection.css';

const fmt = (d) => format(new Date(d), 'HH:mm');
const fmtDur = (m) => `${Math.floor(m/60)}h ${m%60}m`;

const SeatSelection = () => {
  const navigate = useNavigate();
  const { selectedFlight, searchParams, setSelectedSeats } = useBooking();
  const { user, isAuthenticated } = useAuth();
  const [selectedSeatNums, setSelectedSeatNums] = useState([]);
  const [lockExpiry, setLockExpiry] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  if (!selectedFlight) {
    navigate('/');
    return null;
  }

  if (!isAuthenticated) {
    navigate('/login?redirect=/seats');
    return null;
  }

  const passengers = searchParams.passengers || 1;

  const handleSeatsSelected = async (seatNums) => {
  setSelectedSeatNums(seatNums);

  if (seatNums.length > 0) {
    try {
      setLoadingPrice(true);
      const res = await getFlightPrice(selectedFlight._id, {
        seatNumbers: seatNums,
        passengers
      });
      setPricing(res.data.pricing);
    } catch {
      toast.error('Failed to calculate price');
    } finally {
      setLoadingPrice(false);
    }
  } else {
    setPricing(null);
  }
};

  const handleContinue = async () => {
  if (selectedSeatNums.length < passengers) {
    toast.error(`Please select ${passengers} seat(s)`);
    return;
  }

  try {
  
    const res = await lockSeats({
      flightId: selectedFlight._id,
      seatNumbers: selectedSeatNums
    });
    setLockExpiry(res.data.lockExpiry); 
    setSelectedSeats(selectedSeatNums);
    navigate('/booking-summary',{
      state: { lockExpiry: res.data.lockExpiry }
    });

  } catch (err) {
  toast.error(err.response?.data?.message || 'Seats not available anymore');
  setSelectedSeatNums([]); 
}
};

  const f = selectedFlight;

  return (
    <div className="page-content seats-page">
      <div className="seats-header">
        <div className="section">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back to Results</button>
          <h1 className="seats-title">Select Your Seats</h1>
          <p className="seats-meta">Select {passengers} seat{passengers > 1 ? 's' : ''} for your journey</p>
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

          {/* Price breakdown */}
          {loadingPrice && <div className="card price-loading"><div className="spinner" /><span>Calculating price...</span></div>}
          {pricing && (
            <div className="card price-card">
              <h3 className="price-card-title">Price Breakdown</h3>
              <div className="price-rows">
                <div className="price-row"><span>Base fare ({passengers} pax)</span><span>₹{pricing.basePrice?.toLocaleString('en-IN')}</span></div>
                {pricing.demandSurcharge > 0 && <div className="price-row surcharge"><span>High demand surcharge</span><span>+₹{pricing.demandSurcharge?.toLocaleString('en-IN')}</span></div>}
                {pricing.lastMinuteSurcharge > 0 && <div className="price-row surcharge"><span>Last-minute surcharge</span><span>+₹{pricing.lastMinuteSurcharge?.toLocaleString('en-IN')}</span></div>}
                {pricing.seatCharges > 0 && <div className="price-row"><span>Seat charges</span><span>+₹{pricing.seatCharges?.toLocaleString('en-IN')}</span></div>}
                <div className="price-row"><span>Taxes & GST (18%)</span><span>₹{pricing.taxes?.toLocaleString('en-IN')}</span></div>
                <hr className="divider" />
                <div className="price-row total"><span>Total</span><span>₹{pricing.totalPrice?.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleContinue}
            disabled={selectedSeatNums.length < passengers}
          >
            Continue to Booking →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
