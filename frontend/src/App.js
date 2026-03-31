import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import Navbar from './components/layout/Navbar';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';

//pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Flights from './pages/Flights';
import SeatSelection from './pages/SeatSelection';
import SeatSelectionRound from './pages/SeatSelectionRound';
import BookingSummaryRound from './pages/BookingSummaryRound';
import BookingSummary from './pages/BookingSummary';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AddOnsSection from './pages/AddOnsSection';
import PaymentPage from './pages/PaymentPage';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              },
              success: {
                iconTheme: { primary: '#1D9E75', secondary: 'white' },
              },
              error: {
                iconTheme: { primary: '#E24B4A', secondary: 'white' },
              },
            }}
          />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/flights" element={<Flights />} />
            <Route
              path="/seats"
              element={
                <ProtectedRoute>
                  <SeatSelection />
                </ProtectedRoute>
              }
            /><Route path="/seats-round" element={<SeatSelectionRound />} />
<Route path="/summary-round" element={<BookingSummaryRound />} />
            <Route
              path="/booking-summary"
              element={
                <ProtectedRoute>
                  <BookingSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/addons"
            element={
              <ProtectedRoute>
                <AddOnsSection/>
              </ProtectedRoute>
            }
          ></Route>
          <Route path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage/>
              </ProtectedRoute>
            }
          
            ></Route>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="*"
              element={
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:'16px' }}>
                  <div style={{ fontSize:'56px' }}>✈️</div>
                  <h2 style={{ fontFamily:'Sora,sans-serif', color:'#042C53' }}>Page not found</h2>
                  <a href="/" style={{ color:'#185FA5', fontWeight:600 }}>← Back to Home</a>
                </div>
              }
            />
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
