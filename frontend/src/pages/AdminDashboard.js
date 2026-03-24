import React, { useEffect, useState } from 'react';
import { getAllFlights, createFlight, deleteFlight, getAllBookings, getStats, updateFlight } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const fmtDate = (d) => format(new Date(d), 'dd MMM yyyy HH:mm');
const fmtDur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

const INITIAL_FORM = {
  flightNumber: '', airline: '', airlineCode: '',
  sourceCity: '', sourceCode: '',
  destinationCity: '', destinationCode: '',
  departureTime: '', arrivalTime: '',
  basePrice: '', totalSeats: 60, aircraft: 'Airbus A320',
};

const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [flightForm, setFlightForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadStats();
    if (tab === 'flights') loadFlights();
    if (tab === 'bookings') loadBookings();
  }, [tab]);

  const loadStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data.stats);
    } catch { toast.error('Failed to load stats'); }
  };

  const loadFlights = async () => {
    try {
      setLoading(true);
      const res = await getAllFlights();
      setFlights(res.data.flights);
    } catch { toast.error('Failed to load flights'); }
    finally { setLoading(false); }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await getAllBookings();
      setBookings(res.data.bookings);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const handleAddFlight = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editId) {
        await updateFlight(editId, flightForm);
        toast.success('Flight updated!');
        setEditId(null);
      } else {
        await createFlight(flightForm);
        toast.success('Flight created with 60 seats!');
      }
      setFlightForm(INITIAL_FORM);
      setShowAddFlight(false);
      loadFlights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save flight');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this flight and all its seats?')) return;
    try {
      await deleteFlight(id);
      toast.success('Flight deleted');
      loadFlights();
    } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (flight) => {
    setFlightForm({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      sourceCity: flight.source.city,
      sourceCode: flight.source.code,
      destinationCity: flight.destination.city,
      destinationCode: flight.destination.code,
      departureTime: format(new Date(flight.departureTime), "yyyy-MM-dd'T'HH:mm"),
      arrivalTime: format(new Date(flight.arrivalTime), "yyyy-MM-dd'T'HH:mm"),
      basePrice: flight.basePrice,
      totalSeats: flight.totalSeats,
      aircraft: flight.aircraft,
    });
    setEditId(flight._id);
    setShowAddFlight(true);
  };

  const ff = (field, val) => setFlightForm(f => ({ ...f, [field]: val }));

  return (
    <div className="page-content admin-page">
      <div className="admin-header">
        <div className="section">
          <div className="admin-header-row">
            <div>
              <h1 className="admin-title">Admin Dashboard</h1>
              <p className="admin-sub">Manage flights, bookings & system</p>
            </div>
            {tab === 'flights' && (
              <button className="btn btn-primary" onClick={() => { setShowAddFlight(true); setEditId(null); setFlightForm(INITIAL_FORM); }}>
                + Add Flight
              </button>
            )}
          </div>
          <div className="admin-tabs">
            {[['overview','Overview'],['flights','Flights'],['bookings','Bookings']].map(([v,l]) => (
              <button key={v} className={`admin-tab${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="section admin-content">
        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div>
            <div className="admin-stats-grid">
              {[
  ['Total Bookings', stats.totalBookings, '/ticket-flight.png', 'blue'],
  ['Confirmed', stats.confirmedBookings, '/yes.png', 'green'],
  ['Cancelled', stats.cancelledBookings, '/cancel.png', 'red'],
  ['Total Revenue', `₹${stats.totalRevenue?.toLocaleString('en-IN')}`, '/money.png', 'amber'],
  ['Active Flights', stats.totalFlights, '/plane.png', 'blue'], 
].map(([label, val, icon, color]) => (
  <div key={label} className={`admin-stat-card ac-${color}`}>
    
    <div className="asc-icon">
      {typeof icon === 'string' && icon.startsWith('/') ? (
        <img src={icon} alt={label} className="asc-img" />
      ) : (
        icon
      )}
    </div>

    <div className="asc-val">{val}</div>
    <div className="asc-label">{label}</div>
  </div>
))}
            </div>

            <div className="admin-info-cards">
              <div className="card admin-info-card">
                <h3>Quick Guide</h3>
                <ul>
                  <li>Go to <strong>Flights</strong> tab to add or manage flights</li>
                  <li>Go to <strong>Bookings</strong> tab to view all user bookings</li>
                  <li>Dynamic pricing applies automatically based on occupancy and dates</li>
                  <li>Seats are auto-generated when a flight is created</li>
                </ul>
              </div>
              <div className="card admin-info-card">
                <h3>Pricing Rules</h3>
                <ul>
                  <li>Base price set per flight</li>
                  <li><strong>+₹1,000</strong> when more than 70% seats booked</li>
                  <li><strong>+₹1,500</strong> when booking within 2 days of departure</li>
                  <li><strong>+₹300</strong> per window seat selected</li>
                  <li><strong>+₹150</strong> per aisle seat selected</li>
                  <li><strong>+18% GST</strong> on all fares</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* FLIGHTS */}
        {tab === 'flights' && (
          <div>
            {showAddFlight && (
              <div className="add-flight-form card">
                <div className="aff-header">
                  <h3>{editId ? 'Edit Flight' : 'Add New Flight'}</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddFlight(false); setEditId(null); }}>✕ Close</button>
                </div>
                <form onSubmit={handleAddFlight} className="aff-grid">
                  <div className="form-group">
                    <label className="form-label">Flight Number</label>
                    <input className="form-input" placeholder="FW101" value={flightForm.flightNumber} onChange={e => ff('flightNumber', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Airline Name</label>
                    <input className="form-input" placeholder="FlyWise Air" value={flightForm.airline} onChange={e => ff('airline', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Airline Code</label>
                    <input className="form-input" placeholder="FW" maxLength={3} value={flightForm.airlineCode} onChange={e => ff('airlineCode', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aircraft</label>
                    <input className="form-input" placeholder="Airbus A320" value={flightForm.aircraft} onChange={e => ff('aircraft', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source City</label>
                    <input className="form-input" placeholder="Mumbai" value={flightForm.sourceCity} onChange={e => ff('sourceCity', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source Code</label>
                    <input className="form-input" placeholder="BOM" maxLength={3} value={flightForm.sourceCode} onChange={e => ff('sourceCode', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination City</label>
                    <input className="form-input" placeholder="Delhi" value={flightForm.destinationCity} onChange={e => ff('destinationCity', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination Code</label>
                    <input className="form-input" placeholder="DEL" maxLength={3} value={flightForm.destinationCode} onChange={e => ff('destinationCode', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departure Time</label>
                    <input className="form-input" type="datetime-local" value={flightForm.departureTime} onChange={e => ff('departureTime', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Arrival Time</label>
                    <input className="form-input" type="datetime-local" value={flightForm.arrivalTime} onChange={e => ff('arrivalTime', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Price (₹)</label>
                    <input className="form-input" type="number" placeholder="5000" min="100" value={flightForm.basePrice} onChange={e => ff('basePrice', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Seats</label>
                    <input className="form-input" type="number" placeholder="60" min="6" max="300" value={flightForm.totalSeats} onChange={e => ff('totalSeats', parseInt(e.target.value))} required />
                  </div>
                  <div className="aff-submit">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? <><div className="spinner" /> Saving...</> : editId ? 'Update Flight' : 'Create Flight'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowAddFlight(false); setEditId(null); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="admin-loading"><div className="spinner spinner-lg" /></div>
            ) : (
              <div className="flights-table-wrap card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Flight</th>
                      <th>Route</th>
                      <th>Departure</th>
                      <th>Duration</th>
                      <th>Base Price</th>
                      <th>Seats</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flights.map(f => (
                      <tr key={f._id}>
                        <td>
                          <div className="at-flight-num">{f.flightNumber}</div>
                          <div className="at-airline">{f.airline}</div>
                        </td>
                        <td>{f.source.city} → {f.destination.city}</td>
                        <td className="at-date">{fmtDate(f.departureTime)}</td>
                        <td>{fmtDur(f.duration)}</td>
                        <td>₹{f.basePrice?.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${f.availableSeats < 10 ? 'badge-red' : 'badge-green'}`}>
                            {f.availableSeats}/{f.totalSeats}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${f.status === 'SCHEDULED' ? 'badge-green' : 'badge-amber'}`}>
                            {f.status}
                          </span>
                        </td>
                        <td>
                          <div className="at-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => handleEdit(f)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS */}
        {tab === 'bookings' && (
          <div>
            {loading ? (
              <div className="admin-loading"><div className="spinner spinner-lg" /></div>
            ) : (
              <div className="bookings-table-wrap card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Booking Ref</th>
                      <th>Passenger</th>
                      <th>Flight</th>
                      <th>Route</th>
                      <th>Date</th>
                      <th>Seats</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b._id}>
                        <td><span className="at-ref">{b.bookingRef}</span></td>
                        <td>
                          <div className="at-user">{b.userId?.name || '—'}</div>
                          <div className="at-email">{b.userId?.email || ''}</div>
                        </td>
                        <td className="at-flight-num">{b.flightId?.flightNumber}</td>
                        <td>{b.flightId?.source?.city} → {b.flightId?.destination?.city}</td>
                        <td className="at-date">{b.flightId?.departureTime ? fmtDate(b.flightId.departureTime) : '—'}</td>
                        <td>{b.seats?.map(s => s.seatNumber).join(', ')}</td>
                        <td className="at-price">₹{b.priceBreakdown?.totalPrice?.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${b.bookingStatus === 'CONFIRMED' ? 'badge-green' : b.bookingStatus === 'CANCELLED' ? 'badge-red' : 'badge-amber'}`}>
                            {b.bookingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
