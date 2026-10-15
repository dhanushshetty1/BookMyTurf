import * as turfService from './turf.service.js';
import { parseArrayField, extractImages } from '../../core/utils/helpers.js';

export const getTurfs = async (req, res, next) => {
  try {
    const turfs = await turfService.getAllTurfs();
    res.json(turfs);
  } catch (error) {
    next(error);
  }
};

export const getTurfById = async (req, res, next) => {
  try {
    const turf = await turfService.getTurfDetails(req.params.id);
    res.json(turf);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const getMyTurfs = async (req, res, next) => {
  try {
    const turfs = await turfService.getOwnerTurfs(req.user.id);
    res.json(turfs);
  } catch (error) {
    next(error);
  }
};

export const createTurf = async (req, res, next) => {
  try {
    const facilitiesArray = parseArrayField(req.body.facilities);
    
    const images = extractImages({
      reqFiles: req.files,
      imageUrls: req.body.imageUrls,
      coverIdentifier: req.body.coverIdentifier
    });

    const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;

    const turfData = { 
      name: req.body.name,
      location: req.body.location,
      openingTime: req.body.openingTime || null,
      closingTime: req.body.closingTime || null,
      contactNumber: req.body.contactNumber || null,
      address: req.body.address || null,
      facilities: facilitiesArray,
      status: req.body.status || 'ACTIVE',
      googleMapsUrl: req.body.googleMapsUrl || null,
      latitude,
      longitude,
      images,
      ownerId: req.user.id 
    };

    const turf = await turfService.addTurf(turfData);
    res.status(201).json(turf);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const updateTurf = async (req, res, next) => {
  try {
    const turfId = req.params.id;
    const ownerId = req.user.id;
    
    let updateData = { ...req.body };
    
    if (updateData.facilities) {
      updateData.facilities = parseArrayField(updateData.facilities);
    }

    if (updateData.latitude) updateData.latitude = parseFloat(updateData.latitude);
    if (updateData.longitude) updateData.longitude = parseFloat(updateData.longitude);
    
    updateData.images = extractImages({
      reqFiles: req.files,
      existingImages: req.body.existingImages,
      coverIdentifier: req.body.coverIdentifier
    });

    delete updateData.existingImages;
    delete updateData.coverIdentifier;

    const turf = await turfService.updateOwnedTurf(turfId, ownerId, updateData);
    res.json(turf);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const addCourt = async (req, res, next) => {
  try {
    const { id: turfId } = req.params;
    
    const images = extractImages({
      reqFiles: req.files,
      existingImages: req.body.existingImages
    });
    
    const courtData = {
      name: req.body.name,
      type: req.body.type,
      pricePerHour: parseFloat(req.body.pricePerHour),
      weekendPricePerHour: req.body.weekendPricePerHour ? parseFloat(req.body.weekendPricePerHour) : null,
      allowHalfCourtBooking: req.body.allowHalfCourtBooking === true || req.body.allowHalfCourtBooking === 'true',
      halfCourtPricePerHour: req.body.halfCourtPricePerHour ? parseFloat(req.body.halfCourtPricePerHour) : null,
      halfCourtWeekendPricePerHour: req.body.halfCourtWeekendPricePerHour ? parseFloat(req.body.halfCourtWeekendPricePerHour) : null,
      images
    };
    if (!courtData.allowHalfCourtBooking) {
      courtData.halfCourtPricePerHour = null;
      courtData.halfCourtWeekendPricePerHour = null;
    }
    const court = await turfService.addCourt(turfId, courtData, req.user.id);
    res.status(201).json(court);
  } catch (error) {
    next(error);
  }
};

export const updateCourt = async (req, res, next) => {
  try {
    const { courtId } = req.params;
    
    let updateData = { ...req.body };
    
    // Parse numeric fields
    if (updateData.pricePerHour) updateData.pricePerHour = parseFloat(updateData.pricePerHour);
    if (updateData.weekendPricePerHour) updateData.weekendPricePerHour = parseFloat(updateData.weekendPricePerHour);
    if (updateData.halfCourtPricePerHour) updateData.halfCourtPricePerHour = parseFloat(updateData.halfCourtPricePerHour);
    if (updateData.halfCourtWeekendPricePerHour) updateData.halfCourtWeekendPricePerHour = parseFloat(updateData.halfCourtWeekendPricePerHour);
    if (updateData.allowHalfCourtBooking !== undefined) {
      updateData.allowHalfCourtBooking = updateData.allowHalfCourtBooking === true || updateData.allowHalfCourtBooking === 'true';
      if (!updateData.allowHalfCourtBooking) {
        updateData.halfCourtPricePerHour = null;
        updateData.halfCourtWeekendPricePerHour = null;
      }
    }
    
    // Handle images safely: only update if new images are uploaded OR existingImages is explicitly provided
    if ((req.files && req.files.length > 0) || req.body.existingImages !== undefined) {
      updateData.images = extractImages({
        reqFiles: req.files,
        existingImages: req.body.existingImages
      });
    } else {
      // Remove images from updateData so Prisma doesn't overwrite with empty array
      delete updateData.images;
    }

    // Always remove temporary fields that are not in the DB schema
    delete updateData.existingImages;

    const court = await turfService.updateCourt(courtId, updateData, req.user.id);
    res.json(court);
  } catch (error) {
    next(error);
  }
};

export const deleteCourt = async (req, res, next) => {
  try {
    const { courtId } = req.params;
    await turfService.deleteCourt(courtId, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addSlotToTurf = async (req, res, next) => {
  try {
    const { id: courtId } = req.params;
    const slot = await turfService.addSlot(courtId, req.body, req.user.id);
    res.status(201).json(slot);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const bulkAddSlots = async (req, res, next) => {
  try {
    const { id: courtId } = req.params;
    const result = await turfService.generateBulkSlots(courtId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const toggleSlotStatus = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const slot = await turfService.updateSlotStatus(slotId, req.body.status, req.user.id);
    res.json(slot);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const setHoliday = async (req, res, next) => {
  try {
    const { id: courtId } = req.params;
    const { date } = req.body;
    const result = await turfService.blockDate(courtId, date, 'Holiday', req.user.id);
    res.json(result);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const bulkBlock = async (req, res, next) => {
  try {
    const { id: courtId } = req.params;
    const result = await turfService.blockTimeRange(courtId, req.body, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};
