const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password min 8 caratteri').max(100),
  name: z.string().min(2, 'Nome min 2 caratteri').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obbligatorio'),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
