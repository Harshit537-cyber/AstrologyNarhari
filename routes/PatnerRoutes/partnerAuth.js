const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
const { verifyToken, isPartner } = require('../../middleware/auth');
const { sendOtp, verifyOtp, sendLoginOtp, loginWithOtp, register, getProfile, deleteAccount } = require('../../controllers/Patner/partnerAuth');
const { uploadKycDocuments, getKycStatus } = require('../../controllers/Patner/partnerKyc');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.post('/login-send-otp', sendLoginOtp);
router.post('/login-verify', loginWithOtp);
router.get(
    '/profile',
    verifyToken,
    isPartner,
    getProfile
);

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
router.delete(
    '/delete-account',
    verifyToken,
    isPartner,
    deleteAccount
);

router.post(
    '/kyc/upload',
    verifyToken,
    isPartner,
    upload.fields([
        { name: 'selfie', maxCount: 1 },
        { name: 'nationalId', maxCount: 1 },
        { name: 'astrologyCertificate', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 }
    ]),
    uploadKycDocuments
);

router.get('/kyc/status', verifyToken, isPartner, getKycStatus);

module.exports = router;