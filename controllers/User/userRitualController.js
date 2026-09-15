const Ritual = require('../../models/Ritual/Ritual');
const RitualBooking = require('../../models/Ritual/RitualBooking');
const Pandit = require('../../models/Pandit/Pandit');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction/Transaction');
const mongoose = require('mongoose');
const sendPushNotification = require('../../utils/notificationService');
const createGoogleMeet = require('../../utils/googleMeetHelper');

const getRituals = async (req, res) => {
    try {
        const rituals = await Ritual.find({ isLive: true });
        return res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const searchRituals = async (req, res) => {
    try {
        const { search } = req.query;
        let query = { isLive: true };
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        const rituals = await Ritual.find(query);
        return res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getRitualById = async (req, res) => {
    try {
        const ritual = await Ritual.findById(req.params.id);
        if (!ritual) {
            return res.status(404).json({ success: false, message: 'Ritual not found' });
        }
        return res.status(200).json({ success: true, data: ritual });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAvailablePandits = async (req, res) => {
    try {
        const pandits = await Pandit.find({});
        return res.status(200).json({ success: true, data: pandits });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createRitualBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { ritualId, panditId, sankalp, personalDetails, schedule, shippingDetails, amount } = req.body;
        const userId = req.user.id;
        
        if (!panditId || !ritualId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Ritual ID and Pandit ID are required' });
        }

        const ritual = await Ritual.findById(ritualId).session(session);
        if (!ritual) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Ritual not found' });
        }

        const bookingAmount = amount || ritual.price || 0;

        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if ((user.walletBalance || 0) < bookingAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance! You need ₹${bookingAmount} to book this ritual.` 
            });
        }

        const pandit = await Pandit.findById(panditId).session(session);
        if (!pandit) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        user.walletBalance -= bookingAmount;
        await user.save({ session });

        pandit.walletBalance = (pandit.walletBalance || 0) + bookingAmount;
        await pandit.save({ session });

        const bookingId = 'RB' + Date.now() + Math.floor(1000 + Math.random() * 9000);

        const booking = await RitualBooking.create([{
            bookingId,
            userId,
            ritualId,
            panditId,
            sankalp,
            personalDetails,
            schedule,
            shippingDetails,
            paymentDetails: {
                amount: bookingAmount,
                paymentMode: 'Wallet',
                status: 'Success'
            },
            status: 'Pending'
        }], { session });

        await Transaction.create([{
            user: userId,
            razorpay_order_id: `ritual_debit_${bookingId}_${Date.now()}`,
            amount: bookingAmount,
            status: 'success',
            type: 'debit',
            description: `Payment for ritual booking: ${ritual.title || 'Pooja'}`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        if (pandit.fcmToken) {
            await sendPushNotification(
                pandit.fcmToken,
                { bookingId: booking[0]._id, type: 'RITUAL_BOOKING' },
                { title: 'New Pooja Booking Request! 🛕', body: `A new ritual booking request (${bookingId}) has arrived.` }
            );
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Ritual booked successfully using wallet balance', 
            data: booking[0],
            remainingWalletBalance: user.walletBalance
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getUserRitualBookings = async (req, res) => {
    try {
        const bookings = await RitualBooking.find({ userId: req.user.id })
            .populate('panditId', 'fullName profileImage mobile email')
            .populate('ritualId')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPanditRitualRequests = async (req, res) => {
    try {
        const requests = await RitualBooking.find({ panditId: req.user.id })
            .populate('userId', 'fullName mobile email')
            .populate('ritualId')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: requests });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPanditRitualRequestById = async (req, res) => {
    try {
        const request = await RitualBooking.findOne({ _id: req.params.id, panditId: req.user.id })
            .populate('userId', 'fullName mobile email')
            .populate('ritualId');

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const acceptRitualRequestByPandit = async (req, res) => {
    try {
        const booking = await RitualBooking.findOne({ _id: req.params.id, panditId: req.user.id, status: 'Pending' });

        if (!booking) {
            return res.status(400).json({ success: false, message: 'Booking request not found or already processed' });
        }

        const meetingLink = await createGoogleMeet(
            'Ritual Pooja Session',
            booking.schedule?.isoDateTime || booking.schedule?.date,
            30
        );

        booking.status = 'Accepted';
        booking.zoomLink = meetingLink;
        await booking.save();

        const user = await User.findById(booking.userId);
        if (user && user.fcmToken) {
            await sendPushNotification(
                user.fcmToken,
                { bookingId: booking._id, meetingLink: meetingLink, type: 'RITUAL_ACCEPTED' },
                { title: 'Pooja Booking Accepted! 🎉', body: `Pandit ji has accepted your ritual booking (${booking.bookingId}).` }
            );
        }

        return res.status(200).json({ success: true, message: 'Request accepted successfully', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const rejectRitualRequestByPandit = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const booking = await RitualBooking.findOne({ _id: req.params.id, panditId: req.user.id, status: 'Pending' }).session(session);

        if (!booking) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Booking request not found or already processed' });
        }

        booking.status = 'Rejected';
        await booking.save({ session });

        const refundAmount = booking.paymentDetails?.amount || 0;
        if (refundAmount > 0) {
            const user = await User.findById(booking.userId).session(session);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + refundAmount;
                await user.save({ session });

                const pandit = await Pandit.findById(booking.panditId).session(session);
                if (pandit) {
                    pandit.walletBalance = Math.max(0, (pandit.walletBalance || 0) - refundAmount);
                    await pandit.save({ session });
                }

                await Transaction.create([{
                    user: booking.userId,
                    razorpay_order_id: `ritual_refund_${booking._id}_${Date.now()}`,
                    amount: refundAmount,
                    status: 'success',
                    type: 'credit',
                    description: `Refund for rejected ritual booking: ${booking.bookingId}`
                }], { session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        const user = await User.findById(booking.userId);
        if (user && user.fcmToken) {
            await sendPushNotification(
                user.fcmToken,
                { bookingId: booking._id, type: 'RITUAL_REJECTED' },
                { title: 'Pooja Booking Update ❌', body: `Pandit ji declined your booking (${booking.bookingId}). Amount refunded to wallet.` }
            );
        }

        return res.status(200).json({ success: true, message: 'Request rejected and amount refunded successfully', data: booking });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createRitualOrder = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: 'Order created' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const verifyRitualPayment = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: 'Payment verified' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRituals,
    searchRituals,
    getRitualById,
    getAvailablePandits,
    createRitualBooking,
    getUserRitualBookings,
    getPanditRitualRequests,
    getPanditRitualRequestById,
    acceptRitualRequestByPandit,
    rejectRitualRequestByPandit,
    createRitualOrder,
    verifyRitualPayment
};