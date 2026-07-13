const express = require('express');
const router = express.Router();
const { register, login, getDashboardStats,
     getRecentUsers, getUserAnalytics, getAllUsers,
      updateUser, getAllPartners, updatePartner, getPartnerById,
     updatePartnerDocumentStatus } = require('../../controllers/admin/adminAuth');

const { verifyToken, isAdmin } = require('../../middleware/auth');


//auth
router.post('/register', register);
router.post('/login', login);

//dashboard ki apis 

router.get("/dashboard/stats",verifyToken,isAdmin, getDashboardStats);

router.get("/dashboard/recent-users", verifyToken,isAdmin, getRecentUsers);

router.get("/dashboard/user-analytics", verifyToken,isAdmin, getUserAnalytics);

router.get("/dashboard/all-users", verifyToken,isAdmin, getAllUsers);

router.put("/dashboard/users/:id", verifyToken,isAdmin, updateUser);




//partner ki apis

router.get("/dashboard/all-partners", verifyToken,isAdmin, getAllPartners);

router.put("/dashboard/partners/:id", verifyToken,isAdmin, updatePartner);
router.get("/dashboard/partners/:id", verifyToken,isAdmin, getPartnerById);
router.put("/dashboard/partners/:id/documents", verifyToken,isAdmin, updatePartnerDocumentStatus);

module.exports = router;