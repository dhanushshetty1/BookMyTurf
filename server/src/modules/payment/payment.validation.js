import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  body: z.object({
    turfId: z.string().uuid('Invalid turf ID'),
    courtId: z.string().uuid('Invalid court ID'),
    slotId: z.string().uuid('Invalid slot ID'),
    bookingType: z.enum(['FULL', 'HALF']).default('FULL'),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().uuid('Invalid booking ID'),
    razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
    razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
    razorpay_signature: z.string().min(1, 'Razorpay signature is required'),
  }),
});

export const cancelPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().uuid('Invalid booking ID'),
    reason: z.string().max(200).optional(),
  }),
});
