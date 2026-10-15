import prisma from '../../core/config/db.js';
const generateBookingCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const generateUniqueBookingCode = async (tx) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bookingCode = generateBookingCode();
    const existing = await tx.booking.findUnique({ where: { bookingCode } });
    if (!existing) return bookingCode;
  }

  throw new Error('Could not generate a booking verification code');
};

const findAndLockLinkedSlots = async (tx, slot) => {
  const court = await tx.court.findUnique({
    where: { id: slot.courtId },
    select: {
      id: true,
      turfId: true,
      sharedCourtGroupId: true
    }
  });

  if (!court) {
    throw new Error('Court not found');
  }

  if (!court.sharedCourtGroupId) return { court, linkedSlots: [] };

  const linkedSlots = await tx.$queryRaw`
    SELECT s.* FROM "Slot" s
    INNER JOIN "Court" c ON c.id = s."courtId"
    WHERE c."sharedCourtGroupId" = ${court.sharedCourtGroupId}
      AND c."turfId" = ${court.turfId}
      AND s.id <> ${slot.id}
      AND s."startTimeUTC" = ${slot.startTimeUTC}
      AND s."endTimeUTC" = ${slot.endTimeUTC}
    FOR UPDATE
  `;

  return { court, linkedSlots };
};

const getBookingUnits = (bookingType) => bookingType === 'HALF' ? 1 : 2;

const getSlotStatusForUnits = (units) => {
  if (units <= 0) return 'AVAILABLE';
  if (units === 1) return 'PARTIALLY_BOOKED';
  return 'BOOKED';
};

const sumConfirmedUnits = async (tx, slotIds, excludedBookingId = null) => {
  const bookings = await tx.booking.findMany({
    where: {
      slotId: { in: slotIds },
      bookingStatus: { not: 'CANCELLED' },
      ...(excludedBookingId ? { id: { not: excludedBookingId } } : {})
    },
    select: { courtUnits: true }
  });

  return bookings.reduce((sum, booking) => sum + booking.courtUnits, 0);
};

const assertAndApplySlotCapacity = async (tx, lockedSlot, bookingType) => {
  const selectedCourt = await tx.court.findUnique({
    where: { id: lockedSlot.courtId }
  });

  if (!selectedCourt) {
    throw new Error('Court not found');
  }

  if (bookingType === 'HALF' && !selectedCourt.allowHalfCourtBooking) {
    throw new Error('Half-court booking is not available for this court');
  }

  if (lockedSlot.status === 'BLOCKED') {
    throw new Error('Slot is no longer available');
  }

  const { linkedSlots } = await findAndLockLinkedSlots(tx, lockedSlot);
  const allSlots = [lockedSlot, ...linkedSlots];

  if (allSlots.some((slot) => slot.status === 'BLOCKED')) {
    throw new Error('Slot is no longer available');
  }

  const slotIds = allSlots.map((slot) => slot.id);
  const existingUnits = await sumConfirmedUnits(tx, slotIds);
  const requestedUnits = getBookingUnits(bookingType);

  if (existingUnits + requestedUnits > 2) {
    throw new Error('Slot is no longer available');
  }

  const nextStatus = getSlotStatusForUnits(existingUnits + requestedUnits);

  await tx.slot.updateMany({
    where: { id: { in: slotIds } },
    data: { status: nextStatus }
  });

  return {
    courtUnits: requestedUnits,
    bookingType,
    affectedSlotIds: slotIds
  };
};

const calculateBookingAmount = (court, slot, bookingType) => {
  const slotDate = new Date(slot.startTimeUTC);
  const isWeekend = slotDate.getDay() === 0 || slotDate.getDay() === 6;

  if (bookingType === 'HALF') {
    if (isWeekend) {
      return court.halfCourtWeekendPricePerHour || court.halfCourtPricePerHour || Math.ceil((court.weekendPricePerHour || court.pricePerHour) / 2);
    }

    return court.halfCourtPricePerHour || Math.ceil(court.pricePerHour / 2);
  }

  if (isWeekend) {
    return court.weekendPricePerHour || court.pricePerHour;
  }

  return court.pricePerHour;
};

const refreshLinkedSlotStatusesAfterCancellation = async (tx, booking) => {
  const { linkedSlots } = await findAndLockLinkedSlots(tx, booking.slot);
  const allSlots = [booking.slot, ...linkedSlots];
  const slotIds = allSlots.map((slot) => slot.id);

  if (allSlots.some((slot) => slot.status === 'BLOCKED')) return;

  const remainingUnits = await sumConfirmedUnits(tx, slotIds, booking.id);
  const nextStatus = getSlotStatusForUnits(remainingUnits);

  await tx.slot.updateMany({
    where: { id: { in: slotIds } },
    data: { status: nextStatus }
  });
};

export const createBookingTransaction = async (userId, turfId, courtId, slotId, totalAmount, bookingType = 'FULL') => {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock the slot row
    const lockedSlot = await tx.$queryRaw`
      SELECT * FROM "Slot" 
      WHERE id = ${slotId} 
      FOR UPDATE
    `;

    if (!lockedSlot || lockedSlot.length === 0) {
      throw new Error('Slot not found');
    }

    if (lockedSlot[0].status === 'BOOKED' || lockedSlot[0].status === 'BLOCKED') {
      throw new Error('Slot is no longer available');
    }

    if (new Date(lockedSlot[0].startTimeUTC) <= new Date()) {
      throw new Error('Cannot book slots that have already started');
    }

    const capacity = await assertAndApplySlotCapacity(tx, lockedSlot[0], bookingType);

    // 3. Create the booking entry
    const bookingCode = await generateUniqueBookingCode(tx);
    const newBooking = await tx.booking.create({
      data: {
        bookingCode,
        totalAmount: Number(totalAmount),
        bookingType: capacity.bookingType,
        courtUnits: capacity.courtUnits,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        paymentTxId: `MOCK_TX_${Date.now()}`,
        isOffline: false,
        guestName: null,
        guestPhone: null,
        // Using IDs directly as scalar fields
        userId: userId || null,
        turfId: turfId,
        courtId: courtId,
        slotId: slotId,
      }
    });

    return newBooking;
  });
};

export const createPendingBookingTransaction = async (userId, turfId, courtId, slotId, bookingType = 'FULL') => {
  return await prisma.$transaction(async (tx) => {
    const lockedSlot = await tx.$queryRaw`
      SELECT * FROM "Slot" 
      WHERE id = ${slotId} 
      FOR UPDATE
    `;

    if (!lockedSlot || lockedSlot.length === 0) {
      throw new Error('Slot not found');
    }

    if (lockedSlot[0].status === 'BOOKED' || lockedSlot[0].status === 'BLOCKED') {
      throw new Error('Slot is no longer available');
    }

    if (new Date(lockedSlot[0].startTimeUTC) <= new Date()) {
      throw new Error('Cannot book slots that have already started');
    }

    const selectedCourt = await tx.court.findUnique({
      where: { id: courtId },
      include: { turf: true }
    });

    if (!selectedCourt || selectedCourt.turfId !== turfId || lockedSlot[0].courtId !== courtId) {
      throw new Error('Invalid booking selection');
    }

    const capacity = await assertAndApplySlotCapacity(tx, lockedSlot[0], bookingType);
    const bookingCode = await generateUniqueBookingCode(tx);
    const calculatedAmount = calculateBookingAmount(selectedCourt, lockedSlot[0], bookingType);

    return await tx.booking.create({
      data: {
        bookingCode,
        totalAmount: Number(calculatedAmount),
        bookingType: capacity.bookingType,
        courtUnits: capacity.courtUnits,
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        paymentTxId: null,
        isOffline: false,
        guestName: null,
        guestPhone: null,
        userId: userId || null,
        turfId,
        courtId,
        slotId,
      },
      include: {
        turf: true,
        court: true,
        slot: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });
  });
};

export const cancelPendingBooking = async (bookingId, failureReason = null) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true, court: true }
    });

    if (!booking || booking.bookingStatus !== 'PENDING') return booking;

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: 'CANCELLED',
        paymentStatus: 'FAILED'
      }
    });

    await tx.payment.updateMany({
      where: { bookingId },
      data: {
        status: 'FAILED',
        failureReason
      }
    });

    await refreshLinkedSlotStatusesAfterCancellation(tx, booking);
    return updatedBooking;
  });
};

export const findBookingsByUserId = async (userId) => {
  return await prisma.booking.findMany({
    where: { userId },
    include: {
      turf: true,
      court: true,
      slot: true
    }
  });
};

export const findBookingById = async (bookingId) => {
  return await prisma.booking.findUnique({
    where: { id: bookingId }
  });
};

export const findBookingsByOwnerId = async (ownerId) => {
  return await prisma.booking.findMany({
    where: {
      turf: {
        ownerId: ownerId
      }
    },
    include: {
      turf: true,
      court: true,
      slot: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

export const updateBookingStatus = async (bookingId, status) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true, court: true }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { bookingStatus: status }
    });

    if (status === 'CANCELLED') {
      await refreshLinkedSlotStatusesAfterCancellation(tx, booking);
    }

    return updatedBooking;
  });
};

export const createOfflineBookingTransaction = async (turfId, courtId, slotId, guestName, guestPhone, totalAmount, bookingType = 'FULL') => {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock and check slot
    const lockedSlot = await tx.$queryRaw`
      SELECT * FROM "Slot" 
      WHERE id = ${slotId} 
      FOR UPDATE
    `;

    if (!lockedSlot || lockedSlot.length === 0) {
      throw new Error('Slot not found');
    }

    if (lockedSlot[0].status === 'BOOKED' || lockedSlot[0].status === 'BLOCKED') {
      throw new Error('Slot is no longer available');
    }

    if (new Date(lockedSlot[0].startTimeUTC) <= new Date()) {
      throw new Error('Cannot book slots that have already started');
    }

    const capacity = await assertAndApplySlotCapacity(tx, lockedSlot[0], bookingType);

    // 3. Create offline booking
    const bookingCode = await generateUniqueBookingCode(tx);
    const newBooking = await tx.booking.create({
      data: {
        bookingCode,
        totalAmount: Number(totalAmount),
        bookingType: capacity.bookingType,
        courtUnits: capacity.courtUnits,
        isOffline: true,
        guestName,
        guestPhone,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        paymentTxId: `OFFLINE_${Date.now()}`,
        turfId: turfId,
        courtId: courtId,
        slotId: slotId,
      }
    });

    return newBooking;
  });
};
