const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, deactivateAccount, searchExperts,activateAccount, getPartners,getAllPartnersForUser, updateFCMToken  } = require('../../controllers/User/userAuth');
const { verifyToken, isUser } = require('../../middleware/auth');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/deactivate-account', verifyToken, isUser, deactivateAccount);
router.post('/activate-account', verifyToken, isUser, activateAccount);

router.get('/partners', verifyToken, isUser, getPartners);

router.get('/all-partners', verifyToken, isUser, getAllPartnersForUser);
router.get("/search-experts", verifyToken, isUser, searchExperts)

router.patch("/update-fcm", verifyToken, isUser, updateFCMToken);

module.exports = router;