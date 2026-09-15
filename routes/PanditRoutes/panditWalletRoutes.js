const express = require('express');
const router = express.Router();
const { verifyToken, isPandit } = require('../../middleware/auth');
const { 
    getPanditWalletBalance, 
    getPanditEarningsHistory 
} = require('../../controllers/Pandit/panditWalletController');

router.get('/wallet/balance', verifyToken, isPandit, getPanditWalletBalance);
router.get('/wallet/earnings', verifyToken, isPandit, getPanditEarningsHistory);

module.exports = router;