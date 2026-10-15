import * as paymentService from './payment.service.js';

export const createOrder = async (req, res, next) => {
  try {
    const order = await paymentService.createOrder(req.user, req.body);
    res.status(201).json(order);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(req.user, req.body);
    res.json(result);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const cancelPayment = async (req, res, next) => {
  try {
    const booking = await paymentService.cancelPendingPayment(req.user, req.body);
    res.json({ booking });
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};
