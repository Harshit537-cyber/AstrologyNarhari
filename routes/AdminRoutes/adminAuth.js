const express = require('express');
const router = express.Router();
const { register, login, getDashboardStats,
     getRecentUsers, getUserAnalytics, getAllUsers,
      updateUser, getAllPartners, updatePartner, getPartnerById,
     updatePartnerDocumentStatus,
     deactivateUser, activateUser, deactivatePartner, activatePartner, getUserById, deleteUserById, deletePartner, approvePartnerProfile } = require('../../controllers/admin/adminAuth');

const { verifyToken, isAdmin } = require('../../middleware/auth');

router.post('/register', register);
router.post('/login', login);

router.get("/dashboard/stats", verifyToken, isAdmin, getDashboardStats);
router.get("/dashboard/recent-users", verifyToken, isAdmin, getRecentUsers);
router.get("/dashboard/user-analytics", verifyToken, isAdmin, getUserAnalytics);
router.get("/dashboard/all-users", verifyToken, isAdmin, getAllUsers);
router.get("/dashboard/user/:id", verifyToken, isAdmin, getUserById);
router.delete("/dashboard/user/:id", verifyToken, isAdmin, deleteUserById);
router.put("/dashboard/users/:id", verifyToken, isAdmin, updateUser);
router.put("/dashboard/users/:id/deactivate", verifyToken, isAdmin, deactivateUser);
router.put("/dashboard/users/:id/activate", verifyToken, isAdmin, activateUser);

router.get("/dashboard/all-partners", verifyToken, isAdmin, getAllPartners);
router.put("/dashboard/partners/:id", verifyToken, isAdmin, updatePartner);
router.get("/dashboard/partners/:id", verifyToken, isAdmin, getPartnerById);
router.put("/dashboard/partners/:id/documents", verifyToken, isAdmin, updatePartnerDocumentStatus);
router.put("/dashboard/partners/:id/deactivate", verifyToken, isAdmin, deactivatePartner);
router.put("/dashboard/partners/:id/activate", verifyToken, isAdmin, activatePartner);
router.delete("/dashboard/partners/:id", verifyToken, isAdmin, deletePartner);

router.put("/dashboard/partners/:id/profile-approval", verifyToken, isAdmin, approvePartnerProfile);

module.exports = router;