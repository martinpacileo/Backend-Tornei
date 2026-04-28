const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { rescheduleSchema, resultSchema, createCardSchema } = require('../validators/match.validator');
const matchCtrl = require('../controllers/match.controller');
const cardCtrl = require('../controllers/card.controller');

// Mounted at /api/matches
router.get('/:id', matchCtrl.getMatch);
router.patch('/:id/reschedule', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(rescheduleSchema), matchCtrl.rescheduleMatch);
router.post('/:id/result', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(resultSchema), matchCtrl.enterResult);
router.post('/:id/cards', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(createCardSchema), cardCtrl.addCard);
router.delete('/cards/:cardId', authenticate, checkRole(['ADMIN', 'ORGANIZER']), cardCtrl.deleteCard);

module.exports = router;
