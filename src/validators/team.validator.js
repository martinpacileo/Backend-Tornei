const { z } = require('zod');

const createTeamSchema = z.object({
  name: z.string().min(2, 'Nome squadra min 2 caratteri').max(100),
});

const updateTeamSchema = createTeamSchema.partial();

const createPlayerSchema = z.object({
  name: z.string().min(2, 'Nome giocatore min 2 caratteri').max(100),
  number: z.number().int().min(1).max(99).optional(),
});

const updatePlayerSchema = createPlayerSchema.partial();

module.exports = { createTeamSchema, updateTeamSchema, createPlayerSchema, updatePlayerSchema };
