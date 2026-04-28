const prisma = require('../lib/prisma');
const { recalculateStandings } = require('../services/standing.service');

const isOwner = (tournament, user) =>
  user.role === 'ADMIN' || tournament.organizerId === user.id;

const listMatches = async (req, res, next) => {
  try {
    const { round, status, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { tournamentId: req.params.id };
    if (round) where.round = Number(round);
    if (status) where.status = status;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          homeTeam: { select: { id: true, name: true, logo: true } },
          awayTeam: { select: { id: true, name: true, logo: true } },
          _count: { select: { cards: true } },
        },
        orderBy: [{ round: 'asc' }, { scheduledAt: 'asc' }],
        skip,
        take: Number(limit),
      }),
      prisma.match.count({ where }),
    ]);
    res.json({ success: true, data: matches, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
};

const getMatch = async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        tournament: { select: { id: true, name: true, organizerId: true, type: true } },
        homeTeam: { select: { id: true, name: true, logo: true } },
        awayTeam: { select: { id: true, name: true, logo: true } },
        cards: {
          include: { player: { select: { id: true, name: true, number: true } } },
          orderBy: { minute: 'asc' },
        },
      },
    });
    if (!match) return res.status(404).json({ success: false, error: 'Partita non trovata.' });
    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

const rescheduleMatch = async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { tournament: true },
    });
    if (!match) return res.status(404).json({ success: false, error: 'Partita non trovata.' });
    if (!isOwner(match.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });
    if (match.status === 'PLAYED') {
      return res.status(400).json({ success: false, error: 'Impossibile spostare una partita già giocata.' });
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        scheduledAt: new Date(req.body.scheduledAt),
        status: 'SCHEDULED',
        ...(req.body.notes && { notes: req.body.notes }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const enterResult = async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { tournament: true },
    });
    if (!match) return res.status(404).json({ success: false, error: 'Partita non trovata.' });
    if (!isOwner(match.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    const { homeScore, awayScore, playedAt } = req.body;
    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        homeScore, awayScore,
        playedAt: playedAt ? new Date(playedAt) : new Date(),
        status: 'PLAYED',
      },
    });

    if (match.tournament.type === 'LEAGUE') {
      await recalculateStandings(match.tournamentId);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { listMatches, getMatch, rescheduleMatch, enterResult };
