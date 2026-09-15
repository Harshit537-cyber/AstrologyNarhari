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
    try {
        const { ritualId, panditId, sankalp, personalDetails, schedule, shippingDetails, amount } = req.body;
        const userId = req.user.id;
        
        if (!panditId || !ritualId) {
            return res.status(400).json({ success: false, message: 'Ritual ID and Pandit ID are required' });
        }

        const ritual = await Ritual.findById(ritualId);
        if (!ritual) {
            return res.status(404).json({ success: false, message: 'Ritual not found' });
        }

        const bookingAmount = amount || ritual.price || 0;

     
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if ((user.walletBalance || 0) < bookingAmount) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance! You need at least ₹${bookingAmount} to book this ritual.` 
            });
        }

        const pandit = await Pandit.findById(panditId);
        if (!pandit) {
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        const bookingId = 'RB' + Date.now() + Math.floor(1000 + Math.random() * 9000);

        const booking = await RitualBooking.create({
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
                status: 'Pending'
            },
            status: 'Pending'
        });

        if (pandit.fcmToken) {
            await sendPushNotification(
                pandit.fcmToken,
                { bookingId: booking._id, type: 'RITUAL_BOOKING' },
                { title: 'New Pooja Booking Request! 🛕', body: `A new ritual booking request (${bookingId}) has arrived.` }
            );
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Ritual booking request sent successfully to Pandit ji', 
            data: booking 
        });

    } catch (error) {
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const booking = await RitualBooking.findOne({ _id: req.params.id, panditId: req.user.id, status: 'Pending' }).session(session);

        if (!booking) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Booking request not found or already processed' });
        }

        const userId = booking.userId;
        const bookingAmount = booking.paymentDetails?.amount || 0;

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
                message: `Cannot accept! User's wallet balance is now insufficient (Required: ₹${bookingAmount})` 
            });
        }

        const pandit = await Pandit.findById(req.user.id).session(session);
        if (!pandit) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        // Deduct from user and add to pandit
        user.walletBalance -= bookingAmount;
        await user.save({ session });

        pandit.walletBalance = (pandit.walletBalance || 0) + bookingAmount;
        await pandit.save({ session });

        booking.paymentDetails.status = 'Success';
        await booking.save({ session });

        await Transaction.create([{
            user: userId,
            razorpay_order_id: `ritual_debit_${booking._id}_${Date.now()}`,
            amount: bookingAmount,
            status: 'success',
            type: 'debit',
            description: `Payment for accepted ritual booking: ${booking.bookingId}`
        }], { session });

        const meetingLink = await createGoogleMeet(
            'Ritual Pooja Session',
            booking.schedule?.isoDateTime || booking.schedule?.date,
            30
        );

        booking.status = 'Accepted';
        booking.zoomLink = meetingLink;
        await booking.save({ session });

        await session.commitTransaction();
        session.endSession();

        if (user && user.fcmToken) {
            await sendPushNotification(
                user.fcmToken,
                { bookingId: booking._id, meetingLink: meetingLink, type: 'RITUAL_ACCEPTED' },
                { title: 'Pooja Booking Accepted! 🎉', body: `Pandit ji has accepted your ritual booking (${booking.bookingId}). Amount of ₹${bookingAmount} deducted from wallet.` }
            );
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Request accepted and payment deducted successfully', 
            data: booking 
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

const rejectRitualRequestByPandit = async (req, res) => {
    try {
        const booking = await RitualBooking.findOneAndUpdate(
            { _id: req.params.id, panditId: req.user.id, status: 'Pending' },
            { status: 'Rejected' },
            { new: true }
        );

        if (!booking) {
            return res.status(400).json({ success: false, message: 'Booking request not found or already processed' });
        }

        const user = await User.findById(booking.userId);
        if (user && user.fcmToken) {
            await sendPushNotification(
                user.fcmToken,
                { bookingId: booking._id, type: 'RITUAL_REJECTED' },
                { title: 'Pooja Booking Update ❌', body: `Pandit ji has declined your booking (${booking.bookingId}).` }
            );
        }

        return res.status(200).json({ success: true, message: 'Request rejected successfully', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createRitualOrder = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: 'Order created' });
    } catch (error) {
        return res.status(500).json({ success: error.message });
    }
};

const verifyRitualPayment = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: 'Payment verified' });
    } catch (error) {
        return res.status(500).json({ success: error.message });
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