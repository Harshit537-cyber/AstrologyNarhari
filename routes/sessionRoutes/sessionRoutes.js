const express = require('express');
const router = express.Router();
const { 
    initiateSessionRequest, 
    respondToSessionRequest,
    getPartnerPendingRequest,
    getUserRequestStatus
} = require('../../controllers/Session/sessionController');
const { verifyToken } = require('../../middleware/auth');

router.post('/user/request', verifyToken, initiateSessionRequest);
router.post('/partner/respond', verifyToken, respondToSessionRequest);

router.get('/partner/pending-request', verifyToken, getPartnerPendingRequest);
router.get('/user/request-status/:requestId', verifyToken, getUserRequestStatus);

module.exports = router;