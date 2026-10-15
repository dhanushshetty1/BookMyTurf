import * as bookingRepo from './booking.repo.js';

export const bookSlot = async (userId, turfId, courtId, slotId, totalAmount, bookingType = 'FULL') => {
  try {
    return await bookingRepo.createBookingTransaction(userId, turfId, courtId, slotId, totalAmount, bookingType);
  } catch (error) {
    if (error.message === 'Slot is no longer available') {
      const err = new Error('Slot is no longer available');
      err.status = 409;
      throw err;
    }
    if (error.message === 'Half-court booking is not available for this court') {
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
    if (error.message === 'Cannot book slots that have already started') {
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

export const getUserBookings = async (userId) => {
  return await bookingRepo.findBookingsByUserId(userId);
};

export const getOwnerBookings = async (ownerId) => {
  return await bookingRepo.findBookingsByOwnerId(ownerId);
};

export const updateStatus = async (bookingId, status) => {
  return await bookingRepo.updateBookingStatus(bookingId, status);
};

export const addOfflineBooking = async (turfId, courtId, slotId, guestName, guestPhone, totalAmount, bookingType = 'FULL') => {
  try {
    return await bookingRepo.createOfflineBookingTransaction(turfId, courtId, slotId, guestName, guestPhone, totalAmount, bookingType);
  } catch (error) {
    if (error.message === 'Slot is no longer available') {
      const err = new Error('Slot is no longer available');
      err.status = 409;
      throw err;
    }
    if (error.message === 'Half-court booking is not available for this court' || error.message === 'Cannot book slots that have already started') {
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
    throw error;
  }
};
