const checkRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Autenticazione richiesta.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Permessi insufficienti.' });
  }
  next();
};

module.exports = { checkRole };
