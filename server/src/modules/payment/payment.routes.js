import express from 'express';
import { protect } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { cancelPayment, createOrder, verifyPayment } from './payment.controller.js';
import { cancelPaymentSchema, createPaymentOrderSchema, verifyPaymentSchema } from './payment.validation.js';

const router = express.Router();

router.post('/create-order', protect, validateRequest(createPaymentOrderSchema), createOrder);
router.post('/verify', protect, validateRequest(verifyPaymentSchema), verifyPayment);
router.post('/cancel', protect, validateRequest(cancelPaymentSchema), cancelPayment);

export default router;
