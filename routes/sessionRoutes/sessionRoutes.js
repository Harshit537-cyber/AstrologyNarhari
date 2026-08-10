// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const { initiateSessionRequest, respondToSessionRequest } = require('../../controllers/sessionController/sessionController');
const { verifyToken } = require('../../middleware/auth'); // Apne auth middleware ka reference yaha lagayein

// User Instant Chat/Call Request bhejne ke liye
router.post('/user/request', verifyToken, initiateSessionRequest);

// Partner Request Accept / Decline karne ke liye
router.post('/partner/respond', verifyToken, respondToSessionRequest);

module.exports = router;