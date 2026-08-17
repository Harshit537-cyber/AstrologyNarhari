const mongoose = require('mongoose');
const Booking = require('../../models/Booking/Booking');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const AdminEarning = require('../../models/Agora/AdminEarning');
const { generateAgoraTokens } = require('../../services/agoraService');
const moment = require('moment-timezone');


exports.initiateVideoCall = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user.id;

        const booking = await Booking.findById(bookingId).populate('partner user');
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.user._id.toString() !== userId && booking.partner._id.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        if (booking.status !== 'accepted') {
            return res.status(400).json({ success: false, message: `Invalid booking status: ${booking.status}` });
        }

        const now = moment().tz("Asia/Kolkata");
        const bookingStart = moment(booking.startTime).tz("Asia/Kolkata");
        const bookingEnd = moment(booking.endTime).tz("Asia/Kolkata");

        // if (now.isBefore(bookingStart.clone().subtract(5, 'minutes'))) {
        //     return res.status(400).json({
        //         success: false,
        //         message: `Call session starts at ${bookingStart.format('hh:mm A')} IST. You can join 5 mins early.`
        //     });
        // }

        // if (now.isAfter(bookingEnd)) {
        //     return res.status(400).json({ success: false, message: "This booking session has expired" });
        // }

        const channelName = bookingId.toString();
        const roleUid = req.user.role === 'user' ? 1 : 2;
        const tokens = generateAgoraTokens(channelName, roleUid);

        res.status(200).json({
            success: true,
            ...tokens,
            channelName,
            uid: roleUid,
            appId: process.env.AGORA_APP_ID
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.terminateVideoCall = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { bookingId, actualDuration } = req.body;
        const userId = req.user.id;

        const booking = await Booking.findById(bookingId).populate('user').session(session);

        if (!booking || ['completed', 'cancelled', 'refunded'].includes(booking.status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Booking already finalized or not found" });
        }

        if (booking.user._id.toString() !== userId && booking.partner.toString() !== userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ success: false, message: "Unauthorized request" });
        }

        const finalDuration = actualDuration || 0;
        const totalActualFee = finalDuration * booking.ratePerMinute;
        const adminAmt = parseFloat(((totalActualFee * booking.commissionPercentage) / 100).toFixed(2));
        const finalEarnings = parseFloat((totalActualFee - adminAmt).toFixed(2));

        booking.status = 'completed';
        booking.paymentStatus = 'completed';
        booking.actualDuration = finalDuration;
        booking.totalFee = totalActualFee;
        booking.adminCommission = adminAmt;
        booking.partnerEarning = finalEarnings;
        booking.endTime = new Date();
        await booking.save({ session });

        const partner = await Partner.findById(booking.partner).session(session);
        if (!partner) throw new Error("Partner not found");

        const earnings = finalEarnings;
        partner.walletBalance = parseFloat((partner.walletBalance + earnings).toFixed(2));

        partner.ritualEarningsHistory.push({
            userId: booking.user._id,
            userName: booking.user.fullName || "User",
            bookingId: booking._id,
            amount: earnings,
            ritualName: `Video Call (Terminated)`,
            paymentDate: new Date()
        });
        await partner.save({ session });

        await AdminEarning.create([{
            bookingId: booking._id,
            partnerId: booking.partner,
            userId: booking.user._id,
            totalAmountPaid: totalActualFee,
            commissionPercentage: booking.commissionPercentage,
            adminAmount: adminAmt,
            partnerAmount: finalEarnings,
            mode: 'Video Call'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Call terminated and payment settled successfully",
            data: {
                partnerEarning: earnings,
                adminCommission: booking.adminCommission
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.completeAndSettleCall = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { bookingId, actualDuration } = req.body;
        const userId = req.user.id;

        const booking = await Booking.findById(bookingId).populate('user').session(session);

        if (!booking || booking.status === 'completed') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Booking already finalized or not found" });
        }

        if (booking.user._id.toString() !== userId && booking.partner.toString() !== userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ success: false, message: "Unauthorized: You are not part of this booking" });
        }

        const finalDuration = actualDuration || booking.duration;
        const totalActualFee = finalDuration * booking.ratePerMinute;


        const adminAmt = parseFloat(((totalActualFee * booking.commissionPercentage) / 100).toFixed(2));

        const earnings = parseFloat((totalActualFee - adminAmt).toFixed(2));

        booking.status = 'completed';
        booking.paymentStatus = 'completed';
        booking.actualDuration = finalDuration;
        booking.totalFee = totalActualFee;
        booking.adminCommission = adminAmt;
        booking.partnerEarning = earnings;
        booking.endTime = new Date();

        await booking.save({ session });


        const partner = await Partner.findById(booking.partner).session(session);
        if (!partner) throw new Error("Partner not found");

        partner.walletBalance = parseFloat((partner.walletBalance + earnings).toFixed(2));

        partner.ritualEarningsHistory.push({
            userId: booking.user._id,
            userName: booking.user.fullName || "User",
            bookingId: booking._id,
            amount: earnings,
            ritualName: `Video Call Session (${booking.actualDuration} mins)`,
            paymentDate: new Date()
        });
        await partner.save({ session });

        await AdminEarning.create([{
            bookingId: booking._id,
            partnerId: booking.partner,
            userId: booking.user._id,
            totalAmountPaid: booking.totalFee,
            commissionPercentage: booking.commissionPercentage,
            adminAmount: booking.adminCommission,
            partnerAmount: earnings,
            mode: 'Video Call'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Call settled successfully",
            data: { partnerEarned: earnings }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: "Settlement failed", error: error.message });
    }
};


exports.cancelVideoAndRefund = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { bookingId, reason } = req.body;
        const requesterId = req.user.id;

        const booking = await Booking.findById(bookingId).session(session);

        if (!booking || ['completed', 'cancelled', 'refunded'].includes(booking.status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Refund not possible" });
        }

        if (booking.user.toString() !== requesterId && booking.partner.toString() !== requesterId && req.user.role !== 'admin') {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ success: false, message: "Unauthorized to cancel this booking" });
        }

        const user = await User.findById(booking.user).session(session);
        if (!user) throw new Error("User not found");

        user.walletBalance = parseFloat((user.walletBalance + booking.totalFee).toFixed(2));

        user.walletHistory.push({
            amount: booking.totalFee,
            type: 'credit',
            reason: `Refund for booking: ${bookingId}`,
            date: new Date()
        });
        await user.save({ session });

        booking.status = 'cancelled';
        booking.paymentStatus = 'refunded';
        booking.cancellationReason = reason || "Refunded by system";
        await booking.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: "Booking refunded successfully" });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.joinCallSession = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const partnerId = req.user.id;

        const booking = await Booking.findById(bookingId);
        if (!booking || booking.status !== 'accepted') {
            return res.status(400).json({ success: false, message: "Invalid booking or not accepted" });
        }

        if (booking.partner.toString() !== partnerId) {
            return res.status(403).json({ success: false, message: "Unauthorized: This booking is not assigned to you" });
        }

        const now = moment().tz("Asia/Kolkata");
        const bookingEnd = moment(booking.endTime).tz("Asia/Kolkata");


        if (now.isAfter(bookingEnd)) {
            return res.status(400).json({ success: false, message: "This session has already expired" });
        }

        await Partner.findByIdAndUpdate(partnerId, { isBusy: true });

        const channelName = bookingId.toString();
        const tokens = generateAgoraTokens(channelName, 2);

        res.status(200).json({
            success: true,
            message: "Call joined successfully",
            ...tokens,
            channelName,
            uid: 2,
            appId: process.env.AGORA_APP_ID
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};