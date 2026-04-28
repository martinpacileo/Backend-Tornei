const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const tokenService = require('../services/token.service');

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ success: false, error: 'Email già registrata.' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: 'USER', status: 'ACTIVE' },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const registerOrganizer = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ success: false, error: 'Email già registrata.' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: 'ORGANIZER', status: 'PENDING' },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });
    res.status(201).json({
      success: true,
      data: user,
      message: "Registrazione avvenuta. L'account è in attesa di approvazione dell'amministratore.",
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide.' });
    }
    if (user.status === 'DISABLED') {
      return res.status(403).json({ success: false, error: 'Account disabilitato.' });
    }
    if (user.status === 'PENDING') {
      return res.status(403).json({ success: false, error: 'Account in attesa di approvazione.' });
    }

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);
    await tokenService.saveRefreshToken(user.id, refreshToken);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = await tokenService.verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, error: 'Token non valido.' });
    }
    await tokenService.deleteRefreshToken(refreshToken);
    const newAccess = tokenService.generateAccessToken(user);
    const newRefresh = tokenService.generateRefreshToken(user);
    await tokenService.saveRefreshToken(user.id, newRefresh);
    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Refresh token non valido o scaduto.' });
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await tokenService.deleteRefreshToken(refreshToken);
    res.json({ success: true, message: 'Logout effettuato.' });
  } catch (err) {
    next(err);
  }
};

const me = (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { register, registerOrganizer, login, refresh, logout, me };
