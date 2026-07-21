const express = require("express");
const router = express.Router();

const couponController = require("../../../controllers/Admin/E-comm/couponController");
const {verifyToken, isAdmin} = require("../../../middleware/auth")


const upload = require("../../../middleware/upload");

// Add Coupon
router.post(
    "/add",
    auth,
    adminAuth,
    couponController.addCoupon
);

// Get All Coupons
router.get(
    "/list",
    auth,
    adminAuth,
    couponController.getAllCoupons
);

// Get Coupon By ID
router.get(
    "/:id",
    auth,
    adminAuth,
    couponController.getCouponById
);

// Update Coupon
router.put(
    "/update/:id",
    auth,
    adminAuth,
    couponController.updateCoupon
);

// Delete Coupon
router.delete(
    "/delete/:id",
    auth,
    adminAuth,
    couponController.deleteCoupon
);

module.exports = router;