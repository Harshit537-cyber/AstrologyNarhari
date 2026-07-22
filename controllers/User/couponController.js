const Coupon = require("../../models/E-comm/Coupon");
const Cart = require("../../models/E-comm/Cart");


// ======================================
// Get Available Coupons
// ======================================
exports.getAvailableCoupons = async (req, res) => {
    try {

        const today = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: today },
            endDate: { $gte: today },
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: coupons.length,
            data: coupons,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ======================================
// Apply Coupon
// ======================================
exports.applyCoupon = async (req, res) => {
    try {

        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required.",
            });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Invalid coupon.",
            });
        }

        const today = new Date();

        if (today < coupon.startDate || today > coupon.endDate) {
            return res.status(400).json({
                success: false,
                message: "Coupon has expired.",
            });
        }

        if (
            coupon.usageLimit > 0 &&
            coupon.usedCount >= coupon.usageLimit
        ) {
            return res.status(400).json({
                success: false,
                message: "Coupon usage limit exceeded.",
            });
        }

        const cart = await Cart.findOne({
            user: req.user.id,
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty.",
            });
        }

        if (cart.totalAmount < coupon.minimumOrderAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount is ₹${coupon.minimumOrderAmount}.`,
            });
        }

        let discount = 0;

        if (coupon.discountType === "PERCENTAGE") {

            discount =
                (cart.totalAmount * coupon.discountValue) / 100;

            if (
                coupon.maximumDiscount > 0 &&
                discount > coupon.maximumDiscount
            ) {
                discount = coupon.maximumDiscount;
            }

        } else {

            discount = coupon.discountValue;
        }

        const finalAmount = Math.max(
            cart.totalAmount - discount,
            0
        );

        return res.status(200).json({
            success: true,
            message: "Coupon applied successfully.",
            data: {
                couponId: coupon._id,
                couponCode: coupon.code,
                discount,
                totalAmount: cart.totalAmount,
                finalAmount,
            },
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};


// ======================================
// Remove Coupon
// ======================================
exports.removeCoupon = async (req, res) => {

    try {

        return res.status(200).json({
            success: true,
            message: "Coupon removed successfully.",
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};


// ======================================
// Validate Coupon
// ======================================
exports.validateCoupon = async (req, res) => {

    try {

        const { code } = req.body;

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        const today = new Date();

        if (today < coupon.startDate || today > coupon.endDate) {
            return res.status(400).json({
                success: false,
                message: "Coupon expired.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon is valid.",
            data: coupon,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};