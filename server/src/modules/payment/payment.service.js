import crypto from 'crypto';
import * as bookingRepo from '../booking/booking.repo.js';
import * as paymentRepo from './payment.repo.js';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';

const getCommissionPercent = () => {
  const value = Number(process.env.PLATFORM_COMMISSION_PERCENT || 3);
  return Number.isFinite(value) && value >= 0 ? value : 3;
};

const toPaise = (amount) => Math.round(Number(amount) * 100);

const createRazorpayOrder = async ({ amount, currency, receipt, notes }) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Razorpay credentials are not configured');
    err.status = 500;
    throw err;
  }

  const auth = Buffer
    .from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`)
    .toString('base64');

  const response = await fetch(RAZORPAY_ORDERS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: toPaise(amount),
      currency,
      receipt,
      notes
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data?.error?.description || 'Could not create Razorpay order');
    err.status = response.status;
    throw err;
  }

  return data;
};

const verifySignature = ({ orderId, paymentId, signature }) => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
};

export const createOrder = async (user, payload) => {
  let booking;

  try {
    booking = await bookingRepo.createPendingBookingTransaction(
      user.id,
      payload.turfId,
      payload.courtId,
      payload.slotId,
      payload.bookingType
    );

    const commissionPercent = getCommissionPercent();
    const platformFee = Number(((booking.totalAmount * commissionPercent) / 100).toFixed(2));
    const ownerShare = Number((booking.totalAmount - platformFee).toFixed(2));

    const razorpayOrder = await createRazorpayOrder({
      amount: booking.totalAmount,
      currency: 'INR',
      receipt: booking.id,
      notes: {
        bookingId: booking.id,
        userId: user.id,
        turfId: booking.turfId,
        courtId: booking.courtId,
        slotId: booking.slotId
      }
    });

    await paymentRepo.createPayment({
      bookingId: booking.id,
      razorpayOrderId: razorpayOrder.id,
      amount: booking.totalAmount,
      currency: razorpayOrder.currency || 'INR',
      platformFee,
      ownerShare,
      status: 'PENDING'
    });

    return {
      key: process.env.RAZORPAY_KEY_ID,
      bookingId: booking.id,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      displayAmount: booking.totalAmount,
      name: 'BookMyTurf',
      description: `${booking.turf.name} - ${booking.court.name}`,
      prefill: {
        name: booking.user?.name || '',
        email: booking.user?.email || '',
        contact: booking.user?.phone || ''
      },
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        turfName: booking.turf.name,
        courtName: booking.court.name,
        courtType: booking.court.type,
        slotStart: booking.slot.startTimeUTC,
        slotEnd: booking.slot.endTimeUTC,
        amount: booking.totalAmount,
        bookingType: booking.bookingType
      }
    };
  } catch (error) {
    if (booking?.id) {
      await bookingRepo.cancelPendingBooking(booking.id, error.message);
    }
    throw error;
  }
};

const assertBookingBelongsToUser = (booking, userId) => {
  if (!booking || booking.userId !== userId) {
    const err = new Error('Payment not found for this user');
    err.status = 404;
    throw err;
  }
};

export const verifyPayment = async (user, { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const payment = await paymentRepo.findPaymentByBookingAndOrder(bookingId, razorpay_order_id);

  if (!payment) {
    const err = new Error('Payment order not found');
    err.status = 404;
    throw err;
  }

  assertBookingBelongsToUser(payment.booking, user.id);

  if (payment.status === 'SUCCESS') {
    return {
      payment,
      booking: payment.booking
    };
  }

  const isValid = verifySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature
  });

  if (!isValid) {
    await bookingRepo.cancelPendingBooking(bookingId, 'Payment signature verification failed');
    const err = new Error('Payment verification failed');
    err.status = 400;
    throw err;
  }

  return await paymentRepo.markPaymentSuccess({
    bookingId,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature
  });
};

export const cancelPendingPayment = async (user, { bookingId, reason }) => {
  const booking = await bookingRepo.findBookingById(bookingId);
  assertBookingBelongsToUser(booking, user.id);

  return await bookingRepo.cancelPendingBooking(bookingId, reason || 'Payment was cancelled');
};
