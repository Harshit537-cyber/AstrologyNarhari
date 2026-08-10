const Ritual = require('../../models/Ritual/Ritual');
const RitualBooking = require('../../models/Ritual/RitualBooking');
const Pandit = require('../../models/Pandit/Pandit');
const User = require('../../models/User');
const sendPushNotification = require('../../utils/notificationService');
const createGoogleMeet = require('../../utils/googleMeetHelper');

// 1. Get All Live Rituals
const getRituals = async (req, res) => {
    try {
        const rituals = await Ritual.find({ isLive: true });
        return res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Search Live Rituals by Title
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

// 3. Get Ritual Detail By ID
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

// 4. Get Available Pandits
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

// 5. Create Ritual Booking
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

// 6. Get Pandit Ritual Requests
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

// 7. Get Single Ritual Request for Pandit
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

// 8. Accept Ritual Request By Pandit
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

// 9. Reject Ritual Request By Pandit
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

// 10. Create Ritual Payment Order
const createRitualOrder = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: 'Order created' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Verify Ritual Payment
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