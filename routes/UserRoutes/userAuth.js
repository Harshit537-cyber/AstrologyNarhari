const express = require('express');
const router = express.Router();
const { 
    verifyOTP, 
    deactivateAccount, 
    deleteAccount,
    searchExperts, 
    getUserTransactionHistory, 
    logoutUser,
    activateAccount, 
    getPartners, 
    getAllPartnersForUser, 
    getAllPandits,
    searchPandits,
    getPanditById,
    updateFCMToken 
} = require('../../controllers/User/userAuth');
const { verifyToken, isUser } = require('../../middleware/auth');

router.post('/verify-otp', verifyOTP);
router.post('/deactivate-account', verifyToken, isUser, deactivateAccount);
router.post('/activate-account', verifyToken, isUser, activateAccount);

router.get('/partners', verifyToken, isUser, getPartners);
router.get('/all-partners', verifyToken, isUser, getAllPartnersForUser);
router.get("/search-experts", verifyToken, isUser, searchExperts);

router.get('/pandits', verifyToken, isUser, getAllPandits);
router.get('/search-pandits', verifyToken, isUser, searchPandits);
router.get('/pandit/:id', verifyToken, isUser, getPanditById);

router.patch("/update-fcm", verifyToken, isUser, updateFCMToken);
router.post("/logout", verifyToken, isUser, logoutUser);

router.get("/transaction/history", verifyToken, isUser, getUserTransactionHistory);

router.delete('/delete-account', verifyToken, isUser, deleteAccount);

module.exports = router;