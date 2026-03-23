import React from 'react';
import { format } from 'date-fns';
import './FlightCard.css';

const formatDur = (mins) => `${Math.floor(mins/60)}h ${mins%60}m`;
const fmt = (d) => format(new Date(d), 'HH:mm');
const fmtDate = (d) => format(new Date(d), 'dd MMM');

const AirlineIcon = ({ code }) => {
  const colors = { FW: '#185FA5', SJ: '#1D9E75', IW: '#D85A30', AB: '#7B1FA2' };
  const bg = colors[code] || '#185FA5';
  return (
    <div className="airline-icon" style={{ background: bg }}>
      {code}
    </div>
  );
};

const FlightCard = ({ flight, onSelect, passengers = 1 }) => {
  const price = flight.basePrice;
  const pb = flight.priceBreakdown;
  const hasSurcharge = pb && (pb.demandSurcharge > 0 || pb.lastMinuteSurcharge > 0);

  return (
    <div className="flight-card">
      <div className="fc-airline">
        <AirlineIcon code={flight.airlineCode} />
        <div>
          <div className="fc-airline-name">{flight.airline}</div>
          <div className="fc-flight-num">{flight.flightNumber} · {flight.aircraft}</div>
        </div>
      </div>

      <div className="fc-route">
        <div className="fc-time-block">
          <div className="fc-time">{fmt(flight.departureTime)}</div>
          <div className="fc-city">{flight.source.code}</div>
          <div className="fc-city-name">{flight.source.city}</div>
        </div>

        <div className="fc-middle">
          <div className="fc-duration">{formatDur(flight.duration)}</div>
          <div className="fc-line">
            <div className="fc-dot" />
            <div className="fc-dashes" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="var(--blue-400)"/>
            </svg>
          </div>
          <div className="fc-nonstop">Non-stop</div>
        </div>

        <div className="fc-time-block right">
          <div className="fc-time">{fmt(flight.arrivalTime)}</div>
          <div className="fc-city">{flight.destination.code}</div>
          <div className="fc-city-name">{flight.destination.city}</div>
        </div>
      </div>

      <div className="fc-right">
        <div className="fc-price-block">
          <div className="fc-price">₹{price?.toLocaleString('en-IN')}</div>
          <div className="fc-price-note">per person · incl. taxes</div>
          {hasSurcharge && (
            <div className="fc-surcharge-tags">
              {pb.demandSurcharge > 0 && <span className="badge badge-amber">High Demand</span>}
              {pb.lastMinuteSurcharge > 0 && <span className="badge badge-red">Last Minute</span>}
            </div>
          )}
        </div>

        <div className="fc-meta">
          <span className={`badge ${flight.availableSeats < 10 ? 'badge-red' : 'badge-green'}`}>
            {flight.availableSeats} seats left
          </span>
        </div>

        <button className="btn btn-primary fc-select-btn" onClick={() => onSelect(flight)}>
          Select Flight →
        </button>
      </div>
    </div>
  );
};

export default FlightCard;
