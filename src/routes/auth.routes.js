const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validator');
const ctrl = require('../controllers/auth.controller');

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/register/organizer', validate(registerSchema), ctrl.registerOrganizer);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
