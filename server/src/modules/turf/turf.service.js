import * as turfRepo from './turf.repo.js';
import prisma from '../../core/config/db.js';
import { randomUUID } from 'crypto';

const IST_OFFSET_MINUTES = 330;

const parseIsoDateParts = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
};

const addDaysToIsoDate = (dateStr, days) => {
  const { year, month, day } = parseIsoDateParts(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const getDayOfWeekForIsoDate = (dateStr) => {
  const { year, month, day } = parseIsoDateParts(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const localIstDateTimeToUtc = (dateStr, totalMinutes) => {
  const { year, month, day } = parseIsoDateParts(dateStr);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - IST_OFFSET_MINUTES * 60 * 1000);
};

const localIstDateRangeToUtc = (dateStr) => ({
  start: localIstDateTimeToUtc(dateStr, 0),
  end: localIstDateTimeToUtc(addDaysToIsoDate(dateStr, 1), 0)
});

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const normalizeSharedCourtName = (name, sport) => {
  const cleanedName = String(name || '').trim();
  const sportLabel = sport.charAt(0) + sport.slice(1).toLowerCase();
  const withoutSport = cleanedName.replace(/\s*(cricket|football)\s*$/i, '').trim();
  return `${withoutSport || cleanedName} ${sportLabel}`.trim();
};

const getLinkedCourts = async (court) => {
  if (!court?.sharedCourtGroupId) return [court];

  return await prisma.court.findMany({
    where: {
      sharedCourtGroupId: court.sharedCourtGroupId,
      turfId: court.turfId
    }
  });
};

const copySlotsToLinkedCourt = async (tx, sourceCourtId, targetCourtId) => {
  const sourceSlots = await tx.slot.findMany({
    where: { courtId: sourceCourtId }
  });

  if (sourceSlots.length === 0) return;

  await tx.slot.createMany({
    data: sourceSlots.map((slot) => ({
      courtId: targetCourtId,
      startTimeUTC: slot.startTimeUTC,
      endTimeUTC: slot.endTimeUTC,
      status: slot.status,
      price: slot.price,
      blockReason: slot.blockReason
    })),
    skipDuplicates: true
  });
};

export const getAllTurfs = async () => {
  return await turfRepo.findAllTurfs();
};

export const getTurfDetails = async (id) => {
  const turf = await turfRepo.findTurfById(id);
  if (!turf) {
    const error = new Error('Turf not found');
    error.status = 404;
    throw error;
  }
  return turf;
};

export const addTurf = async (turfData) => {
  const existingTurfs = await turfRepo.findTurfsByOwner(turfData.ownerId);
  if (existingTurfs.length > 0) {
    const error = new Error('You can only have one turf facility.');
    error.status = 400;
    throw error;
  }
  return await turfRepo.createTurf(turfData);
};

export const getOwnerTurfs = async (ownerId) => {
  return await turfRepo.findTurfsByOwner(ownerId);
};

export const updateOwnedTurf = async (id, ownerId, turfData) => {
  const turf = await turfRepo.findTurfById(id);
  if (!turf) {
    const error = new Error('Turf not found');
    error.status = 404;
    throw error;
  }
  if (turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized');
    error.status = 403;
    throw error;
  }
  return await turfRepo.updateTurf(id, turfData);
};

// Court Management
export const addCourt = async (turfId, courtData, ownerId) => {
  const turf = await turfRepo.findTurfById(turfId);
  if (!turf || turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized or Turf not found');
    error.status = 403;
    throw error;
  }

  if (courtData.type === 'CRICKET_FOOTBALL') {
    const sharedCourtGroupId = randomUUID();
    const { type, name, ...baseCourtData } = courtData;

    return await prisma.$transaction(async (tx) => {
      const cricketCourt = await tx.court.create({
        data: {
          ...baseCourtData,
          turfId,
          sharedCourtGroupId,
          type: 'CRICKET',
          name: normalizeSharedCourtName(name, 'CRICKET')
        }
      });

      const footballCourt = await tx.court.create({
        data: {
          ...baseCourtData,
          turfId,
          sharedCourtGroupId,
          type: 'FOOTBALL',
          name: normalizeSharedCourtName(name, 'FOOTBALL')
        }
      });

      return [cricketCourt, footballCourt];
    });
  }

  return await turfRepo.createCourt({
    ...courtData,
    turfId
  });
};

export const updateCourt = async (courtId, courtData, ownerId) => {
  const court = await turfRepo.findCourtById(courtId);
  if (!court || court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized or Court not found');
    error.status = 403;
    throw error;
  }

  if (courtData.type === 'CRICKET_FOOTBALL' && !court.sharedCourtGroupId) {
    const sharedCourtGroupId = randomUUID();
    const { type, name, ...baseCourtData } = courtData;

    return await prisma.$transaction(async (tx) => {
      const cricketCourt = await tx.court.update({
        where: { id: courtId },
        data: {
          ...baseCourtData,
          sharedCourtGroupId,
          type: 'CRICKET',
          name: normalizeSharedCourtName(name || court.name, 'CRICKET')
        }
      });

      const footballCourt = await tx.court.create({
        data: {
          ...baseCourtData,
          turfId: court.turfId,
          sharedCourtGroupId,
          type: 'FOOTBALL',
          name: normalizeSharedCourtName(name || court.name, 'FOOTBALL')
        }
      });

      await copySlotsToLinkedCourt(tx, cricketCourt.id, footballCourt.id);

      return cricketCourt;
    });
  }

  if (court.sharedCourtGroupId) {
    if (courtData.type === 'CRICKET_FOOTBALL') {
      delete courtData.type;
    }

    const sharedUpdateData = {
      pricePerHour: courtData.pricePerHour,
      weekendPricePerHour: courtData.weekendPricePerHour,
      allowHalfCourtBooking: courtData.allowHalfCourtBooking,
      halfCourtPricePerHour: courtData.halfCourtPricePerHour,
      halfCourtWeekendPricePerHour: courtData.halfCourtWeekendPricePerHour,
      images: courtData.images,
      status: courtData.status
    };

    Object.keys(sharedUpdateData).forEach((key) => {
      if (sharedUpdateData[key] === undefined) delete sharedUpdateData[key];
    });

    return await prisma.$transaction(async (tx) => {
      const updatedCourt = await tx.court.update({
        where: { id: courtId },
        data: courtData
      });

      if (Object.keys(sharedUpdateData).length > 0) {
        await tx.court.updateMany({
          where: {
            sharedCourtGroupId: court.sharedCourtGroupId,
            turfId: court.turfId,
            id: { not: courtId }
          },
          data: sharedUpdateData
        });
      }

      return updatedCourt;
    });
  }

  return await turfRepo.updateCourt(courtId, courtData);
};

export const deleteCourt = async (courtId, ownerId) => {
  const court = await turfRepo.findCourtById(courtId);
  if (!court || court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized or Court not found');
    error.status = 403;
    throw error;
  }

  if (court.sharedCourtGroupId) {
    return await prisma.court.deleteMany({
      where: {
        sharedCourtGroupId: court.sharedCourtGroupId,
        turfId: court.turfId
      }
    });
  }

  return await turfRepo.deleteCourt(courtId);
};

// Slot Management
export const addSlot = async (courtId, slotData, ownerId) => {
  const court = await turfRepo.findCourtById(courtId);
  if (!court || court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized or Court not found');
    error.status = 403;
    throw error;
  }

  const linkedCourts = await getLinkedCourts(court);
  const slots = linkedCourts.map((linkedCourt) => ({
      courtId: linkedCourt.id,
      startTimeUTC: localIstDateTimeToUtc(slotData.date, parseTimeToMinutes(slotData.startTime)),
      endTimeUTC: localIstDateTimeToUtc(slotData.date, parseTimeToMinutes(slotData.endTime)),
      status: 'AVAILABLE',
      price: slotData.price || linkedCourt.pricePerHour
  }));

  return await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true
  });
};

export const generateBulkSlots = async (courtId, bulkData, ownerId) => {
  const court = await turfRepo.findCourtById(courtId);
  if (!court || court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized or Court not found');
    error.status = 403;
    throw error;
  }

  const { startDate, endDate, daysOfWeek, startTime, endTime, durationMinutes, standardPrice, peakPrice, peakHourStart } = bulkData;
  const linkedCourts = await getLinkedCourts(court);
  const slots = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    const dayOfWeek = getDayOfWeekForIsoDate(currentDate);
    if (daysOfWeek.includes(dayOfWeek)) {
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);
      let currentSlotStartMinutes = startMinutes;

      while (currentSlotStartMinutes + durationMinutes <= endMinutes) {
        const currentSlotEndMinutes = currentSlotStartMinutes + durationMinutes;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        linkedCourts.forEach((linkedCourt) => {
          const linkedPrice = (isWeekend && linkedCourt.weekendPricePerHour) ? linkedCourt.weekendPricePerHour : linkedCourt.pricePerHour;
          slots.push({
            courtId: linkedCourt.id,
            startTimeUTC: localIstDateTimeToUtc(currentDate, currentSlotStartMinutes),
            endTimeUTC: localIstDateTimeToUtc(currentDate, currentSlotEndMinutes),
            price: peakPrice && peakHourStart && currentSlotStartMinutes >= parseTimeToMinutes(peakHourStart) ? peakPrice : linkedPrice,
            status: 'AVAILABLE'
          });
        });

        currentSlotStartMinutes = currentSlotEndMinutes;
      }
    }

    currentDate = addDaysToIsoDate(currentDate, 1);
  }

  return await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true
  });
};

export const updateSlotStatus = async (slotId, status, ownerId) => {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { court: { include: { turf: true } } }
  });

  if (!slot || slot.court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized');
    error.status = 403;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updatedSlot = await tx.slot.update({
      where: { id: slotId },
      data: { status }
    });

    if (slot.court.sharedCourtGroupId) {
      await tx.slot.updateMany({
        where: {
          id: { not: slotId },
          startTimeUTC: slot.startTimeUTC,
          endTimeUTC: slot.endTimeUTC,
          court: {
            sharedCourtGroupId: slot.court.sharedCourtGroupId,
            turfId: slot.court.turfId
          },
          status: { not: 'BOOKED' }
        },
        data: { status }
      });
    }

    return updatedSlot;
  });
};

export const blockDate = async (courtId, date, reason, ownerId) => {
  const court = await turfRepo.findCourtById(courtId);
  if (!court || court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized');
    error.status = 403;
    throw error;
  }

  const dateRange = localIstDateRangeToUtc(date);

  const linkedCourtIds = (await getLinkedCourts(court)).map((linkedCourt) => linkedCourt.id);

  return await prisma.slot.updateMany({
    where: {
      courtId: { in: linkedCourtIds },
      startTimeUTC: {
        gte: dateRange.start,
        lt: dateRange.end
      }
    },
    data: {
      status: 'BLOCKED',
      blockReason: reason
    }
  });
};

export const blockTimeRange = async (courtId, rangeData, ownerId) => {
  const court = await turfRepo.findCourtById(courtId);
  if (!court || court.turf.ownerId !== ownerId) {
    const error = new Error('Unauthorized');
    error.status = 403;
    throw error;
  }

  const linkedCourtIds = (await getLinkedCourts(court)).map((linkedCourt) => linkedCourt.id);

  return await prisma.slot.updateMany({
    where: {
      courtId: { in: linkedCourtIds },
      startTimeUTC: { 
        gte: localIstDateTimeToUtc(rangeData.date, parseTimeToMinutes(rangeData.startTime)),
        lt: localIstDateTimeToUtc(rangeData.date, parseTimeToMinutes(rangeData.endTime))
      }
    },
    data: {
      status: 'BLOCKED',
      blockReason: rangeData.reason || 'Manual Block'
    }
  });
};
