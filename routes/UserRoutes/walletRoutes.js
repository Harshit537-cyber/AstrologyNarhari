const express = require('express');
const router = express.Router();
const { verifyToken, isUser } = require('../../middleware/auth');
const { addMoney, getBalance, createOrder, verifyPayment } = require('../../controllers/User/walletController');

router.post('/add-money', verifyToken, isUser, addMoney);
router.get('/balance', verifyToken, isUser, getBalance);
router.post("/create-order", verifyToken, createOrder );
router.post("/verify-payment", verifyToken, verifyPayment);

module.exports = router;