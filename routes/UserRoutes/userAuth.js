const express = require('express');
const router = express.Router();
const { register, login, deactivateAccount, activateAccount, getPartners } = require('../../controllers/User/userAuth');
const { verifyToken, isUser } = require('../../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/deactivate-account', verifyToken, isUser, deactivateAccount);
router.post('/activate-account', verifyToken, isUser, activateAccount);

router.get('/partners', verifyToken, isUser, getPartners);

module.exports = router;