import api from './api';

export const bookingService = {
  createBooking: async (bookingData: { turfId: string; courtId: string; slotId: string; totalAmount: number; bookingType?: 'FULL' | 'HALF' }) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  getMyBookings: async () => {
    const response = await api.get('/bookings/mybookings');
    return response.data;
  },

  getOwnerBookings: async () => {
    const response = await api.get('/bookings/owner');
    return response.data;
  },

  updateBookingStatus: async (bookingId: string, status: string) => {
    const response = await api.patch(`/bookings/${bookingId}/status`, { status });
    return response.data;
  },

  createOfflineBooking: async (data: { turfId: string; courtId: string; slotId: string; guestName: string; guestPhone: string; totalAmount: number; bookingType?: 'FULL' | 'HALF' }) => {
    const response = await api.post('/bookings/offline', data);
    return response.data;
  }
};
