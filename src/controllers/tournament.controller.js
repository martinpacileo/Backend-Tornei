const prisma = require('../lib/prisma');
const { generateLeagueCalendar, generateKnockoutCalendar } = require('../services/calendar.service');

const isOwner = (tournament, user) =>
  user.role === 'ADMIN' || tournament.organizerId === user.id;

const listTournaments = async (req, res, next) => {
  try {
    const { type, format, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (type) where.type = type;
    if (format) where.format = format;

    if (!req.user) {
      where.status = { not: 'DRAFT' };
    } else if (req.user.role === 'USER') {
      where.status = { not: 'DRAFT' };
    } else if (req.user.role === 'ORGANIZER') {
      where.OR = [{ status: { not: 'DRAFT' } }, { organizerId: req.user.id }];
    }

    if (status && req.user?.role === 'ADMIN') where.status = status;

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          organizer: { select: { id: true, name: true } },
          _count: { select: { teams: true, matches: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.tournament.count({ where }),
    ]);

    res.json({ success: true, data: tournaments, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
};

const getTournament = async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        teams: { include: { _count: { select: { players: true } } }, orderBy: { name: 'asc' } },
        _count: { select: { matches: true } },
      },
    });

    if (!tournament) return res.status(404).json({ success: false, error: 'Torneo non trovato.' });

    if (tournament.status === 'DRAFT' && (!req.user || !isOwner(tournament, req.user))) {
      return res.status(404).json({ success: false, error: 'Torneo non trovato.' });
    }

    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

const createTournament = async (req, res, next) => {
  try {
    const { name, description, type, format, startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration } = req.body;
    const tournament = await prisma.tournament.create({
      data: {
        name, description, type, format,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        timeSlotStart, timeSlotEnd,
        matchDuration: matchDuration || 60,
        organizerId: req.user.id,
        status: 'DRAFT',
      },
    });
    res.status(201).json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

const updateTournament = async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ success: false, error: 'Torneo non trovato.' });
    if (!isOwner(tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });
    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Impossibile modificare un torneo completato.' });
    }

    const { name, description, startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration } = req.body;
    const updated = await prisma.tournament.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(timeSlotStart && { timeSlotStart }),
        ...(timeSlotEnd && { timeSlotEnd }),
        ...(matchDuration && { matchDuration }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteTournament = async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ success: false, error: 'Torneo non trovato.' });
    if (!isOwner(tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });
    if (tournament.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Impossibile eliminare un torneo attivo.' });
    }
    await prisma.tournament.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Torneo eliminato.' });
  } catch (err) {
    next(err);
  }
};

const generateCalendar = async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: { teams: true },
    });
    if (!tournament) return res.status(404).json({ success: false, error: 'Torneo non trovato.' });
    if (!isOwner(tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });
    if (tournament.teams.length < 2) {
      return res.status(400).json({ success: false, error: 'Servono almeno 2 squadre.' });
    }

    // Delete existing unplayed matches before regenerating
    await prisma.match.deleteMany({ where: { tournamentId: tournament.id, status: 'SCHEDULED' } });

    const teamIds = tournament.teams.map((t) => t.id);
    let matchData;

    if (tournament.type === 'LEAGUE') {
      matchData = generateLeagueCalendar(
        teamIds, tournament.startDate, tournament.endDate,
        tournament.timeSlotStart, tournament.timeSlotEnd, tournament.matchDuration
      );
    } else {
      matchData = generateKnockoutCalendar(
        teamIds, tournament.startDate, tournament.endDate,
        tournament.timeSlotStart, tournament.timeSlotEnd, tournament.matchDuration
      );
    }

    const result = await prisma.match.createMany({
      data: matchData.map((m) => ({
        tournamentId: tournament.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        scheduledAt: m.scheduledAt,
        round: m.round,
        leg: m.leg || 1,
        status: 'SCHEDULED',
      })),
    });

    // Initialise standings rows for LEAGUE type
    if (tournament.type === 'LEAGUE') {
      await Promise.all(
        teamIds.map((teamId) =>
          prisma.standing.upsert({
            where: { tournamentId_teamId: { tournamentId: tournament.id, teamId } },
            create: { tournamentId: tournament.id, teamId },
            update: {},
          })
        )
      );
    }

    res.json({ success: true, data: { matchesCreated: result.count }, message: 'Calendario generato.' });
  } catch (err) {
    if (err.message.includes('insufficienti') || err.message.includes('Slot')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ success: false, error: 'Torneo non trovato.' });
    if (!isOwner(tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    const updated = await prisma.tournament.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { listTournaments, getTournament, createTournament, updateTournament, deleteTournament, generateCalendar, updateStatus };
