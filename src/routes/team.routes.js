const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createPlayerSchema, updatePlayerSchema } = require('../validators/team.validator');
const ctrl = require('../controllers/player.controller');

// Mounted at /api/teams
router.get('/:teamId/players', ctrl.listPlayers);
router.post('/:teamId/players', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(createPlayerSchema), ctrl.createPlayer);
router.put('/:teamId/players/:playerId', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(updatePlayerSchema), ctrl.updatePlayer);
router.delete('/:teamId/players/:playerId', authenticate, checkRole(['ADMIN', 'ORGANIZER']), ctrl.deletePlayer);
router.get('/players/:playerId/suspension', ctrl.getPlayerSuspension);

module.exports = router;
