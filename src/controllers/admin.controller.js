const prisma = require('../lib/prisma');

const listUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
};

const getPendingOrganizers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'ORGANIZER', status: 'PENDING' },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, error: 'Utente non trovato.' });

    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    res.json({ success: true, data: updated, message: 'Utente approvato.' });
  } catch (err) {
    next(err);
  }
};

const disableUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Non puoi disabilitare il tuo account.' });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'DISABLED' },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    res.json({ success: true, data: updated, message: 'Utente disabilitato.' });
  } catch (err) {
    next(err);
  }
};

const enableUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    res.json({ success: true, data: updated, message: 'Utente abilitato.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getPendingOrganizers, approveUser, disableUser, enableUser };
