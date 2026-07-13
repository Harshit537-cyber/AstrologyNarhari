const express = require('express');
const router = express.Router();
const { register, login, getDashboardStats,
     getRecentUsers, getUserAnalytics, getAllUsers, updateUser, getAllPartners, updatePartner } = require('../../controllers/admin/adminAuth');


//auth
router.post('/register', register);
router.post('/login', login);

//dashboard ki apis 

router.get("/dashboard/stats", getDashboardStats);

router.get("/dashboard/recent-users", getRecentUsers);

router.get("/dashboard/user-analytics", getUserAnalytics);

router.get("/dashboard/all-users", getAllUsers);

router.put("/dashboard/users/:id", updateUser);

router.get("/dashboard/all-partners", getAllPartners);

router.put("/dashboard/partners/:id", updatePartner);

module.exports = router;