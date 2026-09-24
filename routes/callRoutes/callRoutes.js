const express = require("express");
const router = express.Router();

const callController = require("../../controllers/exotel/callController");
const webhookController = require("../../controllers/exotel/webHookController");

const { verifyToken } = require("../../middleware/auth");

// 1. Call Initiate & Terminate
router.post("/initiate-call", verifyToken, callController.initiateCall);
router.post("/terminateCall", verifyToken, callController.endCallManually);

// 2. Exotel Webhook (Exotel yahan call details bhejta hai)
router.all("/webhook", webhookController.exotelWebhook);

// 3. Check Kitne Min Baat Hui (Call Summary)
router.get("/summary/:bookingId", verifyToken, callController.getCallSummary);

// 4. Call History APIs
router.get("/history", verifyToken, callController.getCallHistory);
router.get("/history/:uid", verifyToken, callController.getCallHistoryByUid);

// 5. Partner Online/Offline Status
router.patch("/toggle-availability", verifyToken, callController.togglePartnerAvailability);

// 6. Chat Initiate
router.post("/initiate/chat", verifyToken, callController.initiateChat);

module.exports = router;