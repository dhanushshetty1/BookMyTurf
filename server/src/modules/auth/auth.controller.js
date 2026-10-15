import * as authService from './auth.service.js';

export const registerUser = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    res.json(user);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(user);
  } catch (error) {
    if (error.status) res.status(error.status);
    next(error);
  }
};
