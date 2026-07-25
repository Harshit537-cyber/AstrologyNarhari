const express = require('express');
const router = express.Router();
const agoraController = require('../../controllers/agora/agoraController'); 
const { verifyToken } = require('../../middleware/auth');

router.post('/start', agoraController.startLive);
router.post('/join', agoraController.joinLive);
router.get('/active-sessions', agoraController.getActiveSessions);
router.post('/end', agoraController.endLive);
router.post('/like', agoraController.likeSession);
router.get("/viewer-count/:sessionId", agoraController.getViewerCount);
router.get("/like-stats/:sessionId", agoraController.getLikeStats);
router.post("/leave", agoraController.leaveLive);
router.post("/rating", agoraController.submitFeedback);
router.post("/start-consultation", verifyToken, agoraController.startConsultation);
router.post("/end-consultation", verifyToken, agoraController.endConsultation);
router.post("/handle-missedCall", verifyToken, agoraController.handleMissedCall);



module.exports = router;