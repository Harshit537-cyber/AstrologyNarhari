const Ritual = require('../../models/Ritual/Ritual');
const RitualBooking = require('../../models/Ritual/RitualBooking');
const Pandit = require('../../models/Pandit/Pandit');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction/Transaction');
const Order = require('../../models/E-comm/Order');
const mongoose = require('mongoose');
const sendPushNotification = require('../../utils/notificationService');
const createGoogleMeet = require('../../utils/googleMeetHelper');
const { sendBookingConfirmedEvent } = require('../../services/bookingEventsService');
const razorpayInstance = require('../../config/razorpay');
const { isValidSignature, verifyCapturedPayment } = require('../../utils/razorpayPayment');

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
                totalAmount: bookingAmount,
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
        const booking = await RitualBooking.findOne({ 
            _id: req.params.id, 
            panditId: req.user.id, 
            status: 'Pending' 
        }).session(session);

        if (!booking) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Booking request not found or already processed' });
        }

        const userId = booking.userId;
        const bookingAmount = booking.paymentDetails?.totalAmount || 0;

        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isWalletPayment = booking.paymentDetails?.paymentMode !== 'Razorpay';
        if (isWalletPayment && (user.walletBalance || 0) < bookingAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: `Cannot accept! User's wallet balance is insufficient (Required: ₹${bookingAmount})` 
            });
        }

        const pandit = await Pandit.findById(req.user.id).session(session);
        if (!pandit) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        if (isWalletPayment) {
            user.walletBalance = Number(user.walletBalance) - Number(bookingAmount);
        }
        await user.save({ session });

        pandit.walletBalance = Number(pandit.walletBalance || 0) + Number(bookingAmount);
        await pandit.save({ session });

        booking.paymentDetails.status = 'Success';
        
        let meetingLink = '';
        try {
            meetingLink = await createGoogleMeet(
                'Ritual Pooja Session',
                booking.schedule?.isoDateTime || booking.schedule?.date,
                30
            );
        } catch (err) {
            meetingLink = '';
        }

        booking.status = 'Accepted';
        booking.zoomLink = meetingLink;
        await booking.save({ session });

        await Transaction.create([{
            user: userId,
            razorpay_order_id: `ritual_debit_${booking._id}_${Date.now()}`,
            amount: bookingAmount,
            status: 'success',
            type: 'debit',
            description: `Payment for accepted ritual booking: ${booking.bookingId}`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        try {
            const ritual = await Ritual.findById(booking.ritualId).select('title');
            await sendBookingConfirmedEvent({
                eventId: `ritual_${booking._id}_confirmed`,
                user,
                service: ritual?.title || 'Ritual booking',
                astrologer: pandit.fullName || 'Pandit ji',
                date: booking.schedule?.isoDateTime || booking.schedule?.date,
                time: booking.schedule?.isoDateTime ? undefined : booking.schedule?.time,
                amount: bookingAmount
            });
        } catch (error) {
            console.error('Pandit booking event integration failed:', error.message);
        }

        if (user && user.fcmToken) {
            await sendPushNotification(
                user.fcmToken,
                { bookingId: booking._id, meetingLink: meetingLink, type: 'RITUAL_ACCEPTED' },
                {
                    title: 'Pooja Booking Accepted! 🎉',
                    body: isWalletPayment
                        ? `Pandit ji has accepted your ritual booking (${booking.bookingId}). Amount of ₹${bookingAmount} deducted from wallet.`
                        : `Pandit ji has accepted your ritual booking (${booking.bookingId}).`
                }
            );
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Request accepted and payment deducted successfully', 
            data: booking,
            userRemainingBalance: user.walletBalance
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
        const { ritualId, panditId, sankalp, personalDetails, schedule, shippingDetails } = req.body;
        const userId = req.user.id;

        if (
            !mongoose.Types.ObjectId.isValid(ritualId) ||
            !mongoose.Types.ObjectId.isValid(panditId) ||
            !schedule?.date ||
            !schedule?.time ||
            Number.isNaN(new Date(schedule.date).getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid ritualId, panditId, schedule date, and schedule time are required.'
            });
        }

        const [ritual, pandit, user] = await Promise.all([
            Ritual.findOne({ _id: ritualId, isLive: true }),
            Pandit.findById(panditId),
            User.findById(userId)
        ]);
        if (!ritual) {
            return res.status(404).json({ success: false, message: 'Ritual not found or unavailable.' });
        }
        if (!pandit) {
            return res.status(404).json({ success: false, message: 'Pandit not found.' });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const amountInPaise = Math.round(Number(ritual.price) * 100);
        if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
            return res.status(400).json({ success: false, message: 'Ritual price is invalid.' });
        }

        const order = await razorpayInstance.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `ritual_${Date.now()}`,
            notes: { userId: userId.toString(), ritualId: ritual._id.toString() }
        });

        await Transaction.create({
            user: userId,
            razorpay_order_id: order.id,
            amount: amountInPaise / 100,
            status: 'pending',
            type: 'ritual_payment',
            description: `Ritual payment for ${ritual.title}`,
            metadata: {
                ritualId: ritual._id,
                panditId: pandit._id,
                sankalp,
                personalDetails,
                schedule,
                shippingDetails
            }
        });

        return res.status(200).json({ success: true, order });
    } catch (error) {
        console.error('Ritual Razorpay order creation failed:', error);
        return res.status(500).json({ success: false, message: 'Could not initiate ritual payment.' });
    }
};

const verifyRitualPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    session.lowTransaction();

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (
            typeof razorpay_order_id !== 'string' ||
            typeof razorpay_payment_id !== 'string' ||
            typeof razorpay_signature !== 'string' ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Missing payment details.' });
        }

        const transaction = await Transaction.findOne({
            razorpay_order_id,
            user: req.user.id,
            type: 'ritual_payment'
        }).session(session);
        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Ritual payment order not found.' });
        }

        if (transaction.status === 'success' && transaction.metadata?.bookingId) {
            if (transaction.razorpay_payment_id !== razorpay_payment_id) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: 'Payment does not match this ritual order.' });
            }
            const existingBooking = await RitualBooking.findById(transaction.metadata.bookingId).session(session);
            await session.abortTransaction();
            session.endSession();
            if (existingBooking) {
                return res.status(200).json({ success: true, message: 'Payment already verified.', data: existingBooking });
            }
            return res.status(409).json({ success: false, message: 'Verified ritual booking could not be found.' });
        }

        if (transaction.status !== 'pending') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Ritual payment order is not pending.' });
        }
        if (!isValidSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
        }

        const isCaptured = await verifyCapturedPayment({
            paymentId: razorpay_payment_id,
            expectedAmountPaise: Math.round(transaction.amount * 100),
            expectedOrderId: razorpay_order_id
        });
        if (!isCaptured) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Ritual payment has not been captured.' });
        }

        const [reusedPayment, reusedOrderPayment] = await Promise.all([
            Transaction.findOne({
                razorpay_payment_id,
                _id: { $ne: transaction._id }
            }).session(session),
            Order.findOne({ "paymentDetails.transactionId": razorpay_payment_id }).session(session)
        ]);
        if (reusedPayment || reusedOrderPayment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Payment has already been processed.' });
        }

        const metadata = transaction.metadata || {};
        if (
            !mongoose.Types.ObjectId.isValid(metadata.ritualId) ||
            !mongoose.Types.ObjectId.isValid(metadata.panditId)
        ) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ success: false, message: 'Ritual order details are invalid.' });
        }

        const bookingId = `RB${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
        const [booking] = await RitualBooking.create([{
            bookingId,
            userId: req.user.id,
            ritualId: metadata.ritualId,
            panditId: metadata.panditId,
            sankalp: metadata.sankalp,
            personalDetails: metadata.personalDetails,
            schedule: metadata.schedule,
            shippingDetails: metadata.shippingDetails,
            paymentDetails: {
                ritualPrice: transaction.amount,
                totalAmount: transaction.amount,
                paymentMode: 'Razorpay',
                status: 'Success',
                transactionId: razorpay_payment_id
            },
            status: 'Pending'
        }], { session });

        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.status = 'success';
        transaction.metadata = { ...metadata, bookingId: booking._id };
        await transaction.save({ session });
        await session.commitTransaction();
        session.endSession();

        try {
            const pandit = await Pandit.findById(booking.panditId).select('fcmToken');
            if (pandit?.fcmToken) {
                await sendPushNotification(
                    pandit.fcmToken,
                    { bookingId: booking._id, type: 'RITUAL_BOOKING' },
                    { title: 'New Pooja Booking Request!', body: `A new ritual booking request (${bookingId}) has arrived.` }
                );
            }
        } catch (notificationError) {
            console.error('Ritual booking notification failed:', notificationError.message);
        }

        return res.status(200).json({ success: true, message: 'Payment verified and ritual booking created.', data: booking });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Ritual Razorpay payment verification failed:', error);
        return res.status(500).json({ success: false, message: 'Could not verify ritual payment.' });
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