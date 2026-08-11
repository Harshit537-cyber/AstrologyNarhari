const express = require('express');
const router = express.Router();
const { 
    initiateSessionRequest, 
    cancelSessionRequest,
    respondToSessionRequest,
    endSession,
    getPartnerPendingRequests,
    getUserRequestStatus
} = require('../../controllers/sessionController/sessionController');
const { verifyToken } = require('../../middleware/auth');

router.post('/user/request', verifyToken, initiateSessionRequest);
router.post('/user/cancel', verifyToken, cancelSessionRequest);
router.get('/user/request-status/:requestId', verifyToken, getUserRequestStatus);

router.post('/partner/respond', verifyToken, respondToSessionRequest);
router.get('/partner/pending-requests', verifyToken, getPartnerPendingRequests);

router.post('/end', verifyToken, endSession);

module.exports = router;