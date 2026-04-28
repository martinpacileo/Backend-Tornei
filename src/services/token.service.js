const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const generateAccessToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

const saveRefreshToken = async (userId, token) => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  await prisma.refreshToken.create({
    data: { userId, token, expiresAt: new Date(decoded.exp * 1000) },
  });
};

const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Refresh token non valido o scaduto.');
  }
  return decoded;
};

const deleteRefreshToken = async (token) => {
  await prisma.refreshToken.delete({ where: { token } }).catch(() => {});
};

const deleteAllUserTokens = async (userId) => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  deleteRefreshToken,
  deleteAllUserTokens,
};
