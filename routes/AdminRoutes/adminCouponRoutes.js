const express = require("express");
const router = express.Router();
const { 
    createCoupon, 
    getAllCoupons, 
    updateCoupon, 
    deleteCoupon 
} = require("../../controllers/admin/adminCouponController");
const { verifyToken, isAdmin } = require("../../middleware/auth");

router.post("/create", verifyToken, isAdmin, createCoupon);
router.get("/all", verifyToken, isAdmin, getAllCoupons);
router.put("/update/:id", verifyToken, isAdmin, updateCoupon);
router.delete("/delete/:id", verifyToken, isAdmin, deleteCoupon);

module.exports = router;