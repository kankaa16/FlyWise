import React, { useEffect, useState } from 'react';
import { getSeats } from '../../utils/api';
import toast from 'react-hot-toast';
import './SeatMap.css';

const DEFAULT_COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEFAULT_ROWS = 20;

const SeatMap = ({ flightId, maxSeats = 1, onSeatsSelected, userId }) => {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeats();
  }, [flightId]);

  const loadSeats = async () => {
    try {
      setLoading(true);
      const res = await getSeats(flightId);
      setSeats(res.data.seats);
    } catch {
      toast.error('Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  // Derive columns and rows dynamically from seat data; fall back to defaults
  const cols = seats.length > 0
    ? [...new Set(seats.map(s => s.column))].sort()
    : DEFAULT_COLS;

  const maxRow = seats.length > 0
    ? Math.max(...seats.map(s => s.row))
    : DEFAULT_ROWS;

  const lastBusinessRow = Math.max(
    ...seats.filter(s => s.class === 'BUSINESS').map(s => s.row),
    0
  );

  const getSeat = (row, col) => seats.find(s => s.row === row && s.column === col);

  // Aisle sits between the two centre columns (after index floor(cols/2) - 1)
  const aisleAfter = Math.floor(cols.length / 2) - 1;

  const getSeatClass = (seat) => {
    if (!seat) return 'seat-empty';
    if (seat.status === 'CONFIRMED') return 'seat-confirmed';
    if (seat.status === 'LOCKED' && seat.lockedBy?.toString() !== userId?.toString())
      return 'seat-locked';
    if (selected.includes(seat.seatNumber)) return 'seat-selected';
    if (seat.class === 'BUSINESS') return 'seat-business';
    return 'seat-available';
  };

  const handleSeatClick = (seat) => {
    if (!seat) return;
    if (seat.status === 'CONFIRMED') return;
    if (seat.status === 'LOCKED' && !selected.includes(seat.seatNumber)) return;

    let newSelected;
    if (selected.includes(seat.seatNumber)) {
      newSelected = selected.filter(s => s !== seat.seatNumber);
    } else {
      if (selected.length >= maxSeats) {
        toast.error(`You can select at most ${maxSeats} seat(s)`);
        return;
      }
      newSelected = [...selected, seat.seatNumber];
    }

    setSelected(newSelected);
    onSeatsSelected(newSelected);
  };

  if (loading) {
    return (
      <div className="seat-map-loading">
        <div className="spinner spinner-lg" />
        <p>Loading seat map...</p>
      </div>
    );
  }

  return (
    <div className="seat-map-wrap">
      {/* Legend */}
      <div className="seat-legend">
        <div className="legend-item"><div className="legend-box seat-business" /> Business</div>
        <div className="legend-item"><div className="legend-box seat-available" /> Economy</div>
        <div className="legend-item"><div className="legend-box seat-selected" /> Selected</div>
        <div className="legend-item"><div className="legend-box seat-confirmed" /> Booked</div>
        <div className="legend-item"><div className="legend-box seat-locked" /> Locked</div>
      </div>

      <div className="airplane-body">
        <div className="airplane-nose">✈ Front of Aircraft</div>

        {/* Column headers — widths match .seat exactly */}
        <div className="seat-row header-row">
          <div className="row-num" />
          {cols.map((col, i) => (
            <React.Fragment key={col}>
              {i === aisleAfter + 1 && <div className="aisle-gap" />}
              <div className="col-header">{col}</div>
            </React.Fragment>
          ))}
        </div>

        {/* Seat rows */}
        {Array.from({ length: maxRow }, (_, i) => i + 1).map(row => (
          <React.Fragment key={row}>
            {row === 1 && (
              <div className="class-section-label business-label">✦ Business Class</div>
            )}
            {lastBusinessRow > 0 && row === lastBusinessRow + 1 && (
              <div className="class-section-label economy-label">— Economy Class —</div>
            )}

            <div className={`seat-row ${row <= lastBusinessRow ? 'business-row' : ''}`}>
              <div className="row-num">{row}</div>
              {cols.map((col, ci) => {
                const seat = getSeat(row, col);
                return (
                  <React.Fragment key={col}>
                    {ci === aisleAfter + 1 && <div className="aisle-gap" />}
                    <button
                      className={`seat ${getSeatClass(seat)}`}
                      onClick={() => handleSeatClick(seat)}
                      title={seat ? `${seat.seatNumber} — ${seat.seatType} — ${seat.class} (${seat.status})` : ''}
                      disabled={
                        !seat ||
                        seat.status === 'CONFIRMED' ||
                        (seat.status === 'LOCKED' && !selected.includes(seat.seatNumber))
                      }
                    >
                      <span className="seat-num">{seat ? seat.seatNumber : ''}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        <div className="airplane-tail">🚪 Exit</div>
      </div>

      {selected.length > 0 && (
        <div className="selected-summary">
          <span>Selected: <strong>{selected.join(', ')}</strong></span>
          <span className="badge badge-blue">{selected.length}/{maxSeats} seat(s)</span>
        </div>
      )}
    </div>
  );
};

export default SeatMap;