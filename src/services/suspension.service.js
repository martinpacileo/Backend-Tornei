const prisma = require('../lib/prisma');

const YELLOW_THRESHOLD = 3; // every 3 yellows = 1-match ban

const getPlayerCardStats = async (playerId, tournamentId) => {
  const cards = await prisma.card.findMany({
    where: { playerId, match: { tournamentId } },
    select: { type: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const yellows = cards.filter((c) => c.type === 'YELLOW').length;
  const reds = cards.filter((c) => c.type === 'RED').length;

  return {
    yellowCards: yellows,
    redCards: reds,
    yellowSuspensions: Math.floor(yellows / YELLOW_THRESHOLD),
    nextYellowToSuspension: YELLOW_THRESHOLD - (yellows % YELLOW_THRESHOLD),
    redSuspensions: reds,
    totalSuspensionMatches: Math.floor(yellows / YELLOW_THRESHOLD) + reds,
  };
};

module.exports = { getPlayerCardStats };
