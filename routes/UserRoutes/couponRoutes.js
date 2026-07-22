const express = require("express");
const router = express.Router();

const couponController = require("../../controllers/User/couponController");
const {verifyToken} = require("../../middleware/auth");

// ==========================
// Coupon Routes
// ==========================

// Get All Available Coupons
router.get(
    "/coupons",
    verifyToken,
    couponController.getAvailableCoupons
);

// Apply Coupon
router.post(
    "/coupon/apply",
    verifyToken,
    couponController.applyCoupon
);

// Remove Coupon
router.post(
    "/coupon/remove",
    verifyToken,
    couponController.removeCoupon
);

// Validate Coupon
router.post(
    "/coupon/validate",
    verifyToken,
    couponController.validateCoupon
);

module.exports = router;