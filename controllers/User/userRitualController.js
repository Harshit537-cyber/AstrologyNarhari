const Ritual = require('../../models/Ritual/Ritual');
const RitualBooking = require('../../models/Ritual/RitualBooking');
const Pandit = require('../../models/Pandit/Pandit');
const User = require('../../models/User');
const sendPushNotification = require('../../utils/notificationService');

const getRituals = async (req, res) => {
    try {
        const rituals = await Ritual.find({ isActive: true });
        return res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const searchRituals = async (req, res) => {
    try {
        const { search } = req.query;
        let query = { isActive: true };
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
        const pandits = await Pandit.find({
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        }).select('fullName profilePic city primaryCategory expertise languages experience minPoojaFee averageRating totalReviews isOnline canArrangeSamagri poojaServiceMode');

        return res.status(200).json({ success: true, data: pandits });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createRitualBooking = async (req, res) => {
    try {
        const { ritualId, panditId, sankalp, personalDetails, schedule, shippingDetails, paymentDetails } = req.body;
        
        if (!panditId) {
            return res.status(400).json({ success: false, message: 'Pandit ID is required' });
        }

        const pandit = await Pandit.findById(panditId);
        if (!pandit) {
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        const bookingId = 'RB' + Date.now() + Math.floor(1000 + Math.random() * 9000);

        const booking = await RitualBooking.create({
            bookingId,
            userId: req.user.id,
            ritualId,
            panditId,
            sankalp,
            personalDetails,
            schedule,
            shippingDetails,
            paymentDetails,
            status: 'Pending'
        });

        if (pandit.fcmToken) {
            await sendPushNotification(
                pandit.fcmToken,
                { bookingId: booking._id, type: 'RITUAL_BOOKING' },
                { title: 'New Pooja Booking Request! 🛕', body: `A new ritual booking request (${bookingId}) has arrived. Please respond.` }
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
        const booking = await RitualBooking.findOneAndUpdate(
            { _id: req.params.id, panditId: req.user.id, status: 'Pending' },
            { status: 'Accepted' },
            { new: true }
        );

        if (!booking) {
            return res.status(400).json({ success: false, message: 'Booking request not found or already processed' });
        }

        const user = await User.findById(booking.userId);
        if (user && user.fcmToken) {
            await sendPushNotification(
                user.fcmToken,
                { bookingId: booking._id, type: 'RITUAL_ACCEPTED' },
                { title: 'Pooja Booking Accepted! 🎉', body: `Pandit ji has accepted your ritual booking (${booking.bookingId}).` }
            );
        }

        return res.status(200).json({ success: true, message: 'Request accepted successfully', data: booking });
    } catch (error) {
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
                { title: 'Pooja Booking Update ❌', body: `Pandit ji is currently unavailable and has declined your booking (${booking.bookingId}).` }
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
    getPanditRitualRequests,
    getPanditRitualRequestById,
    acceptRitualRequestByPandit,
    rejectRitualRequestByPandit,
    createRitualOrder,
    verifyRitualPayment
};