const express = require('express');
const router = express.Router();

const callController = require('../../controllers/exotel/callController');
const webhookController = require('../../controllers/exotel/webHookController');

const { verifyToken } = require('../../middleware/auth'); 

router.post('/initiate-call', verifyToken, callController.initiateCall);

router.post('/webhook', webhookController.exotelWebhook);

router.post("/terminateCall", verifyToken, callController.endCallManually)
module.exports = router;