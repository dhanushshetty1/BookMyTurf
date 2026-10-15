import prisma from '../../core/config/db.js';

export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const createUser = async (userData) => {
  return await prisma.user.create({ data: userData });
};

export const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });
};
