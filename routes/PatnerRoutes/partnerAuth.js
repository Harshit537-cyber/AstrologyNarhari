const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
const { verifyToken, isPartner } = require('../../middleware/auth');

// Controllers Imports
const { 
    sendOtp, 
    verifyOtp, 
    sendLoginOtp, 
    loginWithOtp, 
    register, 
    getProfile, 
    deleteAccount,
    deactivateAccount,
    activateAccount
} = require('../../controllers/Patner/partnerAuth');

const { dutyOn, dutyOff, getDutyStatus } = require('../../controllers/Patner/partnerDuty');
const { addBankAccount, updateBankAccount, getBankAccount } = require('../../controllers/Patner/partnerBank');
const { uploadKycDocuments, getKycStatus } = require('../../controllers/Patner/partnerKyc');

// ==========================================
// 1. AUTHENTICATION ROUTES (Firebase flow)
// ==========================================
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login-send-otp', sendLoginOtp);
router.post('/login-verify', loginWithOtp);

// ==========================================
// 2. PROFILE & ACCOUNT MANAGEMENT ROUTES
// ==========================================
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

router.patch(
    '/deactivate',
    verifyToken,
    isPartner,
    deactivateAccount
);

router.patch(
    '/activate',
    verifyToken,
    isPartner,
    activateAccount
);

// ==========================================
// 3. DUTY STATUS ROUTES
// ==========================================
router.patch(
    '/duty-on',
    verifyToken,
    isPartner,
    dutyOn
);

router.patch(
    '/duty-off',
    verifyToken,
    isPartner,
    dutyOff
);

router.get(
    '/duty-status',
    verifyToken,
    isPartner,
    getDutyStatus
);

// ==========================================
// 4. BANK ACCOUNT ROUTES
// ==========================================
router.post(
    '/bank-account',
    verifyToken,
    isPartner,
    addBankAccount
);

router.put(
    '/bank-account',
    verifyToken,
    isPartner,
    updateBankAccount
);

router.get(
    '/bank-account',
    verifyToken,
    isPartner,
    getBankAccount
);

// ==========================================
// 5. KYC ROUTES
// ==========================================
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

router.get(
    '/kyc/status', 
    verifyToken, 
    isPartner, 
    getKycStatus
);

module.exports = router;