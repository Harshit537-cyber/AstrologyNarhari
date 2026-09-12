const express = require('express');
const router = express.Router();
const { applyFirstTimeCoupon ,getAvailableCoupons} = require('../../controllers/User/userCouponController');
const { verifyToken, isUser } = require('../../middleware/auth');

router.get('/available', verifyToken, isUser, getAvailableCoupons);

router.post('/apply', verifyToken, isUser, applyFirstTimeCoupon);

module.exports = router;