import prisma from '../../core/config/db.js';

export const createPayment = async (data) => {
  return await prisma.payment.create({ data });
};

export const findPaymentByBookingAndOrder = async (bookingId, razorpayOrderId) => {
  return await prisma.payment.findFirst({
    where: {
      bookingId,
      razorpayOrderId
    },
    include: {
      booking: {
        include: {
          turf: true,
          court: true,
          slot: true
        }
      }
    }
  });
};

export const markPaymentSuccess = async ({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'SUCCESS',
        failureReason: null
      }
    });

    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        paymentTxId: razorpayPaymentId
      },
      include: {
        turf: true,
        court: true,
        slot: true
      }
    });

    return { payment, booking };
  });
};

export const markPaymentFailed = async ({ bookingId, razorpayOrderId, failureReason }) => {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { razorpayOrderId },
      data: {
        status: 'FAILED',
        failureReason
      }
    });

    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: 'CANCELLED',
        paymentStatus: 'FAILED'
      },
      include: {
        slot: true,
        court: true
      }
    });

    return { payment, booking };
  });
};
