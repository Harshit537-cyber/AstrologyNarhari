const User = require('../../models/User');
const razorpayInstance = require('../../config/razorpay');
const Transaction = require('../../models/Transaction/Transaction');
const crypto = require('crypto');
const mongoose = require('mongoose');

const addMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + Number(amount);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Money added to wallet successfully',
            walletBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('walletBalance');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            walletBalance: user.walletBalance || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const createOrder = async (req, res) => {
    try {
        const { amount, userId } = req.body;

        if (!amount || amount < 1) {
            return res.status(400).json({ success: false, message: "Minimum amount should be ₹1" });
        }

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const options = {
            amount: Math.round(amount * 100), 
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            notes: { userId } 
        };

        const order = await razorpayInstance.orders.create(options);

        await Transaction.create({
            user: userId,
            razorpay_order_id: order.id,
            amount: amount, 
            status: 'pending',
            type: 'deposit'
        });

        res.status(200).json({ success: true, order });

    } catch (error) {
        console.error("CRITICAL: Razorpay Order Creation Failed", error);
        res.status(500).json({ success: false, message: "Could not initiate payment. Try again." });
    }
};

const verifyPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment details" });
        }

        const transaction = await Transaction.findOne({ razorpay_order_id }).session(session);
        
        if (!transaction) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Transaction record not found" });
        }

        if (transaction.status !== 'pending') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Payment already processed or invalid" });
        }

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            console.error(`FRAUD ALERT: Signature mismatch for Order ${razorpay_order_id}`);
            transaction.status = 'failed';
            await transaction.save({ session });
            await session.commitTransaction();
            return res.status(400).json({ success: false, message: "Payment verification failed: Signature Mismatch" });
        }

        const amountToCredit = transaction.amount; 

        const updatedUser = await User.findByIdAndUpdate(
            transaction.user,
            { $inc: { walletBalance: amountToCredit } },
            { new: true, session }
        );

        if (!updatedUser) {
            throw new Error("User not found during wallet update");
        }

        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.status = 'success';
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Wallet recharged successfully!",
            balance: updatedUser.walletBalance
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("CRITICAL: Payment Verification Error", error);
        res.status(500).json({ success: false, message: "An error occurred during verification" });
    }
};
module.exports = { addMoney, getBalance,createOrder,verifyPayment };