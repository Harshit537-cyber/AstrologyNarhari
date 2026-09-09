const express = require('express');
const router = express.Router();
const { verifyToken, isUser } = require('../../middleware/auth');
const { 
    addMoney, 
    getBalance, 
    createOrder, 
    verifyPayment,
    startChat,
    endChat
} = require('../../controllers/User/walletController');

// Wallet APIs
router.post('/add-money', verifyToken, isUser, addMoney);
router.get('/balance', verifyToken, isUser, getBalance);
router.post("/create-order", verifyToken, createOrder);
router.post("/verify-payment", verifyToken, verifyPayment);

// Chat Billing APIs
router.post("/start-chat", verifyToken, isUser, startChat);
router.post("/end-chat", verifyToken, isUser, endChat);

module.exports = router;