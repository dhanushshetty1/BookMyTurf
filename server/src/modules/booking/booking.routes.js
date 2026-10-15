import express from 'express';
import { createBooking, getMyBookings, getOwnerBookings, updateStatus, createOfflineBooking } from './booking.controller.js';
import { protect, authorizeOwnerOrAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { createBookingSchema, updateBookingStatusSchema, createOfflineBookingSchema } from './booking.validation.js';

const router = express.Router();

router.post('/', protect, validateRequest(createBookingSchema), createBooking);
router.get('/mybookings', protect, getMyBookings);

// Owner Routes
router.get('/owner', protect, authorizeOwnerOrAdmin, getOwnerBookings);
router.patch('/:id/status', protect, authorizeOwnerOrAdmin, validateRequest(updateBookingStatusSchema), updateStatus);
router.post('/offline', protect, authorizeOwnerOrAdmin, validateRequest(createOfflineBookingSchema), createOfflineBooking);

export default router;
