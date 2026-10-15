const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// Derived from API_BASE_URL (removes /api suffix if present)
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 
  (API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL);

export const CONFIG = {
  API_BASE_URL,
  IMAGE_BASE_URL,
  RAZORPAY_KEY_ID,
};

export default CONFIG;
