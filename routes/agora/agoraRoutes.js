const express = require('express');
const router = express.Router();
const agoraController = require('../../controllers/agora/agoraController'); // Path check kar lena

router.post('/start', agoraController.startLive);
router.post('/join', agoraController.joinLive);
router.get('/active-sessions', agoraController.getActiveSessions);
router.post('/end', agoraController.endLive);
router.post('/like', agoraController.likeSession);
router.get("/viewer-count/:sessionId", agoraController.getViewerCount);
router.get("/like-stats/:sessionId", agoraController.getLikeStats)



module.exports = router;