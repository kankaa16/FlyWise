import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { format } from 'date-fns';
import './Home.css';

const DEALS = [
  { from: 'Mumbai', to: 'Goa', price: '₹2,499', tag: 'Flash Sale', color: 'linear-gradient(135deg,#1a3a6e,#2d7dd2)' },
  { from: 'Delhi', to: 'Bangalore', price: '₹3,799', tag: 'Weekend Deal', color: 'linear-gradient(135deg,#0f4c75,#1b6ca8,#44b3c4)' },
  { from: 'Chennai', to: 'Mumbai', price: '₹2,999', tag: 'Monsoon Fare', color: 'linear-gradient(135deg,#1d5c63,#0f8b8d,#6bc5c7)' },
  { from: 'Hyderabad', to: 'Delhi', price: '₹4,199', tag: 'Early Bird', color: 'linear-gradient(135deg,#4a1060,#7b1fa2,#ce93d8)' },
  { from: 'Kolkata', to: 'Goa', price: '₹5,500', tag: 'Holiday Saver', color: 'linear-gradient(135deg,#b5451b,#e07a5f,#f4a261)' },
];

const PROMOS = [
  { title: 'Student Special', sub: 'Exclusively on FlyWise web & app', perks: [['10kg','Extra baggage'],['Zero','Change fee'],['10%','Off fares']], color: '#185FA5' },
  { title: 'Early Bird Offer', sub: 'Book 30 days ahead and save big', perks: [['₹2000','Instant savings'],['Free','Seat upgrade'],['2x','Reward points']], color: '#0F6E56' },
  { title: 'FlyWise Plus', sub: 'Perks for frequent flyers', perks: [['Priority','Boarding'],['Lounge','Access'],['15%','Off fares']], color: '#5C1AAB' },
  { title: 'Monsoon Sale', sub: 'Fly to your dream destination cheap', perks: [['40%','Off fares'],['Free','Cancellation'],['Extra','Miles']], color: '#B5451B' },
];

const DESTINATIONS = [
  { name: 'Mumbai', code: 'BOM', image: 'https://images.unsplash.com/photo-1666843527155-14ec5f016802?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFyaW5lJTIwZHJpdmV8ZW58MHx8MHx8fDA%3D', price: '₹2,500' },
  { name: 'Delhi', code: 'DEL', image: 'https://images.unsplash.com/photo-1597040663342-45b6af3d91a5?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZGVsaGl8ZW58MHx8MHx8fDA%3D', price: '₹3,200', isNew: true },
  { name: 'Goa', code: 'GOI', image: 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z29hfGVufDB8fDB8fHww', price: '₹2,200' },
  { name: 'Bangalore', code: 'BLR', image: 'https://images.unsplash.com/photo-1698332137428-3c4296198e8f?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFuZ2Fsb3JlfGVufDB8fDB8fHww', price: '₹2,800', isNew: true },
  { name: 'Hyderabad', code: 'HYD', image: 'https://images.unsplash.com/photo-1657981630164-769503f3a9a8?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aHlkZXJhYmFkfGVufDB8fDB8fHww', price: '₹3,100' },
  { name: 'Chennai', code: 'MAA', image: 'https://plus.unsplash.com/premium_photo-1697730420879-dc2a8dbaa31f?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2hlbm5haXxlbnwwfHwwfHx8MA%3D%3D', price: '₹2,600' },
  { name: 'Kolkata', code: 'CCU', image: 'https://images.unsplash.com/photo-1589041127168-9b1915731dc3?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGtvbGthdGF8ZW58MHx8MHx8fDA%3D', price: '₹3,400', isNew: true },
  { name: 'Jaipur', code: 'JAI', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8amFpcHVyfGVufDB8fDB8fHww', price: '₹2,900' },
  { name: 'Dubai', code: 'DXB', image: 'https://plus.unsplash.com/premium_photo-1697729914552-368899dc4757?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZHViYWl8ZW58MHx8MHx8fDA%3D', price: '₹12,000', isNew: true },
];

const Home = () => {
  const navigate = useNavigate();
  const { setSearchParams } = useBooking();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({ source: '', destination: '', date: '',returnDate: '', passengers: 1 });
  const [tripType, setTripType] = useState('one');
  const [promoIdx, setPromoIdx] = useState(0);
  const carouselRef = useRef(null);

  const handleSearch = (e) => {
  e.preventDefault();
  if (!form.source || !form.destination) return;

  if (tripType === 'round' && !form.returnDate) {
    alert("Select return date");
    return;
  }

  let url = `/flights?source=${encodeURIComponent(form.source)}&destination=${encodeURIComponent(form.destination)}&passengers=${form.passengers}&tripType=${tripType}`;

  if (form.date) url += `&date=${form.date}`;
  if (tripType === 'round') url += `&returnDate=${form.returnDate}`;

  navigate(url);
};

  const swap = () => setForm(f => ({ ...f, source: f.destination, destination: f.source }));

  const promo = PROMOS[promoIdx];

  return (
    <div className="sky-page home-page">
      {/* Clouds */}
      <div className="clouds-wrap">
        <div className="cloud c1" style={{ left: '3%' }} />
        <div className="cloud c2" style={{ left: '55%' }} />
        <div className="cloud c3" style={{ left: '25%' }} />
        <div className="cloud c4" style={{ left: '75%' }} />
        <div className="cloud c5" style={{ left: '10%' }} />
        <div className="cloud c6" style={{ left: '40%' }} />
      </div>

      {/* Hero */}
      <div className="home-hero">
        <div className="hero-badge-pill">✈ Smart Flight Booking</div>
        <h1 className="hero-heading">Fly <span>Smarter</span>,<br />Travel Further</h1>
        <p className="hero-sub">Search hundreds of airlines · Real-time pricing · Instant confirmation</p>
      </div>

      {/* Search Card */}
      <div className="search-card-wrap">
        <div className="card-glass search-card">
          <div className="trip-tabs">
            {['one', 'round'].map(t => (
              <button key={t} className={`trip-tab${tripType === t ? ' active' : ''}`} onClick={() => setTripType(t)}>
                {t === 'one' ? 'One Way' : t === 'round' ? 'Round Trip':""}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label className="form-label">From</label>
              <input className="form-input" placeholder="City or Airport" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} required />
            </div>
            <button type="button" className="swap-btn" onClick={swap} title="Swap">⇄</button>
            <div className="form-group">
              <label className="form-label">To</label>
              <input className="form-input" placeholder="City or Airport" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} required />
            </div>
            <div className="form-group">
  <label className="form-label">Departure</label>
  <input
    className="form-input"
    type="date"
    min={today}
    value={form.date}
    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
  />
</div>

{tripType === 'round' && (
  <div className="form-group">
    <label className="form-label">Return</label>
    <input
      className="form-input"
      type="date"
      min={form.date || today}
      value={form.returnDate}
      onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))}
    />
  </div>
)}
            <div className="form-group">
              <label className="form-label">Passengers</label>
              <select className="form-input" value={form.passengers} onChange={e => setForm(f => ({ ...f, passengers: parseInt(e.target.value) }))}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-lg search-submit">Search Flights</button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        {[['500+','Airlines'],['200+','Destinations'],['2M+','Happy Flyers'],['₹0','Booking Fees']].map(([n,l]) => (
          <div key={l} className="stat-item">
            <div className="stat-num">{n}</div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>

      {/* Rest on white */}
      <div className="home-sections">
        {/* Hot Deals */}
        <div className="section" id="deals">
          <div className="section-header">
            <div className="section-title">Hot Deals</div>
          </div>
          <div className="deals-scroll" ref={carouselRef}>
            {DEALS.map((deal, i) => (
              <div key={i} className="deal-card" style={{ background: deal.color }}>
                <span className="deal-tag">{deal.tag}</span>
                <div className="deal-route">{deal.from} → {deal.to}</div>
                <div className="deal-bottom">
                  <div>
                    <div className="deal-from">from</div>
                    <div className="deal-price">{deal.price}</div>
                  </div>
                  <button
  className="deal-btn"
  onClick={() => {
    const url = `/flights?source=${encodeURIComponent(deal.from)}&destination=${encodeURIComponent(deal.to)}&passengers=${form.passengers}`;
    navigate(url);
  }}
>
  Book Now
</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Destinations */}
         <div className="section">
          <div className="section-header">
            <div className="section-title"> Popular Destinations</div>
          </div>
          <div className="dest-row">
            {DESTINATIONS.map(d => (
              <div key={d.code} className="dest-card" onClick={() => setForm(f => ({ ...f, destination: d.name }))}>
                <div className="dest-circle">
                    <img src={d.image}></img>
                  {d.isNew && <span className="dest-new">New</span>}
                </div>
                <div className="dest-name">{d.name}</div>
                <div className="dest-price">{d.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo Banner */}
        <div className="section">
          <div className="promo-banner" style={{ background: promo.color }}>
            <div className="promo-left">
              <div className="promo-kicker">✦ Limited Time Offer</div>
              <div className="promo-title">{promo.title}</div>
              <div className="promo-sub">{promo.sub}</div>
              <div className="promo-perks">
                {promo.perks.map(([val, label]) => (
                  <div key={label} className="promo-perk">
                    <span className="perk-val">{val}</span>
                    <span className="perk-label">{label}</span>
                  </div>
                ))}
              </div>
              <button className="btn promo-btn">Claim Offer</button>
            </div>
            <div className="promo-dots">
              {PROMOS.map((_, i) => (
                <div key={i} className={`pdot${promoIdx === i ? ' active' : ''}`} onClick={() => setPromoIdx(i)} />
              ))}
            </div>
          </div>
        </div>

        {/* Why FlyWise */}
        <div className="section why-section">
          <div className="section-header">
            <div className="section-title">Why FlyWise?</div>
          </div>
          <div className="features-grid">
            {[
              ['/passenger.png', 'Smart Seat Selection', 'Choose window, aisle, or extra legroom with live availability', '#E6F1FB'],
              ['/flying-money.png', 'Best Price Guarantee', 'Dynamic pricing engine finds the sharpest fares on every route', '#E1F5EE'],
              ['/padlock.png', 'Instant Seat Lock', 'Seats lock the moment you select — no race conditions, ever', '#FAEEDA'],
              ['/cancel.png', 'Easy Cancellations', 'Cancel or modify bookings anytime with zero hassle', '#FAECE7'],
            ].map(([icon, title, desc, bg]) => (
              <div key={title} className="feature-card">
                <div className="feature-icon" style={{ background: bg }}><img src={icon} alt={title} className="feature-img" /></div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <div className="footer-logo">
          <span className="footer-logo-icon">✈</span> FlyWise
        </div>
        <div className="footer-links">
          <a href="#deals">Deals</a>
          <a href="#!">Privacy</a>
          <a href="#!">Terms</a>
          <a href="#!">Contact</a>
        </div>
        <p className="footer-copy">© 2025 FlyWise · Smart Flight Booking</p>
      </footer>
    </div>
  );
};

export default Home;
