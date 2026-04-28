const { z } = require('zod');

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'Data non valida (ISO8601)' }),
  notes: z.string().max(500).optional(),
});

const resultSchema = z.object({
  homeScore: z.number().int().min(0, 'Punteggio non valido'),
  awayScore: z.number().int().min(0, 'Punteggio non valido'),
  playedAt: z.string().datetime().optional(),
});

const createCardSchema = z.object({
  playerId: z.string().uuid('ID giocatore non valido'),
  teamId: z.string().uuid('ID squadra non valida'),
  type: z.enum(['YELLOW', 'RED'], { errorMap: () => ({ message: 'Tipo: YELLOW o RED' }) }),
  minute: z.number().int().min(1).max(120).optional(),
});

module.exports = { rescheduleSchema, resultSchema, createCardSchema };
