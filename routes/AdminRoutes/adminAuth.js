const express = require('express');
const router = express.Router();
const { 
    verifyOtp,
    register, 
    getDashboardStats,
    getRecentUsers, 
    getUserAnalytics, 
    getAllUsers,
    updateUser, 
    getAllPartners, 
    updatePartner, 
    getPartnerById,
    updatePartnerDocumentStatus,
    deactivateUser, 
    activateUser, 
    deactivatePartner, 
    activatePartner, 
    getUserById, 
    deleteUserById, 
    deletePartner, 
    approvePartnerProfile,
    getPendingKycPartners,
    approveMinRateUpdate,
    getPendingMinRatePartners
} = require('../../controllers/admin/adminAuth');

const { verifyToken, isAdmin } = require('../../middleware/auth');
const upload = require("../../middleware/upload");

router.post('/verify-otp', verifyOtp);
router.post('/register', verifyToken, isAdmin, register);

router.put(
    "/test-upload",
    upload.single("profilePic"),
    (req, res) => {
        res.json({
            body: req.body,
            file: req.file
        });
    }
);

router.get("/dashboard/stats", verifyToken, isAdmin, getDashboardStats);
router.get("/dashboard/recent-users", verifyToken, isAdmin, getRecentUsers);
router.get("/dashboard/user-analytics", verifyToken, isAdmin, getUserAnalytics);
router.get("/dashboard/all-users", verifyToken, isAdmin, getAllUsers);
router.get("/dashboard/user/:id", verifyToken, isAdmin, getUserById);
router.delete("/dashboard/user/:id", verifyToken, isAdmin, deleteUserById);
router.put("/dashboard/users/:id", verifyToken, isAdmin, upload.single("profilePic"), updateUser);
router.put("/dashboard/users/:id/deactivate", verifyToken, isAdmin, deactivateUser);
router.put("/dashboard/users/:id/activate", verifyToken, isAdmin, activateUser);

router.get("/dashboard/all-partners", verifyToken, isAdmin, getAllPartners);
router.get("/dashboard/partners/pending-kyc-partners", verifyToken, isAdmin, getPendingKycPartners);
router.get("/dashboard/partners/pending-min-rate", verifyToken, isAdmin, getPendingMinRatePartners);

router.get("/dashboard/partners/:id", verifyToken, isAdmin, getPartnerById);
router.put("/dashboard/partners/:id", verifyToken, isAdmin, upload.single("profilePic"), updatePartner);
router.put("/dashboard/partners/:id/documents", verifyToken, isAdmin, updatePartnerDocumentStatus);
router.put("/dashboard/partners/:id/deactivate", verifyToken, isAdmin, deactivatePartner);
router.put("/dashboard/partners/:id/activate", verifyToken, isAdmin, activatePartner);
router.delete("/dashboard/partners/:id", verifyToken, isAdmin, deletePartner);

router.put("/dashboard/partners/:id/profile-approval", verifyToken, isAdmin, approvePartnerProfile);
router.put("/dashboard/partners/:id/min-rate-approval", verifyToken, isAdmin, approveMinRateUpdate);

module.exports = router;