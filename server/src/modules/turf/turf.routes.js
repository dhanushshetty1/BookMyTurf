import express from 'express';
import * as turfController from './turf.controller.js';
import { protect, authorizeOwnerOrAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { createTurfSchema, addSlotSchema, updateTurfSchema, bulkSlotSchema } from './turf.validation.js';
import { uploadImages } from '../../core/middlewares/upload.middleware.js';

const router = express.Router();

router.get('/', turfController.getTurfs);
router.get('/my-turfs', protect, authorizeOwnerOrAdmin, turfController.getMyTurfs);
router.get('/:id', turfController.getTurfById);

router.post(
  '/',
  protect,
  authorizeOwnerOrAdmin,
  uploadImages.array('images', 10),
  validateRequest(createTurfSchema),
  turfController.createTurf
);

router.put(
  '/:id',
  protect,
  authorizeOwnerOrAdmin,
  uploadImages.array('images', 10),
  validateRequest(updateTurfSchema),
  turfController.updateTurf
);

// Court Management
router.post(
  '/:id/courts',
  protect,
  authorizeOwnerOrAdmin,
  uploadImages.array('images', 5),
  turfController.addCourt
);

router.put(
  '/courts/:courtId',
  protect,
  authorizeOwnerOrAdmin,
  uploadImages.array('images', 5),
  turfController.updateCourt
);

router.delete(
  '/courts/:courtId',
  protect,
  authorizeOwnerOrAdmin,
  turfController.deleteCourt
);

// Slot Management (Owner only) - Now operates on courtId
router.post(
  '/courts/:id/slots',
  protect,
  authorizeOwnerOrAdmin,
  validateRequest(addSlotSchema),
  turfController.addSlotToTurf
);

router.post(
  '/courts/:id/slots/bulk',
  protect,
  authorizeOwnerOrAdmin,
  validateRequest(bulkSlotSchema),
  turfController.bulkAddSlots
);

router.patch(
  '/slots/:slotId',
  protect,
  authorizeOwnerOrAdmin,
  turfController.toggleSlotStatus
);

router.post(
  '/courts/:id/holiday',
  protect,
  authorizeOwnerOrAdmin,
  turfController.setHoliday
);

router.post(
  '/courts/:id/slots/bulk-block',
  protect,
  authorizeOwnerOrAdmin,
  turfController.bulkBlock
);

export default router;
