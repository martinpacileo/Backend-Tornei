const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const ctrl = require('../controllers/admin.controller');

router.use(authenticate, checkRole(['ADMIN']));

router.get('/users', ctrl.listUsers);
router.get('/organizers/pending', ctrl.getPendingOrganizers);
router.patch('/users/:id/approve', ctrl.approveUser);
router.patch('/users/:id/disable', ctrl.disableUser);
router.patch('/users/:id/enable', ctrl.enableUser);

module.exports = router;
