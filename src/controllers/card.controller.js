const prisma = require('../lib/prisma');

const isOwner = (tournament, user) =>
  user.role === 'ADMIN' || tournament.organizerId === user.id;

const addCard = async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { tournament: true },
    });
    if (!match) return res.status(404).json({ success: false, error: 'Partita non trovata.' });
    if (!isOwner(match.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    const { playerId, teamId, type, minute } = req.body;

    if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) {
      return res.status(400).json({ success: false, error: 'La squadra non partecipa a questa partita.' });
    }

    const player = await prisma.player.findFirst({ where: { id: playerId, teamId } });
    if (!player) return res.status(404).json({ success: false, error: 'Giocatore non trovato nella squadra.' });

    const card = await prisma.card.create({
      data: { matchId: match.id, playerId, teamId, type, minute: minute ?? null },
      include: {
        player: { select: { id: true, name: true, number: true } },
        team: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
};

const deleteCard = async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.cardId },
      include: { match: { include: { tournament: true } } },
    });
    if (!card) return res.status(404).json({ success: false, error: 'Cartellino non trovato.' });
    if (!isOwner(card.match.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    await prisma.card.delete({ where: { id: req.params.cardId } });
    res.json({ success: true, message: 'Cartellino eliminato.' });
  } catch (err) {
    next(err);
  }
};

const getTournamentCards = async (req, res, next) => {
  try {
    const { teamId, playerId, type } = req.query;
    const where = { match: { tournamentId: req.params.id } };
    if (teamId) where.teamId = teamId;
    if (playerId) where.playerId = playerId;
    if (type) where.type = type;

    const cards = await prisma.card.findMany({
      where,
      include: {
        player: { select: { id: true, name: true, number: true } },
        team: { select: { id: true, name: true } },
        match: { select: { id: true, round: true, scheduledAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: cards });
  } catch (err) {
    next(err);
  }
};

module.exports = { addCard, deleteCard, getTournamentCards };
