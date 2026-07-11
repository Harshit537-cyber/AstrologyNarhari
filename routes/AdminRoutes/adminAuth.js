const express = require('express');
const router = express.Router();
const { register, login, getDashboardStats, getRecentUsers, getUserAnalytics } = require('../../controllers/admin/adminAuth');

router.post('/register', register);
router.post('/login', login);








//dashboard ki apis 



router.get("/dashboard/stats", getDashboardStats);

router.get("/dashboard/recent-users", getRecentUsers);

router.get("/dashboard/user-analytics", getUserAnalytics);


module.exports = router;
