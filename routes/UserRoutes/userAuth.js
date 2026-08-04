const express = require('express');
const router = express.Router();
const { verifyOTP, deactivateAccount, deleteAccount ,searchExperts, activateAccount, getPartners, getAllPartnersForUser, updateFCMToken } = require('../../controllers/User/userAuth');
const { verifyToken, isUser } = require('../../middleware/auth');

router.post('/verify-otp', verifyOTP);
router.post('/deactivate-account', verifyToken, isUser, deactivateAccount);
router.post('/activate-account', verifyToken, isUser, activateAccount);

router.get('/partners', verifyToken, isUser, getPartners);
router.get('/all-partners', verifyToken, isUser, getAllPartnersForUser);
router.get("/search-experts", verifyToken, isUser, searchExperts);

router.patch("/update-fcm", verifyToken, isUser, updateFCMToken);


router.delete('/delete-account', verifyToken, isUser, deleteAccount);

module.exports = router;