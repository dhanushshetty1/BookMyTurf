import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)');

export const createTurfSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    location: z.string().min(2, 'Location is required'),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
    contactNumber: z.string().regex(/^(\+\d{1,4}\s?)?\d{9,15}$/, 'Invalid contact number format').optional(),
    address: z.string().optional(),
    facilities: z.union([z.array(z.string()), z.string()]).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
    googleMapsUrl: z.string().url().refine(
      (url) => url.includes("google.com/maps") || url.includes("maps.app.goo.gl"),
      { message: "Must be a valid Google Maps link" }
    ).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }).refine(data => {
    if (data.openingTime && data.closingTime) {
      return data.openingTime < data.closingTime;
    }
    return true;
  }, {
    message: "Opening time must be before closing time",
    path: ["closingTime"]
  }),
});

export const updateTurfSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').optional(),
    location: z.string().min(2, 'Location is required').optional(),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
    contactNumber: z.string().regex(/^(\+\d{1,4}\s?)?\d{9,15}$/, 'Invalid contact number format').optional(),
    address: z.string().optional(),
    facilities: z.union([z.array(z.string()), z.string()]).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
    existingImages: z.union([z.array(z.string()), z.string()]).optional(),
    googleMapsUrl: z.string().url().refine(
      (url) => url.includes("google.com/maps") || url.includes("maps.app.goo.gl"),
      { message: "Must be a valid Google Maps link" }
    ).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }).refine(data => {
    if (data.openingTime && data.closingTime) {
      return data.openingTime < data.closingTime;
    }
    return true;
  }, {
    message: "Opening time must be before closing time",
    path: ["closingTime"]
  }),
});

export const addSlotSchema = z.object({
  body: z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
    startTime: timeSchema,
    endTime: timeSchema,
  }).refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime']
  }),
  params: z.object({
    id: z.string().uuid('Invalid turf ID'),
  }),
});

export const bulkSlotSchema = z.object({
  body: z.object({
    startDate: z.string(),
    endDate: z.string(),
    daysOfWeek: z.array(z.number().min(0).max(6)), 
    startTime: timeSchema,
    endTime: timeSchema,
    durationMinutes: z.coerce.number().int().positive(),
    standardPrice: z.coerce.number().positive().optional(),
    peakPrice: z.coerce.number().positive().optional(),
    peakHourStart: timeSchema.optional()
  }).refine(data => data.startDate <= data.endDate, {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }).refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime']
  }),
  params: z.object({
    id: z.string().uuid('Invalid court ID'),
  }),
});
