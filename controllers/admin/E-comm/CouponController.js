const Coupon = require("../../../models/E-comm/Coupon");

// ===================================
// Add Coupon
// ===================================
exports.addCoupon = async (req, res) => {
    try {
        const {
            code,
            title,
            description,
            discountType,
            discountValue,
            minimumOrderAmount,
            maximumDiscount,
            usageLimit,
            startDate,
            endDate,
            isActive,
        } = req.body;

        if (
            !code ||
            !title ||
            !discountType ||
            !discountValue ||
            !startDate ||
            !endDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing.",
            });
        }

        const exists = await Coupon.findOne({
            code: code.toUpperCase(),
        });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists.",
            });
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            title,
            description,
            discountType,
            discountValue,
            minimumOrderAmount,
            maximumDiscount,
            usageLimit,
            startDate,
            endDate,
            isActive,
        });

        return res.status(201).json({
            success: true,
            message: "Coupon created successfully.",
            data: coupon,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ===================================
// Get All Coupons
// ===================================
exports.getAllCoupons = async (req, res) => {
    try {

        const coupons = await Coupon.find()
            .sort({ createdAt: -1 });

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


// ===================================
// Get Coupon By ID
// ===================================
exports.getCouponById = async (req, res) => {
    try {

        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: coupon,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ===================================
// Update Coupon
// ===================================
exports.updateCoupon = async (req, res) => {
    try {

        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        if (req.body.code) {
            const exists = await Coupon.findOne({
                _id: { $ne: req.params.id },
                code: req.body.code.toUpperCase(),
            });

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon code already exists.",
                });
            }

            coupon.code = req.body.code.toUpperCase();
        }

        coupon.title = req.body.title ?? coupon.title;
        coupon.description = req.body.description ?? coupon.description;
        coupon.discountType = req.body.discountType ?? coupon.discountType;
        coupon.discountValue = req.body.discountValue ?? coupon.discountValue;
        coupon.minimumOrderAmount = req.body.minimumOrderAmount ?? coupon.minimumOrderAmount;
        coupon.maximumDiscount = req.body.maximumDiscount ?? coupon.maximumDiscount;
        coupon.usageLimit = req.body.usageLimit ?? coupon.usageLimit;
        coupon.startDate = req.body.startDate ?? coupon.startDate;
        coupon.endDate = req.body.endDate ?? coupon.endDate;
        coupon.isActive = req.body.isActive ?? coupon.isActive;

        await coupon.save();

        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully.",
            data: coupon,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ===================================
// Delete Coupon
// ===================================
exports.deleteCoupon = async (req, res) => {
    try {

        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found.",
            });
        }

        await coupon.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully.",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};