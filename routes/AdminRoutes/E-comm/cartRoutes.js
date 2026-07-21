const express = require("express");
const router = express.Router();

const couponController = require("../../../controllers/Admin/E-comm/couponController");
const {verifyToken, isAdmin} = require("../../../middleware/auth");


// Add Coupon
router.post(
    "/add",
    verifyToken,
    isAdmin,
    couponController.addCoupon
);

// Get All Coupons
router.get(
    "/list",
     verifyToken,
    isAdmin,
    couponController.getAllCoupons
);

// Get Coupon By ID
router.get(
    "/:id",
    verifyToken,
    isAdmin,
    couponController.getCouponById
);

// Update Coupon
router.put(
    "/update/:id",
    verifyToken,
    isAdmin,
    couponController.updateCoupon
);

// Delete Coupon
router.delete(
    "/delete/:id",
    verifyToken,
    isAdmin,
    couponController.deleteCoupon
);

module.exports = router;