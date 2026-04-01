import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { QRCodeCanvas } from "qrcode.react";
import './Dashboard.css';

const fmtDate = (d) => format(new Date(d), 'dd MMM yyyy');
const fmtTime = (d) => format(new Date(d), 'HH:mm');
const fmtDur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

const statusColors = {
  CONFIRMED: 'badge-green',
  CANCELLED: 'badge-red',
  PENDING: 'badge-amber',
};




const BookingCard = ({ booking, onCancel }) => {
  const f = booking.flightId;
  const [cancelling, setCancelling] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setCancelling(true);
      await onCancel(booking._id);
    } finally {
      setCancelling(false);
    }
  };

  if (!f) return null;

  // group addons by type + name
const groupAddOns = (addOns = []) => {
  const map = {};

  addOns.forEach(item => {
    const key = item.name;

    if (!map[key]) {
      map[key] = { ...item, qty: 1 };
    } else {
      map[key].qty += 1;
    }
  });

  return Object.values(map);
};

const groupedAddOns = groupAddOns(booking.addOns);

const downloadTicket = async () => {
  const input = document.getElementById(`ticket-${booking._id}`);

  if (!input) return;

  const canvas = await html2canvas(input, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  pdf.save(`FlyWise_Ticket_${booking.bookingRef}.pdf`);
};

  return (
    <div className={`booking-card ${booking.bookingStatus === 'CANCELLED' ? 'cancelled' : ''}`}>
      <div className="bc-top">
        <div className="bc-ref-row">
          <div className="bc-ref">
            <span className="bc-ref-label">Booking Ref</span>
            <span className="bc-ref-num">{booking.bookingRef}</span>
          </div>
          <span className={`badge ${statusColors[booking.bookingStatus]}`}>{booking.bookingStatus}</span>
        </div>

        <div className="bc-flight-row">
          <div className="bc-airline-chip">{f.airlineCode || 'FW'}</div>
          <div className="bc-route-wrap">
            <div className="bc-city-block">
              <div className="bc-time">{fmtTime(f.departureTime)}</div>
              <div className="bc-code">{f.source?.code}</div>
              <div className="bc-city">{f.source?.city}</div>
            </div>
            <div className="bc-mid">
              <div className="bc-dur">{fmtDur(f.duration)}</div>
              <div className="bc-line">── ✈ ──</div>
              <div className="bc-nonstop">Non-stop</div>
            </div>
            <div className="bc-city-block right">
              <div className="bc-time">{fmtTime(f.arrivalTime)}</div>
              <div className="bc-code">{f.destination?.code}</div>
              <div className="bc-city">{f.destination?.city}</div>
            </div>
          </div>
          <div className="bc-price-block">
            <div className="bc-price">₹{booking.priceBreakdown?.totalPrice?.toLocaleString('en-IN')||booking.totalPrice}</div>
            <div className="bc-price-label">Total Paid</div>
          </div>
        </div>

        <div className="bc-meta-row">
          <span className="bc-meta-item">📅 {fmtDate(f.departureTime)}</span>
          <span className="bc-meta-item">💺 {booking.seats?.map(s => s.seatNumber).join(', ')}</span>
          <span className="bc-meta-item">👥 {booking.passengers?.length} passenger{booking.passengers?.length > 1 ? 's' : ''}</span>
          <span className="bc-meta-item">✈ {f.flightNumber}</span>
        </div>
      </div>

      <div className="bc-actions">
  {/* LEFT (UNCHANGED FUNCTIONALITY) */}
  <button
    className="btn btn-ghost btn-sm"
    onClick={() => setExpanded(!expanded)}
  >
    {expanded ? '▲ Hide Details' : '▼ View Details'}
  </button>

  {/* RIGHT SIDE */}
  <div className="bc-actions-right">
    <button
      className="btn btn-primary btn-sm"
      onClick={downloadTicket}
    >
      Download Ticket
    </button>

    {booking.bookingStatus === 'CONFIRMED' && (
      <button
        className="btn btn-danger btn-sm"
        onClick={handleCancel}
        disabled={cancelling}
      >
        {cancelling ? 'Cancelling...' : 'Cancel Booking'}
      </button>
    )}
  </div>
</div>
{expanded && (
  <div className="bc-expanded">
    
    {/* PASSENGERS */}
    <div className="bc-exp-section">
      <div className="bc-exp-title">Passengers</div>
      <div className="bc-passengers">
        {booking.passengers?.map((p, i) => (
          <div key={i} className="bc-passenger">
            <span className="bc-pax-num">{i + 1}</span>
            <span className="bc-pax-name">{p.name}</span>
            <span className="bc-pax-age">Age {p.age}</span>
            <span className="bc-pax-gender">{p.gender}</span>
            <span className="badge badge-blue">{p.seatNumber}</span>
          </div>
        ))}
      </div>
    </div>

    {/* PRICE */}
    <div className="bc-exp-section">
      <div className="bc-exp-title">Price Breakdown</div>
      <div className="bc-price-table">
        <div className="bc-pr">
          <span>Base Fare</span>
          <span>₹{booking.priceBreakdown?.basePrice}</span>
        </div>

        <div className="bc-pr">
          <span>Taxes & GST</span>
          <span>₹{booking.priceBreakdown?.taxes}</span>
        </div>

        {booking.priceBreakdown?.mealTotal > 0 && (
          <div className="bc-pr">
            <span>Meals</span>
            <span>₹{booking.priceBreakdown.mealTotal}</span>
          </div>
        )}

        {booking.priceBreakdown?.baggageTotal > 0 && (
          <div className="bc-pr">
            <span>Baggage</span>
            <span>₹{booking.priceBreakdown.baggageTotal}</span>
          </div>
        )}

        <div className="bc-pr total">
          <span>Total</span>
          <span>
  ₹{(booking.priceBreakdown?.totalPrice || booking.totalPrice || 0).toLocaleString('en-IN')}
</span>
        </div>
      </div>
    </div>

  </div>
)}

      <div
  id={`ticket-${booking._id}`}
  style={{
    position: "absolute",
    left: "-9999px",
  }}
  className="ticket-container"
>

  {/* HEADER */}
  <div className="ticket-header">
    <div>
      <div className="ticket-title">✈ FlyWise Boarding Pass</div>
       <div className="ticket-date"> Journey Date : <span>{fmtDate(f.departureTime)}</span> 
     
    </div>
    </div>
    
    <div className="ticket-ref">
      <div>Booking Ref</div>
      <strong>{booking.bookingRef}</strong>
    </div>
  </div>

  {/* ROUTE */}
  <div className="ticket-route">
    <div className="ticket-city">
      <div className="ticket-code">{f.source?.code}</div>
      <div className="ticket-time">{fmtTime(f.departureTime)}</div>
    </div>

    <div className="ticket-arrow">✈</div>

    <div className="ticket-city">
      <div className="ticket-code">{f.destination?.code}</div>
      <div className="ticket-time">{fmtTime(f.arrivalTime)}</div>
    </div>
  </div>

  <div className="ticket-divider"></div>

  {/* PASSENGERS */}
  <div className="ticket-section">
    <h3>PASSENGERS</h3>
    {booking.passengers.map((p, i) => (
      <div key={i} className="ticket-passenger">
        <span>{p.name} ({p.gender}, {p.age})</span>
        <span>{p.seatNumber}</span>
      </div>
    ))}
  </div>

  {/* PRICE */}
  <div className="ticket-section">
    <h3>PRICE DETAILS</h3>

    <div className="ticket-price-row">
      <span>Base Fare</span>
      <span>₹{booking.priceBreakdown?.basePrice}</span>
    </div>

    <div className="ticket-price-row">
      <span>Taxes</span>
      <span>₹{booking.priceBreakdown?.taxes}</span>
    </div>

    {booking.priceBreakdown?.mealTotal > 0 && (
      <div className="ticket-price-row">
        <span>Meals</span>
        <span>₹{booking.priceBreakdown.mealTotal}</span>
      </div>
    )}

    {booking.priceBreakdown?.baggageTotal > 0 && (
      <div className="ticket-price-row">
        <span>Baggage</span>
        <span>₹{booking.priceBreakdown.baggageTotal}</span>
      </div>
    )}

    <div className="ticket-total">
      Total ₹{booking.priceBreakdown?.totalPrice}
    </div>
  </div>

  {/* FOOTER */}
  <div className="ticket-footer">
    <div className="ticket-note">
      Flight: {f.flightNumber} <br />
      Date: {fmtDate(f.departureTime)}
    </div>

    <div className="ticket-qr">
  <QRCodeCanvas
    value={JSON.stringify({
      bookingRef: booking.bookingRef,
      name: booking.passengers[0]?.name,
      flight: f.flightNumber,
      from: f.source?.code,
      to: f.destination?.code,
      date: f.departureTime,
    })}
    size={80}
  />
</div>
  </div>

</div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await getMyBookings();
      setBookings(res.data.bookings);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelBooking(id, { reason: 'Cancelled by user' });
      toast.success('Booking cancelled. Seats released.');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const filtered = bookings.filter(b => filter === 'ALL' || b.bookingStatus === filter);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.bookingStatus === 'CONFIRMED').length,
    cancelled: bookings.filter(b => b.bookingStatus === 'CANCELLED').length,
    spent: bookings.filter(b => b.bookingStatus === 'CONFIRMED').reduce((s, b) => s + (b.priceBreakdown?.totalPrice || 0), 0),
  };

  return (
    <div className="page-content dashboard-page">
      <div className="dashboard-header">
        <div className="section">
          <div className="dash-welcome">
            <div className="dash-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="dash-title">My Trips</h1>
              <p className="dash-sub">Welcome back, {user?.name?.split(' ')[0]}!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section dashboard-content">
        {/* Stats */}
        <div className="dash-stats">
          {[
            ['Total Trips', stats.total, '/plane.png'],
            ['Confirmed', stats.confirmed, '/yes.png'],
            ['Cancelled', stats.cancelled, '/cancel.png'],
            ['Total Spent', `₹${stats.spent.toLocaleString('en-IN')}`, 'flying-money.png'],
          ].map(([label, val, icon]) => (
            <div key={label} className="dash-stat-card">
              <img src={icon} alt={label} className="asc-img" />
              <div className="dash-stat-val">{val}</div>
              <div className="dash-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="dash-filters">
          {['ALL', 'CONFIRMED', 'CANCELLED'].map(f => (
            <button key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'All Trips' : f === 'CONFIRMED' ? 'Upcoming' : 'Cancelled'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dash-loading"><div className="spinner spinner-lg" /><p>Loading your trips...</p></div>
        ) : filtered.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">✈️</div>
            <h3>{filter === 'ALL' ? 'No trips yet' : `No ${filter.toLowerCase()} bookings`}</h3>
            <p>Ready for your next adventure?</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Search Flights</button>
          </div>
        ) : (
          <div className="booking-list">
            {filtered.map(b => (
              <BookingCard key={b._id} booking={b} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;