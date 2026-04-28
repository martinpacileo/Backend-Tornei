const prisma = require('../lib/prisma');

const getStandings = async (req, res, next) => {
  try {
    const standings = await prisma.standing.findMany({
      where: { tournamentId: req.params.id },
      include: { team: { select: { id: true, name: true, logo: true } } },
      orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
    });

    const ranked = standings.map((s, i) => ({ ...s, position: i + 1 }));
    res.json({ success: true, data: ranked });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStandings };
