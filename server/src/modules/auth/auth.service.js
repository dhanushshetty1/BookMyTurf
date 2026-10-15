import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepo from './user.repo.js';

export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const register = async (userData) => {
  const existingUser = await userRepo.findUserByEmail(userData.email);
  if (existingUser) {
    const error = new Error('User already exists');
    error.status = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(userData.password, salt);

  const user = await userRepo.createUser({
    name: userData.name,
    email: userData.email,
    passwordHash,
    role: userData.role || 'USER',
    phone: userData.phone,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id, user.role),
  };
};

export const login = async (email, password) => {
  const user = await userRepo.findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id, user.role),
  };
};

export const getProfile = async (id) => {
  const user = await userRepo.findUserById(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user;
};
