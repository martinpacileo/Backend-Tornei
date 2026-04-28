const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Dati non validi.',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma unique constraint
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'Record già esistente.' });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Record non trovato.' });
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File troppo grande.' });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({ success: false, error: err.message || 'Errore interno del server.' });
};

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
