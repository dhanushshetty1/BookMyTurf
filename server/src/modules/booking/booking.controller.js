import * as bookingService from './booking.service.js';

export const createBooking = async (req, res, next) => {
  try {
    res.status(410).json({
      message: 'Online bookings must be created through the payment flow.'
    });
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getOwnerBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getOwnerBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await bookingService.updateStatus(id, status);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const createOfflineBooking = async (req, res, next) => {
  try {
    const { turfId, courtId, slotId, guestName, guestPhone, totalAmount, bookingType = 'FULL' } = req.body;
    const booking = await bookingService.addOfflineBooking(turfId, courtId, slotId, guestName, guestPhone, totalAmount, bookingType);
    res.status(201).json(booking);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};
