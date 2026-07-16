const express = require('express');
const router = express.Router();
const { verifyToken, isUser } = require('../../middleware/auth');
const { addMoney, getBalance } = require('../../controllers/User/walletController');

router.post('/add-money', verifyToken, isUser, addMoney);
router.get('/balance', verifyToken, isUser, getBalance);

module.exports = router;