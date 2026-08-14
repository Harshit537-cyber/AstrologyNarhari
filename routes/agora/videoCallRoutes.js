const express = require('express');
const router = express.Router();
const videoCallController = require('../../controllers/agora/videoCallController'); 
const { verifyToken} = require('../../middleware/auth'); 

router.post('/initiate', verifyToken, videoCallController.initiateVideoCall);

router.post('/terminate', verifyToken, videoCallController.terminateVideoCall);

router.post('/settle', verifyToken, videoCallController.completeAndSettleCall);

router.post('/refund', verifyToken, videoCallController.cancelAndRefund);

module.exports = router;