const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
const { verifyToken, isPartner } = require('../../middleware/auth');
const { sendOtp, verifyOtp, sendLoginOtp, loginWithOtp, register } = require('../../controllers/Patner/partnerAuth');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.post('/login-send-otp', sendLoginOtp);
router.post('/login-verify', loginWithOtp);

router.post(
    '/register',
    verifyToken,
    isPartner,
    upload.fields([
        { name: 'profilePic', maxCount: 1 },
        { name: 'additionalPhotos', maxCount: 4 }
    ]),
    register
);

module.exports = router;