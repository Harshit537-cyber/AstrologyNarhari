const ConsultationCoupon = require('../../models/Coupon/ConsultationCoupon');

const createCoupon = async (req, res) => {
    try {
        const { code, amount, expiryDate } = req.body;

        if (!code || !amount) {
            return res.status(400).json({ success: false, message: "Code and amount are required." });
        }

        const validAmounts = [51, 101, 151, 201];
        if (!validAmounts.includes(Number(amount))) {
            return res.status(400).json({ success: false, message: "Coupon amount must be 51, 101, 151, or 201." });
        }

        const existingCoupon = await ConsultationCoupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists." });
        }

        const coupon = await ConsultationCoupon.create({
            code,
            amount: Number(amount),
            expiryDate: expiryDate || null
        });

        return res.status(201).json({
            success: true,
            message: "Consultation coupon created successfully",
            data: coupon
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAllCoupons = async (req, res) => {
    try {
        const coupons = await ConsultationCoupon.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: coupons });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, amount, isActive, expiryDate } = req.body;

        const coupon = await ConsultationCoupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        if (amount) {
            const validAmounts = [51, 101, 151, 201];
            if (!validAmounts.includes(Number(amount))) {
                return res.status(400).json({ success: false, message: "Coupon amount must be 51, 101, 151, or 201." });
            }
            coupon.amount = Number(amount);
        }

        if (code) coupon.code = code;
        if (isActive !== undefined) coupon.isActive = isActive;
        if (expiryDate !== undefined) coupon.expiryDate = expiryDate;

        await coupon.save();

        return res.status(200).json({
            success: true,
            message: "Consultation coupon updated successfully",
            data: coupon
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await ConsultationCoupon.findByIdAndDelete(id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        return res.status(200).json({ success: true, message: "Consultation coupon deleted successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createCoupon,
    getAllCoupons,
    updateCoupon,
    deleteCoupon
};