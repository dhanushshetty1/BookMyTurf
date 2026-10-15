import express from 'express';
import { registerUser, loginUser, getUserProfile } from './auth.controller.js';
import { protect } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { registerSchema, loginSchema } from './auth.validation.js';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), registerUser);
router.post('/login', validateRequest(loginSchema), loginUser);
router.get('/profile', protect, getUserProfile);

export default router;
