const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token di accesso mancante.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Utente non trovato.' });
    }
    if (user.status === 'DISABLED') {
      return res.status(403).json({ success: false, error: 'Account disabilitato.' });
    }
    if (user.status === 'PENDING') {
      return res.status(403).json({ success: false, error: 'Account in attesa di approvazione.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token scaduto.' });
    }
    return res.status(401).json({ success: false, error: 'Token non valido.' });
  }
};

// Does not block the request — attaches user if token is valid
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, role: true, status: true },
      });
      if (user && user.status === 'ACTIVE') req.user = user;
    } catch (_) {
      // silently ignore invalid token for optional routes
    }
  }
  next();
};

module.exports = { authenticate, optionalAuth };
