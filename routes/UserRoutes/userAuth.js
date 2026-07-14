const express = require('express');
const router = express.Router();
const { register, login, deactivateAccount, activateAccount } = require('../../controllers/User/userAuth');
const { verifyToken, isUser } = require('../../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/deactivate-account', verifyToken, isUser, deactivateAccount);
router.post('/activate-account', verifyToken, isUser, activateAccount);

module.exports = router;