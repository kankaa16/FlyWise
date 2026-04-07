import React, { useEffect, useState } from 'react';
import { getAllFlights, createFlight, deleteFlight, getAllBookings, getStats, updateFlight,getPricingRules, createPricingRule, updatePricingRule, deletePricingRule } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const fmtDate = (d) => format(new Date(d), 'dd MMM yyyy HH:mm');
const fmtDur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;


const RULE_TYPE_META = {
  DEMAND:    { label: 'High Demand',      icon: '📈', badge: 'badge-amber' },
  TIME:      { label: 'Last Minute',      icon: '⏰', badge: 'badge-red'   },
  SEAT_TYPE: { label: 'Seat Type',        icon: '💺', badge: 'badge-blue'  },
  CLASS:     { label: 'Cabin Class',      icon: '🎫', badge: 'badge-blue'  },
};

const conditionSummary = (rule) => {
  switch (rule.type) {
    case 'DEMAND':    return `Occupancy ≥ ${rule.condition?.threshold}%`;
    case 'TIME':      return `Within ${rule.condition?.hoursBeforeDeparture}h of departure`;
    case 'SEAT_TYPE': return `Seat type: ${rule.condition?.seatType}`;
    case 'CLASS':     return `Cabin class: ${rule.condition?.class}`;
    default:          return '—';
  }
};

const INITIAL_FLIGHT_FORM = {
  flightNumber: '', airline: '', airlineCode: '',
  sourceCity: '', sourceCode: '',
  destinationCity: '', destinationCode: '',
  departureTime: '', arrivalTime: '',
  basePrice: '', rows: 20, columns: 6, businessRows: 3, aircraft: 'Airbus A320',
};

const INITIAL_RULE_FORM = {
  name: '', description: '', type: 'DEMAND', charge: '',
  isActive: true,
  // condition sub-fields
  threshold: '', hoursBeforeDeparture: '', seatType: 'WINDOW', class: 'ECONOMY',
};

const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');

  const [stats, setStats] = useState(null);

  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [flightForm, setFlightForm] = useState(INITIAL_FLIGHT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const [rules, setRules]             = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm]       = useState(INITIAL_RULE_FORM);
  const [editRuleId, setEditRuleId]   = useState(null);

  useEffect(() => {
    loadStats();
    if (tab === 'flights') loadFlights();
    if (tab === 'bookings') loadBookings();
    if (tab === 'pricing')  loadRules();
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

  const loadRules = async () => {
    try { setLoading(true); const r = await getPricingRules(); setRules(r.data.rules); }
    catch { toast.error('Failed to load pricing rules'); }
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
        const payload = {
  flightNumber: flightForm.flightNumber,
  airline: flightForm.airline,
  airlineCode: flightForm.airlineCode,

  sourceCity: flightForm.sourceCity,
  sourceCode: flightForm.sourceCode,
  destinationCity: flightForm.destinationCity,
  destinationCode: flightForm.destinationCode,

  departureTime: flightForm.departureTime,
  arrivalTime: flightForm.arrivalTime,

  basePrice: Number(flightForm.basePrice),

  rows: Number(flightForm.rows),
  columns: Number(flightForm.columns),
  businessRows: Number(flightForm.businessRows),

  aircraft: flightForm.aircraft,
};

await createFlight(payload);
console.log("SENDING FLIGHT:", payload);
        toast.success('Flight created with 60 seats!');
      }
      setFlightForm(INITIAL_FLIGHT_FORM);
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
      rows: flight.rows,
      columns: flight.columns, 
      businessRows: flight.businessRows,
      aircraft: flight.aircraft,
    });
    setEditId(flight._id);
    setShowAddFlight(true);
  };

  const ff = (field, val) => setFlightForm(f => ({ ...f, [field]: val }));

  const buildCondition = (form) => {
    switch (form.type) {
      case 'DEMAND':    return { threshold: Number(form.threshold) };
      case 'TIME':      return { hoursBeforeDeparture: Number(form.hoursBeforeDeparture) };
      case 'SEAT_TYPE': return { seatType: form.seatType };
      case 'CLASS':     return { class: form.class };
      default:          return {};
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const payload = {
      name:        ruleForm.name,
      description: ruleForm.description,
      type:        ruleForm.type,
      charge:      Number(ruleForm.charge),
      isActive:    ruleForm.isActive,
      condition:   buildCondition(ruleForm),
    };
    try {
      setSubmitting(true);
      if (editRuleId) {
        await updatePricingRule(editRuleId, payload);
        toast.success('Pricing rule updated!');
        setEditRuleId(null);
      } else {
        await createPricingRule(payload);
        toast.success('Pricing rule created!');
      }
      setRuleForm(INITIAL_RULE_FORM);
      setShowRuleForm(false);
      loadRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    } finally { setSubmitting(false); }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this pricing rule?')) return;
    try { await deletePricingRule(id); toast.success('Rule deleted'); loadRules(); }
    catch { toast.error('Failed to delete rule'); }
  };

  const handleEditRule = (rule) => {
    setRuleForm({
      name:               rule.name,
      description:        rule.description || '',
      type:               rule.type,
      charge:             rule.charge,
      isActive:           rule.isActive,
      threshold:          rule.condition?.threshold ?? '',
      hoursBeforeDeparture: rule.condition?.hoursBeforeDeparture ?? '',
      seatType:           rule.condition?.seatType || 'WINDOW',
      class:              rule.condition?.class || 'ECONOMY',
    });
    setEditRuleId(rule._id);
    setShowRuleForm(true);
  };

  const handleToggleRule = async (rule) => {
    try {
      await updatePricingRule(rule._id, { isActive: !rule.isActive });
      toast.success(`Rule ${rule.isActive ? 'disabled' : 'enabled'}`);
      loadRules();
    } catch { toast.error('Failed to toggle rule'); }
  };

  const rf = (field, val) => setRuleForm((r) => ({ ...r, [field]: val }));

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
              <button className="btn btn-primary" onClick={() => { setShowAddFlight(true); setEditId(null); setFlightForm(INITIAL_FLIGHT_FORM); }}>
                + Add Flight
              </button>
            )}
            {tab === 'pricing' && (
              <button
                className="btn btn-primary"
                onClick={() => { setShowRuleForm(true); setEditRuleId(null); setRuleForm(INITIAL_RULE_FORM); }}
              >
                + Add Rule
              </button>
            )}
          </div>
          <div className="admin-tabs">
            {[['overview','Overview'],['flights','Flights'],['bookings','Bookings'],['pricing',  'Pricing Rules']].map(([v,l]) => (
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
                  <li>Go to <strong>Pricing Rules</strong> tab to configure dynamic surcharges</li>
                  <li>Seats are auto-generated when a flight is created</li>
                </ul>
              </div>
              <div className="card admin-info-card">
                <h3>Pricing Rules</h3>
                <ul>
                  <li><strong>High Demand</strong> — surcharge when occupancy exceeds a threshold %</li>
                  <li><strong>Last Minute</strong> — surcharge when booking within N hours of departure</li>
                  <li><strong>Seat Type</strong> — per-seat charge for Window, Middle, or Aisle seats</li>
                  <li><strong>Cabin Class</strong> — per-seat charge for Economy or Business seats</li>
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
                  <div className="form-group"><label className="form-label">Flight Number</label>
                    <input className="form-input" placeholder="FW101" value={flightForm.flightNumber} onChange={e => ff('flightNumber', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Airline Name</label>
                    <input className="form-input" placeholder="FlyWise Air" value={flightForm.airline} onChange={e => ff('airline', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Airline Code</label>
                    <input className="form-input" placeholder="FW" maxLength={3} value={flightForm.airlineCode} onChange={e => ff('airlineCode', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Aircraft</label>
                    <input className="form-input" placeholder="Airbus A320" value={flightForm.aircraft} onChange={e => ff('aircraft', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Source City</label>
                    <input className="form-input" placeholder="Mumbai" value={flightForm.sourceCity} onChange={e => ff('sourceCity', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Source Code</label>
                    <input className="form-input" placeholder="BOM" maxLength={3} value={flightForm.sourceCode} onChange={e => ff('sourceCode', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Destination City</label>
                    <input className="form-input" placeholder="Delhi" value={flightForm.destinationCity} onChange={e => ff('destinationCity', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Destination Code</label>
                    <input className="form-input" placeholder="DEL" maxLength={3} value={flightForm.destinationCode} onChange={e => ff('destinationCode', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Departure Time</label>
                    <input className="form-input" type="datetime-local" value={flightForm.departureTime} onChange={e => ff('departureTime', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Arrival Time</label>
                    <input className="form-input" type="datetime-local" value={flightForm.arrivalTime} onChange={e => ff('arrivalTime', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Base Price (₹)</label>
                    <input className="form-input" type="number" placeholder="5000" min="100" value={flightForm.basePrice} onChange={e => ff('basePrice', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Rows</label>
                    <input className="form-input" type="number" placeholder="20" min="2" max="60" value={flightForm.rows} onChange={e => ff('rows', e.target.value ? parseInt(e.target.value) : '')} required />
                    <span className="form-hint">Total seat rows (default 20 → 120 seats)</span></div>
                  <div className="form-group"><label className="form-label">Columns</label>
                    <input className="form-input" type="number" placeholder="6" min="2" max="10" value={flightForm.columns} onChange={e => ff('columns', e.target.value ? parseInt(e.target.value) : '')} required />
                    <span className="form-hint">Seats per row (e.g. 6 = A B C | D E F)</span></div>
                  <div className="form-group"><label className="form-label">Business Class Rows</label>
                    <input className="form-input" type="number" placeholder="3" min="0" value={flightForm.businessRows} onChange={e => ff('businessRows', e.target.value ? parseInt(e.target.value) : '')} required />
                    <span className="form-hint">First N rows will be Business class</span></div>
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
                            {f.rows ?? 20}r × {f.columns ?? 6}c
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
         {tab === 'pricing' && (
          <div>
            {/* Add / Edit rule form */}
            {showRuleForm && (
              <div className="add-flight-form card">
                <div className="aff-header">
                  <h3>{editRuleId ? 'Edit Pricing Rule' : 'Add Pricing Rule'}</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowRuleForm(false); setEditRuleId(null); }}>✕ Close</button>
                </div>
                <form onSubmit={handleSaveRule} className="aff-grid">
                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label">Rule Name</label>
                    <input className="form-input" placeholder="e.g. Peak Season Demand" value={ruleForm.name} onChange={e => rf('name', e.target.value)} required />
                  </div>

                  {/* Type */}
                  <div className="form-group">
                    <label className="form-label">Rule Type</label>
                    <select className="form-input" value={ruleForm.type} onChange={e => rf('type', e.target.value)}>
                      <option value="DEMAND">High Demand (occupancy %)</option>
                      <option value="TIME">Last Minute (hours before departure)</option>
                      <option value="SEAT_TYPE">Seat Type (Window / Middle / Aisle)</option>
                      <option value="CLASS">Cabin Class (Economy / Business)</option>
                    </select>
                  </div>

                  {/* Surcharge amount */}
                  <div className="form-group">
                    <label className="form-label">Surcharge (₹)</label>
                    <input className="form-input" type="number" min="0" placeholder="1000" value={ruleForm.charge} onChange={e => rf('charge', e.target.value ? parseInt(e.target.value) : '')} required />
                  </div>

                  {/* Active toggle */}
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={ruleForm.isActive ? 'true' : 'false'} onChange={e => rf('isActive', e.target.value === 'true')}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  {/* Condition fields — rendered based on type */}
                  {ruleForm.type === 'DEMAND' && (
                    <div className="form-group">
                      <label className="form-label">Occupancy Threshold (%)</label>
                      <input className="form-input" type="number" min="1" max="100" placeholder="70" value={ruleForm.threshold} onChange={e => rf('threshold', e.target.value ? parseInt(e.target.value) : '')}required />
                      <span className="form-hint">Surcharge applies when seats booked ≥ this %</span>
                    </div>
                  )}
                  {ruleForm.type === 'TIME' && (
                    <div className="form-group">
                      <label className="form-label">Hours Before Departure</label>
                      <input className="form-input" type="number" min="1" placeholder="48" value={ruleForm.hoursBeforeDeparture} onChange={e => rf('hoursBeforeDeparture', e.target.value ? parseInt(e.target.value) : '')} required />
                      <span className="form-hint">Surcharge applies when booking within this window</span>
                    </div>
                  )}
                  {ruleForm.type === 'SEAT_TYPE' && (
                    <div className="form-group">
                      <label className="form-label">Seat Type</label>
                      <select className="form-input" value={ruleForm.seatType} onChange={e => rf('seatType', e.target.value)}>
                        <option value="WINDOW">Window</option>
                        <option value="MIDDLE">Middle</option>
                        <option value="AISLE">Aisle</option>
                      </select>
                    </div>
                  )}
                  {ruleForm.type === 'CLASS' && (
                    <div className="form-group">
                      <label className="form-label">Cabin Class</label>
                      <select className="form-input" value={ruleForm.class} onChange={e => rf('class', e.target.value)}>
                        <option value="ECONOMY">Economy</option>
                        <option value="BUSINESS">Business</option>
                      </select>
                    </div>
                  )}

                  {/* Description (optional, spans full width) */}
                  <div className="form-group aff-full">
                    <label className="form-label">Description (optional)</label>
                    <input className="form-input" placeholder="Short note about this rule" value={ruleForm.description} onChange={e => rf('description', e.target.value)} />
                  </div>

                  <div className="aff-submit">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? <><div className="spinner" /> Saving...</> : editRuleId ? 'Update Rule' : 'Create Rule'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowRuleForm(false); setEditRuleId(null); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
                        {/* Rules list */}
            {loading ? (
              <div className="admin-loading"><div className="spinner spinner-lg" /></div>
            ) : rules.length === 0 ? (
              <div className="card admin-empty">
                <div className="empty-icon">📋</div>
                <p>No pricing rules yet. Click <strong>+ Add Rule</strong> to create one.</p>
                <p className="empty-hint">Until at least one rule exists, hardcoded fallback values will be used.</p>
              </div>
            ) : (
              <div className="pricing-rules-grid">
                {rules.map(rule => {
                  const meta = RULE_TYPE_META[rule.type] || {};
                  return (
                    <div key={rule._id} className={`card pricing-rule-card${rule.isActive ? '' : ' rule-inactive'}`}>
                      <div className="prc-header">
                        <div className="prc-title-row">
                          <span className="prc-icon">{meta.icon}</span>
                          <div>
                            <div className="prc-name">{rule.name}</div>
                            {rule.description && <div className="prc-desc">{rule.description}</div>}
                          </div>
                        </div>
                        <div className="prc-badges">
                          <span className={`badge ${meta.badge}`}>{meta.label}</span>
                          <span className={`badge ${rule.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="prc-body">
                        <div className="prc-detail"><span>Condition</span><strong>{conditionSummary(rule)}</strong></div>
                        <div className="prc-detail"><span>Surcharge</span><strong className="prc-charge">+₹{rule.charge.toLocaleString('en-IN')}</strong></div>
                      </div>
                      <div className="prc-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => handleToggleRule(rule)}>
                          {rule.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleEditRule(rule)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRule(rule._id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
