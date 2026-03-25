import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchFlights } from '../utils/api';
import { useBooking } from '../context/BookingContext';
import FlightCard from '../components/common/FlightCard';
import toast from 'react-hot-toast';
import './Flights.css';

const SORT_OPTIONS = [['price', 'Cheapest'], ['duration', 'Fastest'], ['departure', 'Earliest']];

const sortList = (list, by) =>
  [...list].sort((a, b) => {
    if (by === 'price')     return (a.dynamicPrice || a.basePrice) - (b.dynamicPrice || b.basePrice);
    if (by === 'duration')  return a.duration - b.duration;
    if (by === 'departure') return new Date(a.departureTime) - new Date(b.departureTime);
    return 0;
  });

const SortBar = ({ current, onChange }) => (
  <div className="sort-bar">
    <span className="sort-label">Sort by:</span>
    {SORT_OPTIONS.map(([v, l]) => (
      <button
        key={v}
        className={`sort-btn${current === v ? ' active' : ''}`}
        onClick={() => onChange(v)}
      >
        {l}
      </button>
    ))}
  </div>
);

const Flights = () => {
  const navigate    = useNavigate();
  const [urlParams] = useSearchParams();
  const { setSelectedFlight, setSearchParams } = useBooking();

  const source      = urlParams.get('source')      || '';
  const destination = urlParams.get('destination') || '';
  const date        = urlParams.get('date')        || '';
  const passengers  = parseInt(urlParams.get('passengers') || '1');
  const tripType    = urlParams.get('tripType')    || 'one';
  const returnDate  = urlParams.get('returnDate')  || '';
  const isRoundTrip = tripType === 'round';

  const [loading, setLoading] = useState(true);

  // ── One-way state ─────────────────────────────────────────
  const [flights, setFlights]               = useState([]);
  const [sortBy, setSortBy]                 = useState('price');
  const [noFlightsOnDate, setNoFlightsOnDate] = useState(false);

  // ── Round-trip state ──────────────────────────────────────
  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights,   setReturnFlights]   = useState([]);
  const [outboundSort,    setOutboundSort]    = useState('price');
  const [returnSort,      setReturnSort]      = useState('price');
  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [selectedReturn,   setSelectedReturn]   = useState(null);
  const [rtMessage, setRtMessage] = useState('');

  useEffect(() => {
    setSearchParams({ source, destination, date, passengers });
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, destination, date, returnDate]);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setSelectedOutbound(null);
      setSelectedReturn(null);

      if (isRoundTrip) {
        const res = await searchFlights({ source, destination, date, passengers, returnDate });
        setOutboundFlights(res.data.outboundFlights || []);
        setReturnFlights(res.data.returnFlights     || []);
        setRtMessage(res.data.message || '');
      } else {
        let res = await searchFlights({ source, destination, date, passengers });
        if (date && res.data.flights.length === 0) {
          setNoFlightsOnDate(true);
          const altRes = await searchFlights({ source, destination, passengers });
          setFlights(altRes.data.flights);
        } else {
          setNoFlightsOnDate(false);
          setFlights(res.data.flights);
        }
      }
    } catch (err) {
      toast.error('Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  // Best-value = cheapest flight in the list
  const bestValueId = (list) => {
    if (!list.length) return null;
    return [...list].sort((a, b) => (a.dynamicPrice || a.basePrice) - (b.dynamicPrice || b.basePrice))[0]._id;
  };

  const outBestId = bestValueId(outboundFlights);
  const retBestId = bestValueId(returnFlights);

  const outboundPrice  = selectedOutbound ? (selectedOutbound.dynamicPrice || selectedOutbound.basePrice) : 0;
  const returnPrice    = selectedReturn   ? (selectedReturn.dynamicPrice   || selectedReturn.basePrice)   : 0;
  const combinedTotal  = selectedOutbound && selectedReturn ? (outboundPrice + returnPrice) * passengers : null;

  const toggleOutbound = (flight) =>
    setSelectedOutbound(prev => (prev?._id === flight._id ? null : flight));

  const toggleReturn = (flight) =>
    setSelectedReturn(prev => (prev?._id === flight._id ? null : flight));

  const handleContinueRoundTrip = () => {
    setSelectedFlight(selectedOutbound);
    navigate('/seats');
  };

  // ── Round-trip render ─────────────────────────────────────
  if (isRoundTrip) {
    const sortedOut = sortList(outboundFlights, outboundSort);
    const sortedRet = sortList(returnFlights,   returnSort);

    return (
      <div className="page-content flights-page">
        <div className="flights-header">
          <div className="section">
            <div className="flights-breadcrumb">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
            </div>
            <div className="flights-title-row">
              <div>
                <h1 className="flights-title">{source} ⇄ {destination}</h1>
                <p className="flights-meta">
                  Round Trip · {date || 'Any'} → {returnDate || 'Any'} · {passengers} passenger{passengers > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="section flights-content">
          {loading ? (
            <div className="flights-loading">
              <div className="spinner spinner-lg" />
              <p>Searching best flights for you...</p>
            </div>
          ) : (
            <>
              {rtMessage && <div className="no-date-warning">{rtMessage}</div>}

              {/* Outbound leg */}
              <div className="rt-section">
                <div className="rt-section-header">
                  <div className="rt-section-title">
                    <span className="rt-leg-badge rt-leg-badge--out">Outbound</span>
                    <span className="rt-route">{source} → {destination}</span>
                    {date && <span className="rt-date">{date}</span>}
                  </div>
                  <SortBar current={outboundSort} onChange={setOutboundSort} />
                </div>

                {sortedOut.length === 0 ? (
                  <div className="no-flights-inline">No outbound flights found for this date.</div>
                ) : (
                  <div className="flight-list">
                    {sortedOut.map(flight => (
                      <FlightCard
                        key={flight._id}
                        flight={flight}
                        passengers={passengers}
                        onSelect={toggleOutbound}
                        isSelected={selectedOutbound?._id === flight._id}
                        isBestValue={flight._id === outBestId}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Return leg */}
              <div className="rt-section">
                <div className="rt-section-header">
                  <div className="rt-section-title">
                    <span className="rt-leg-badge rt-leg-badge--ret">Return</span>
                    <span className="rt-route">{destination} → {source}</span>
                    {returnDate && <span className="rt-date">{returnDate}</span>}
                  </div>
                  <SortBar current={returnSort} onChange={setReturnSort} />
                </div>

                {sortedRet.length === 0 ? (
                  <div className="no-flights-inline">No return flights found for this date.</div>
                ) : (
                  <div className="flight-list">
                    {sortedRet.map(flight => (
                      <FlightCard
                        key={flight._id}
                        flight={flight}
                        passengers={passengers}
                        onSelect={toggleReturn}
                        isSelected={selectedReturn?._id === flight._id}
                        isBestValue={flight._id === retBestId}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sticky combined price bar */}
              {(selectedOutbound || selectedReturn) && (
                <div className="rt-combined-bar">
                  <div className="rt-combined-legs">
                    <div className={`rt-leg-chip${selectedOutbound ? ' rt-leg-chip--done' : ''}`}>
                      {selectedOutbound
                        ? `${source} → ${destination}: ₹${outboundPrice.toLocaleString('en-IN')}`
                        : 'Select outbound flight'}
                    </div>
                    <span className="rt-plus">+</span>
                    <div className={`rt-leg-chip${selectedReturn ? ' rt-leg-chip--done' : ''}`}>
                      {selectedReturn
                        ? `${destination} → ${source}: ₹${returnPrice.toLocaleString('en-IN')}`
                        : 'Select return flight'}
                    </div>
                  </div>

                  {combinedTotal && (
                    <div className="rt-total">
                      <span className="rt-total-label">Total for {passengers} pax</span>
                      <span className="rt-total-price">₹{combinedTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <button
                    className="btn btn-primary rt-continue-btn"
                    disabled={!selectedOutbound || !selectedReturn}
                    onClick={handleContinueRoundTrip}
                  >
                    {selectedOutbound && selectedReturn ? 'Continue to Seats →' : 'Select Both Flights'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── One-way render ────────────────────────────────────────
  const sorted = sortList(flights, sortBy);

  return (
    <div className="page-content flights-page">
      <div className="flights-header">
        <div className="section">
          <div className="flights-breadcrumb">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
          </div>
          <div className="flights-title-row">
            <div>
              <h1 className="flights-title">{source} → {destination}</h1>
              <p className="flights-meta">
                {date ? date : 'All Dates'} · {passengers} passenger{passengers > 1 ? 's' : ''}
              </p>
            </div>
            <SortBar current={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      <div className="section flights-content">
        {loading ? (
          <div className="flights-loading">
            <div className="spinner spinner-lg" />
            <p>Searching best flights for you...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="no-flights">
            <div className="no-flights-icon">✈️</div>
            <h3>No flights found</h3>
            <p>Try different dates or cities</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Search Again</button>
          </div>
        ) : (
          <>
            {noFlightsOnDate && (
              <div className="no-date-warning">
                ❌ No flights available on selected date
                <br />
                ✅ Showing flights on other dates
              </div>
            )}
            <div className="flight-list">
              {sorted.map((flight, i) => (
                <FlightCard
                  key={flight._id}
                  flight={flight}
                  passengers={passengers}
                  onSelect={(f) => { setSelectedFlight(f); navigate('/seats'); }}
                  isBestValue={i === 0 && sortBy === 'price'}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Flights;
