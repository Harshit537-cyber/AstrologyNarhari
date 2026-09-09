const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const razorpayInstance = require('../../config/razorpay');
const Transaction = require('../../models/Transaction/Transaction');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Schema for tracking Chat Session Billing
const chatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    ratePerMinute: { type: Number, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    totalMinutes: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
}, { timestamps: true });

const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);

// 1. ADD MONEY
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

// 2. GET BALANCE
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

// 3. CREATE RAZORPAY ORDER
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

// 4. VERIFY RAZORPAY PAYMENT
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

// 5. START CHAT (Timer shuru hoga, balance check hoga)
const startChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { partnerId } = req.body;

        if (!partnerId) {
            return res.status(400).json({ success: false, message: "partnerId is required" });
        }

        const [user, partner] = await Promise.all([
            User.findById(userId),
            Partner.findById(partnerId)
        ]);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

        // Check if partner is already busy
        if (partner.isBusy) {
            return res.status(400).json({ success: false, message: "Astrologer is busy with someone else" });
        }

        // Partner ka minimum rate per minute
        const minRate = partner.minRate || 25;

        // User ke paas kam se kam 1 minute ke paise hone chahiye
        if ((user.walletBalance || 0) < minRate) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance! You need at least ₹${minRate} to start chat.`
            });
        }

        // Active chat session create karo
        const session = await ChatSession.create({
            userId,
            partnerId,
            ratePerMinute: minRate,
            startTime: new Date(),
            status: 'active'
        });

        // Partner ko busy mark kar do
        partner.isBusy = true;
        await partner.save();

        const maxMinutesAllowed = Math.floor(user.walletBalance / minRate);

        return res.status(200).json({
            success: true,
            message: "Chat session started",
            data: {
                sessionId: session._id,
                partnerName: partner.fullName,
                ratePerMinute: minRate,
                startTime: session.startTime,
                walletBalance: user.walletBalance,
                maxMinutesAllowed
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 6. END CHAT (Time count hoga, user se cut hoga aur partner me add hoga)
const endChat = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { sessionId } = req.body;
        const userId = req.user.id;

        if (!sessionId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "sessionId is required" });
        }

        const chat = await ChatSession.findById(sessionId).session(session);
        if (!chat) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Chat session not found" });
        }

        if (chat.status !== 'active') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "This chat session has already ended" });
        }

        // Time calculate karo (Minutes me)
        const endTime = new Date();
        const diffSeconds = Math.max(1, Math.round((endTime.getTime() - new Date(chat.startTime).getTime()) / 1000));
        
        // 60 sec se upar jate hi agla minute count hoga
        const billedMinutes = Math.max(1, Math.ceil(diffSeconds / 60));
        let totalDeduct = billedMinutes * chat.ratePerMinute;

        const user = await User.findById(userId).session(session);
        const partner = await Partner.findById(chat.partnerId).session(session);

        // Balance cap
        if (user.walletBalance < totalDeduct) {
            totalDeduct = user.walletBalance > 0 ? user.walletBalance : 0;
        }

        // 1. User se paise cut karo
        user.walletBalance -= totalDeduct;

        // 2. Partner ke wallet me credit karo
        partner.walletBalance = (partner.walletBalance || 0) + totalDeduct;
        partner.isBusy = false; // Astrologer free ho gaya

        await user.save({ session });
        await partner.save({ session });

        // 3. Chat Session close karo
        chat.endTime = endTime;
        chat.totalMinutes = billedMinutes;
        chat.totalAmount = totalDeduct;
        chat.status = 'completed';
        await chat.save({ session });

        // 4. User debit history create karo
        await Transaction.create([{
            user: userId,
            amount: totalDeduct,
            status: 'success',
            type: 'debit',
            description: `Chat session fee for ${billedMinutes} minute(s)`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Chat ended successfully and amount deducted",
            data: {
                totalSeconds: diffSeconds,
                billedMinutes: billedMinutes,
                ratePerMinute: chat.ratePerMinute,
                totalDeducted: totalDeduct,
                userRemainingBalance: user.walletBalance,
                partnerUpdatedBalance: partner.walletBalance
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    addMoney, 
    getBalance, 
    createOrder, 
    verifyPayment,
    startChat,
    endChat
};