import api from './api';

export type CreatePaymentOrderPayload = {
  turfId: string;
  courtId: string;
  slotId: string;
  bookingType?: 'FULL' | 'HALF';
};

export type VerifyPaymentPayload = {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export const paymentService = {
  createOrder: async (payload: CreatePaymentOrderPayload) => {
    const response = await api.post('/payments/create-order', payload);
    return response.data;
  },

  verifyPayment: async (payload: VerifyPaymentPayload) => {
    const response = await api.post('/payments/verify', payload);
    return response.data;
  },

  cancelPayment: async (bookingId: string, reason?: string) => {
    const response = await api.post('/payments/cancel', { bookingId, reason });
    return response.data;
  },
};
