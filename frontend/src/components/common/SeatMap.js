import React, { useEffect, useState } from 'react';
import { getSeats } from '../../utils/api';
import toast from 'react-hot-toast';
import './SeatMap.css';

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

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

  const getSeat = (row, col) => seats.find(s => s.row === row && s.column === col);
  const maxRow = Math.max(...seats.map(s => s.row), 0);

  const getSeatClass = (seat) => {
    if (!seat) return 'seat-empty';
    if (seat.status === 'CONFIRMED') return 'seat-confirmed';

    // show locked visually but still clickable
    if (seat.status === 'LOCKED' && seat.lockedBy !== userId)
      return 'seat-locked';

    if (selected.includes(seat.seatNumber)) return 'seat-selected';
    if (seat.seatType === 'WINDOW') return 'seat-window';
    if (seat.seatType === 'AISLE') return 'seat-aisle';

    return 'seat-available';
  };

  const handleSeatClick = (seat) => {
    if (!seat) return;
    if (seat.status === 'CONFIRMED') return;

    // ❗ allow click even if LOCKED (since we lock later)
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

    // 🔥 MOST IMPORTANT: update parent
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
        <div className="legend-item"><div className="legend-box seat-window" /> Window (+₹300)</div>
        <div className="legend-item"><div className="legend-box seat-aisle" /> Aisle (+₹150)</div>
        <div className="legend-item"><div className="legend-box seat-available" /> Middle</div>
        <div className="legend-item"><div className="legend-box seat-selected" /> Selected</div>
        <div className="legend-item"><div className="legend-box seat-confirmed" /> Booked</div>
        <div className="legend-item"><div className="legend-box seat-locked" /> Locked</div>
      </div>

      <div className="airplane-body">
        <div className="airplane-nose">✈ Front of Aircraft</div>

        {/* Column headers */}
        <div className="seat-row header-row">
          <div className="row-num" />
          {COLS.map((col, i) => (
            <React.Fragment key={col}>
              {i === 3 && <div className="aisle-gap" />}
              <div className="col-header">{col}</div>
            </React.Fragment>
          ))}
        </div>

        {/* Seat rows */}
        {Array.from({ length: maxRow }, (_, i) => i + 1).map(row => (
          <div key={row} className={`seat-row ${row <= 3 ? 'business-row' : ''}`}>
            <div className="row-num">{row}</div>
            {COLS.map((col, ci) => {
              const seat = getSeat(row, col);
              return (
                <React.Fragment key={col}>
                  {ci === 3 && <div className="aisle-gap" />}
                  <button
                    className={`seat ${getSeatClass(seat)}`}
                    onClick={() => handleSeatClick(seat)}
                    title={seat ? `${seat.seatNumber} - ${seat.seatType} (${seat.status})` : ''}
                    disabled={
  !seat ||
  seat.status === 'CONFIRMED' ||
  (seat.status === 'LOCKED' && !selected.includes(seat.seatNumber))
}
                  >
                    {row <= 3 ? '★' : ''}
                  </button>
                </React.Fragment>
              );
            })}
            {row === 3 && <div className="class-divider-label">— Economy Class —</div>}
          </div>
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