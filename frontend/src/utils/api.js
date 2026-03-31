import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('flywise_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('flywise_token');
      localStorage.removeItem('flywise_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

//auth
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);

//glights
export const searchFlights = (params) => API.get('/flights/search', { params });
export const getFlightById = (id) => API.get(`/flights/${id}`);
export const getAllFlights = () => API.get('/flights');
export const createFlight = (data) => API.post('/flights', data);
export const updateFlight = (id, data) => API.put(`/flights/${id}`, data);
export const deleteFlight = (id) => API.delete(`/flights/${id}`);
export const getFlightPrice = (id, data) => API.post(`/flights/${id}/price`, data);

//seats
export const getSeats = (flightId) => API.get(`/seats/${flightId}`);
export const lockSeats = (data) => API.post('/seats/lock', data);
export const unlockSeats = (data) => API.post('/seats/unlock', data);

//bookings
export const createBooking = (data) => API.post('/bookings', data);
export const getMyBookings = () => API.get('/bookings/my');
export const getBookingById = (id) => API.get(`/bookings/${id}`);
export const cancelBooking = (id, data) => API.put(`/bookings/${id}/cancel`, data);
export const getAllBookings = () => API.get('/bookings/all');
export const getStats = () => API.get('/bookings/stats');

export const getAddOns = (params) => API.get('/addons', { params });
export const applyPromoCode = (data) => API.post('/promo/apply', data);

//oricing Rules
export const getPricingRules = () => API.get('/pricing-rules');
export const createPricingRule = (data) => API.post('/pricing-rules', data);
export const updatePricingRule = (id, data) => API.put(`/pricing-rules/${id}`, data);
export const deletePricingRule = (id) => API.delete(`/pricing-rules/${id}`);


export default API;
