/**
 * Round-robin schedule generator.
 * Fix first team; rotate the rest N-1 times to produce N-1 rounds.
 * Alternates home/away per round to balance field advantage.
 */
const generateRoundRobinRounds = (teamIds) => {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null); // null = bye

  const n = teams.length;
  const rotating = teams.slice(1);
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const current = [teams[0], ...rotating];
    const round = [];

    for (let i = 0; i < n / 2; i++) {
      const a = current[i];
      const b = current[n - 1 - i];
      if (a && b) {
        round.push(r % 2 === 0 ? { homeTeamId: a, awayTeamId: b } : { homeTeamId: b, awayTeamId: a });
      }
    }

    rounds.push(round);
    rotating.unshift(rotating.pop()); // rotate right
  }

  return rounds;
};

const generateKnockoutRound1 = (teamIds) => {
  const teams = [...teamIds];
  // Pad to next power of 2 with byes
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(Math.max(teams.length, 2))));
  while (teams.length < nextPow2) teams.push(null);

  const matches = [];
  for (let i = 0; i < teams.length; i += 2) {
    if (teams[i] && teams[i + 1]) {
      matches.push({ homeTeamId: teams[i], awayTeamId: teams[i + 1] });
    }
    // one-null pairs = automatic bye, not scheduled
  }
  return matches;
};

const getTimeSlots = (startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration) => {
  const [sh, sm] = timeSlotStart.split(':').map(Number);
  const [eh, em] = timeSlotEnd.split(':').map(Number);
  const slotsPerDay = Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / matchDuration);

  const slots = [];
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  for (const d = new Date(startDate); d <= end; d.setDate(d.getDate() + 1)) {
    for (let s = 0; s < slotsPerDay; s++) {
      const slot = new Date(d);
      slot.setHours(sh, sm + s * matchDuration, 0, 0);
      slots.push(new Date(slot));
    }
  }

  return slots;
};

const assignSlots = (matches, slots) => {
  if (matches.length > slots.length) {
    throw new Error(
      `Slot disponibili (${slots.length}) insufficienti per le partite (${matches.length}). ` +
      `Allarga il periodo o la fascia oraria.`
    );
  }
  return matches.map((m, i) => ({ ...m, scheduledAt: slots[i], status: 'SCHEDULED' }));
};

const generateLeagueCalendar = (teamIds, startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration = 60) => {
  const rounds = generateRoundRobinRounds(teamIds);
  const allMatches = rounds.flatMap((round, ri) =>
    round.map((m) => ({ ...m, round: ri + 1, leg: 1 }))
  );
  const slots = getTimeSlots(startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration);
  return assignSlots(allMatches, slots);
};

const generateKnockoutCalendar = (teamIds, startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration = 60) => {
  const round1 = generateKnockoutRound1(teamIds).map((m) => ({ ...m, round: 1, leg: 1 }));
  const slots = getTimeSlots(startDate, endDate, timeSlotStart, timeSlotEnd, matchDuration);
  return assignSlots(round1, slots);
};

module.exports = { generateLeagueCalendar, generateKnockoutCalendar };
