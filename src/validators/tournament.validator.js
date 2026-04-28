const { z } = require('zod');

const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const createTournamentSchema = z
  .object({
    name: z.string().min(3, 'Nome min 3 caratteri').max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['LEAGUE', 'KNOCKOUT'], { errorMap: () => ({ message: 'Tipo: LEAGUE o KNOCKOUT' }) }),
    format: z.enum(['FIVE', 'SEVEN', 'EIGHT'], { errorMap: () => ({ message: 'Formato: FIVE, SEVEN o EIGHT' }) }),
    startDate: z.string().datetime({ message: 'Data inizio non valida (ISO8601)' }),
    endDate: z.string().datetime({ message: 'Data fine non valida (ISO8601)' }),
    timeSlotStart: z.string().regex(timeRegex, 'Ora inizio non valida (HH:MM)'),
    timeSlotEnd: z.string().regex(timeRegex, 'Ora fine non valida (HH:MM)'),
    matchDuration: z.number().int().min(30).max(120).default(60),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'Data fine deve essere successiva alla data inizio',
    path: ['endDate'],
  })
  .refine(
    (d) => {
      const [sh, sm] = d.timeSlotStart.split(':').map(Number);
      const [eh, em] = d.timeSlotEnd.split(':').map(Number);
      return eh * 60 + em > sh * 60 + sm;
    },
    { message: "Ora fine fascia deve essere successiva all'ora inizio", path: ['timeSlotEnd'] }
  );

const updateTournamentSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timeSlotStart: z.string().regex(timeRegex).optional(),
  timeSlotEnd: z.string().regex(timeRegex).optional(),
  matchDuration: z.number().int().min(30).max(120).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED']),
});

module.exports = { createTournamentSchema, updateTournamentSchema, updateStatusSchema };
