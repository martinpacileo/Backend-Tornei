const prisma = require('../lib/prisma');

const recalculateStandings = async (tournamentId) => {
  const [matches, teams] = await Promise.all([
    prisma.match.findMany({ where: { tournamentId, status: 'PLAYED' } }),
    prisma.team.findMany({ where: { tournamentId } }),
  ]);

  const map = {};
  for (const team of teams) {
    map[team.id] = {
      tournamentId,
      teamId: team.id,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    };
  }

  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    const home = map[m.homeTeamId];
    const away = map[m.awayTeamId];
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++; away.lost++; home.points += 3;
    } else if (m.homeScore < m.awayScore) {
      away.won++; home.lost++; away.points += 3;
    } else {
      home.drawn++; away.drawn++; home.points += 1; away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  await Promise.all(
    Object.values(map).map((s) =>
      prisma.standing.upsert({
        where: { tournamentId_teamId: { tournamentId: s.tournamentId, teamId: s.teamId } },
        create: s,
        update: {
          played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
          goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst,
          goalDifference: s.goalDifference, points: s.points,
        },
      })
    )
  );
};

module.exports = { recalculateStandings };
