import React, { useState } from 'react';
import { createBooking } from '../utils/api';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const bookingData = location.state?.bookingData;

  if (!bookingData) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Session expired</h2>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [showUpiPin, setShowUpiPin] = useState(false);
  const [upiPin, setUpiPin] = useState('');

  const [card, setCard] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const [selectedBank, setSelectedBank] = useState('');
  const [bankLogin, setBankLogin] = useState({
    userId: '',
    password: ''
  });

  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(bookingData.totalPrice);
  const [method, setMethod] = useState('UPI');

  const applyPromo = async () => {
    try {
      const res = await axios.post('/api/promo/apply', {
        code: promo,
        totalPrice: bookingData.totalPrice,
        isStudent: true
      });

      setDiscount(res.data.discount);
      setFinalPrice(res.data.finalPrice);
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid promo');
    }
  };

  const handleUpiVerify = () => {
    if (!upiId.includes('@')) {
      alert('Invalid UPI ID');
      return;
    }
    setUpiVerified(true);
  };

  const handlePayment = async () => {
  // validations
  if (method === 'UPI') {
    if (!upiVerified) return alert('Verify UPI');
    if (!showUpiPin) return setShowUpiPin(true);
    if (upiPin.length !== 4) return alert('Invalid PIN');
  }

  if (method === 'Card') {
    if (!card.number || !card.cvv || !card.expiry) {
      return alert('Fill card details');
    }
  }

  if (method === 'NetBanking') {
    if (!selectedBank || !bankLogin.userId || !bankLogin.password) {
      return alert('Complete bank login');
    }
  }

  try {
    const groupId = "RT-" + Date.now();

    const outboundTotal =
  (bookingData.outboundPricing?.totalPrice || 0) +
  (bookingData.addOns?.outbound?.reduce((s, i) => s + i.price, 0) || 0);

const returnTotal =
  (bookingData.returnPricing?.totalPrice || 0) +
  (bookingData.addOns?.return?.reduce((s, i) => s + i.price, 0) || 0);

await Promise.all([

  // always creates outbound
  createBooking({
    flightId: bookingData.outbound?._id || bookingData.flight._id,
    seatNumbers: bookingData.outboundSeats || bookingData.seatNumbers,
    passengers: bookingData.passengers,
    addOns: bookingData.addOns.outbound||[],
    totalPrice: outboundTotal,
    discount,
    groupId,
    priceBreakdown: {
    basePrice: bookingData.outboundPricing?.basePrice,
    taxes: bookingData.outboundPricing?.taxes,
    mealTotal: bookingData.addOns?.outbound?.filter(a => a.type === 'MEAL').reduce((s,i)=>s+i.price,0) || 0,
    baggageTotal: bookingData.addOns?.outbound?.filter(a => a.type === 'BAGGAGE').reduce((s,i)=>s+i.price,0) || 0,
    totalPrice: outboundTotal
  }
  }),

  //only create return if exists
  bookingData.return
    ? createBooking({
        flightId: bookingData.return._id,
        seatNumbers: bookingData.returnSeats,
        passengers: bookingData.passengers,
        addOns: bookingData.addOns.return||[],
        totalPrice: returnTotal,
        discount,
        groupId,
        priceBreakdown: {
    basePrice: bookingData.returnPricing?.basePrice,
    taxes: bookingData.returnPricing?.taxes,
    mealTotal: bookingData.addOns?.return?.filter(a => a.type === 'MEAL').reduce((s,i)=>s+i.price,0) || 0,
    baggageTotal: bookingData.addOns?.return?.filter(a => a.type === 'BAGGAGE').reduce((s,i)=>s+i.price,0) || 0,
    totalPrice: returnTotal
  }

      })
    : Promise.resolve()

]);

  alert("Trip Booked  &  Payment successful! 🎉");

    navigate('/dashboard');

  }catch (err) {
  console.log("BOOKING ERROR:", err.response?.data || err);
  alert(err.response?.data?.message || 'Booking failed');
}
};

  return (
    <div className="payment-container">

      {/* LEFT */}
      <div className="payment-left">

        {/* PROMO */}
        <div className="card">
          <h3>Apply Promo Code</h3>

          <div className="promo-box">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Enter code"
            />
            <button onClick={applyPromo}>Apply</button>
          </div>
        </div>

        {/* METHODS */}
        <div className="card">
          <h3>Payment Method</h3>

          <div className="payment-options">
            {['UPI', 'Card', 'NetBanking'].map(m => (
              <div
                key={m}
                className={`method-tile ${method === m ? 'active' : ''}`}
                onClick={() => setMethod(m)}
              >
                {m}
              </div>
            ))}
          </div>

          {/* FORMS */}
          <div className="payment-form">

            {/* UPI */}
            {method === 'UPI' && (
              <div className="upi-form">

                <input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="Enter UPI ID"
                />

                <button
                  type="button"
                  onClick={handleUpiVerify}
                  className="verify-btn"
                >
                  {upiVerified ? 'Verified ✓' : 'Verify'}
                </button>

                {showUpiPin && (
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter UPI PIN"
                    value={upiPin}
                    onChange={(e) => setUpiPin(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* CARD */}
            {method === 'Card' && (
              <div className="card-form">
                <input
                  placeholder="Card Number"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: e.target.value })}
                />

                <div className="card-row">
                  <input
                    placeholder="MM/YY"
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  />
                  <input
                    placeholder="CVV"
                    value={card.cvv}
                    onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  />
                </div>

                <input
                  placeholder="Card Holder Name"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                />
              </div>
            )}

            {/* NET BANKING */}
            {method === 'NetBanking' && (
              <div className="netbanking-form">

                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                >
                  <option value="">Select Bank</option>
                  <option value="SBI">SBI</option>
                  <option value="HDFC">HDFC</option>
                  <option value="ICICI">ICICI</option>
                </select>

                {selectedBank && (
                  <>
                    <input
                      placeholder="User ID"
                      value={bankLogin.userId}
                      onChange={(e) =>
                        setBankLogin({ ...bankLogin, userId: e.target.value })
                      }
                    />

                    <input
                      type="password"
                      placeholder="Password"
                      value={bankLogin.password}
                      onChange={(e) =>
                        setBankLogin({ ...bankLogin, password: e.target.value })
                      }
                    />
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="payment-right">
        <div className="card summary-card">

          <h3>Payment Summary</h3>

          <div className="price-row">
            <span>Total</span>
            <span>₹{bookingData.totalPrice}</span>
          </div>

          <div className="price-row discount">
            <span>Discount</span>
            <span>-₹{discount}</span>
          </div>

          <hr />

          <div className="price-total">
            ₹{finalPrice}
          </div>

          <button className="pay-btn" onClick={handlePayment}>
            Pay ₹{finalPrice}
          </button>

        </div>
      </div>

    </div>
  );
};

export default PaymentPage;