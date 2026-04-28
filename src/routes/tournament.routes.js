const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createTournamentSchema, updateTournamentSchema, updateStatusSchema } = require('../validators/tournament.validator');
const { createTeamSchema, updateTeamSchema } = require('../validators/team.validator');
const { uploadLogo } = require('../middlewares/upload.middleware');
const tCtrl = require('../controllers/tournament.controller');
const teamCtrl = require('../controllers/team.controller');
const matchCtrl = require('../controllers/match.controller');
const standingCtrl = require('../controllers/standing.controller');
const cardCtrl = require('../controllers/card.controller');

// --- Tournaments ---
router.get('/', optionalAuth, tCtrl.listTournaments);
router.post('/', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(createTournamentSchema), tCtrl.createTournament);
router.get('/:id', optionalAuth, tCtrl.getTournament);
router.put('/:id', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(updateTournamentSchema), tCtrl.updateTournament);
router.delete('/:id', authenticate, checkRole(['ADMIN', 'ORGANIZER']), tCtrl.deleteTournament);
router.post('/:id/generate-calendar', authenticate, checkRole(['ADMIN', 'ORGANIZER']), tCtrl.generateCalendar);
router.patch('/:id/status', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(updateStatusSchema), tCtrl.updateStatus);

// --- Teams (under tournament) ---
router.get('/:id/teams', teamCtrl.listTeams);
router.post('/:id/teams', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(createTeamSchema), teamCtrl.createTeam);
router.put('/:id/teams/:teamId', authenticate, checkRole(['ADMIN', 'ORGANIZER']), validate(updateTeamSchema), teamCtrl.updateTeam);
router.delete('/:id/teams/:teamId', authenticate, checkRole(['ADMIN', 'ORGANIZER']), teamCtrl.deleteTeam);
router.post('/:id/teams/:teamId/logo', authenticate, checkRole(['ADMIN', 'ORGANIZER']), (req, res, next) => {
  uploadLogo(req, res, (err) => (err ? next(err) : next()));
}, teamCtrl.uploadLogo);

// --- Matches calendar ---
router.get('/:id/matches', matchCtrl.listMatches);

// --- Standings ---
router.get('/:id/standings', standingCtrl.getStandings);

// --- Cards in tournament ---
router.get('/:id/cards', cardCtrl.getTournamentCards);

module.exports = router;
