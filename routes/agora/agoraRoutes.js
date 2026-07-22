const express = require('express');
const router = express.Router();
const agoraController = require('../../controllers/agora/agoraController'); // Path check kar lena

// 1. Partner Side: Live start karne ke liye
// Method: POST | Body: { partnerId, topic, category }
router.post('/start', agoraController.startLive);

// 2. User Side: Live join karne ke liye
// Method: POST | Body: { sessionId, userId }
router.post('/join', agoraController.joinLive);

// 3. User Side: Active sessions ki list dekhne ke liye (Home Screen & View All)
// Method: GET | Query: ?category=Love (optional)
router.get('/active-sessions', agoraController.getActiveSessions);

// 4. Partner Side: Live khatam karne ke liye
// Method: POST | Body: { partnerId }
router.post('/end', agoraController.endLive);

// 5. User Side: Live video like karne ke liye
// Method: POST | Body: { sessionId }
router.post('/like', agoraController.likeSession);


router.get("/viewer-count/:sessionId", agoraController.getViewerCount);

module.exports = router;