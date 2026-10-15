import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    turfId: z.string().uuid('Invalid turf ID'),
    courtId: z.string().uuid('Invalid court ID'),
    slotId: z.string().uuid('Invalid slot ID'),
    totalAmount: z.coerce.number().positive('Amount must be positive'),
    bookingType: z.enum(['FULL', 'HALF']).default('FULL'),
  }),
});

export const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  }),
});

export const createOfflineBookingSchema = z.object({
  body: z.object({
    turfId: z.string().uuid('Invalid turf ID'),
    courtId: z.string().uuid('Invalid court ID'),
    slotId: z.string().uuid('Invalid slot ID'),
    guestName: z.string().min(2, 'Guest name is required'),
    guestPhone: z.string().min(10, 'Valid phone number is required'),
    totalAmount: z.coerce.number().positive('Amount must be positive'),
    bookingType: z.enum(['FULL', 'HALF']).default('FULL'),
  }),
});
