const ConsultationCoupon = require('../../models/Coupon/ConsultationCoupon');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction/Transaction');
const mongoose = require('mongoose');

const applyFirstTimeCoupon = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user.id;
        const { code } = req.body;

        if (!code) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Coupon code is required." });
        }

        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (user.hasClaimedFirstCoupon) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: "You have already claimed your first-time free coupon/bonus. Please add money to your wallet to continue." 
            });
        }

        const coupon = await ConsultationCoupon.findOne({ code: code.toUpperCase() }).session(session);
        if (!coupon || !coupon.isActive) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Invalid or inactive consultation coupon code." });
        }

        if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "This coupon has expired." });
        }

        if (coupon.usedBy.includes(userId)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "You have already used this coupon." });
        }

        // Credit amount to wallet for free chat/call
        user.walletBalance = (user.walletBalance || 0) + coupon.amount;
        user.hasClaimedFirstCoupon = true;
        await user.save({ session });

        coupon.usedBy.push(userId);
        await coupon.save({ session });

        await Transaction.create([{
            user: userId,
            razorpay_order_id: `consultation_coupon_${coupon._id}_${Date.now()}`,
            amount: coupon.amount,
            status: 'success',
            type: 'deposit',
            description: `First time free consultation bonus via coupon: ${coupon.code}`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: `Coupon applied successfully! ₹${coupon.amount} added to your wallet for your first free chat/call.`,
            walletBalance: user.walletBalance
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};


const getAvailableCoupons = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Agar user pehle hi first coupon claim kar chuka hai, toh usko empty list ya restricted message dikha sakte hain
        if (user.hasClaimedFirstCoupon) {
            return res.status(200).json({
                success: true,
                message: "You have already claimed your first-time bonus.",
                data: []
            });
        }

        // Sirf active aur expiry date na nikle hue ya valid coupons fetch karo
        const currentDate = new Date();
        const coupons = await ConsultationCoupon.find({
            isActive: true,
            $or: [
                { expiryDate: { $gte: currentDate } },
                { expiryDate: null }
            ],
            usedBy: { $ne: userId } // Jinhe is user ne use nahi kiya
        }).select('code amount expiryDate');

        return res.status(200).json({
            success: true,
            count: coupons.length,
            data: coupons
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};



module.exports = {
    applyFirstTimeCoupon,
    getAvailableCoupons
};