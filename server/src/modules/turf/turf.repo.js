import prisma from '../../core/config/db.js';

export const findAllTurfs = async () => {
  return await prisma.turf.findMany({
    include: { courts: true }
  });
};

export const findTurfById = async (id) => {
  return await prisma.turf.findUnique({
    where: { id },
    include: { 
      courts: {
        include: { 
          slots: {
            where: {
              startTimeUTC: {
                gt: new Date()
              }
            }
          }
        }
      }
    },
  });
};

export const createTurf = async (turfData) => {
  return await prisma.turf.create({ data: turfData });
};

export const findTurfsByOwner = async (ownerId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return await prisma.turf.findMany({
    where: { ownerId },
    include: { 
      courts: {
        include: { 
          slots: {
            where: {
              startTimeUTC: {
                gt: thirtyDaysAgo
              }
            }
          }
        }
      }
    }
  });
};

export const updateTurf = async (id, turfData) => {
  return await prisma.turf.update({
    where: { id },
    data: turfData
  });
};

export const findCourtById = async (id) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return await prisma.court.findUnique({
    where: { id },
    include: { 
      slots: {
        where: {
          startTimeUTC: {
            gt: thirtyDaysAgo
          }
        }
      }, 
      turf: true 
    }
  });
};

export const createCourt = async (courtData) => {
  return await prisma.court.create({ data: courtData });
};

export const updateCourt = async (id, courtData) => {
  return await prisma.court.update({
    where: { id },
    data: courtData
  });
};

export const deleteCourt = async (id) => {
  return await prisma.court.delete({
    where: { id }
  });
};
