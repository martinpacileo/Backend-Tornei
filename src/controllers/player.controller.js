const prisma = require('../lib/prisma');
const { getPlayerCardStats } = require('../services/suspension.service');

const isOwner = (tournament, user) =>
  user.role === 'ADMIN' || tournament.organizerId === user.id;

const listPlayers = async (req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: req.params.teamId },
      include: { _count: { select: { cards: true } } },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: players });
  } catch (err) {
    next(err);
  }
};

const createPlayer = async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: { tournament: true },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Squadra non trovata.' });
    if (!isOwner(team.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    const player = await prisma.player.create({
      data: { name: req.body.name, number: req.body.number ?? null, teamId: req.params.teamId },
    });
    res.status(201).json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

const updatePlayer = async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: { tournament: true },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Squadra non trovata.' });
    if (!isOwner(team.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    const { name, number } = req.body;
    const player = await prisma.player.update({
      where: { id: req.params.playerId },
      data: { ...(name && { name }), ...(number !== undefined && { number }) },
    });
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

const deletePlayer = async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: { tournament: true },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Squadra non trovata.' });
    if (!isOwner(team.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    await prisma.player.delete({ where: { id: req.params.playerId } });
    res.json({ success: true, message: 'Giocatore eliminato.' });
  } catch (err) {
    next(err);
  }
};

const getPlayerSuspension = async (req, res, next) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: 'tournamentId richiesto come query param.' });
    }
    const player = await prisma.player.findUnique({
      where: { id: req.params.playerId },
      include: { team: { select: { id: true, name: true } } },
    });
    if (!player) return res.status(404).json({ success: false, error: 'Giocatore non trovato.' });

    const stats = await getPlayerCardStats(req.params.playerId, tournamentId);
    res.json({ success: true, data: { player, cardStats: stats } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listPlayers, createPlayer, updatePlayer, deletePlayer, getPlayerSuspension };
