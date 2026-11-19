const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking/Booking');
const CrmWebhookEvent = require('../models/CrmWebhookEvent');
const { verifyWebhookSignature } = require('../utils/crmWebhookSecurity');

const normalizePhone = (value) => {
    if (typeof value !== 'string' || !/^\+?[0-9()\s.-]+$/.test(value.trim())) {
        return null;
    }

    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

const findUserByPhone = async (phone) => User.findOne({
    role: 'user',
    mobile: { $in: [phone, `+${phone}`] }
}).select('name fullName mobile walletBalance isActive createdAt');

const formatBooking = (booking) => ({
    id: String(booking._id),
    status: booking.status,
    payment_status: booking.paymentStatus,
    date: booking.startTime || booking.date,
    time: booking.timeSlot,
    astrologer: booking.partner?.fullName || booking.partner?.name || null,
    astrologer_id: booking.partner?._id ? String(booking.partner._id) : null,
    service: booking.mode,
    amount: booking.totalFee
});

const lookupUserByPhone = async (req, res) => {
    try {
        const phone = normalizePhone(req.params.phone);
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone must include a country code and contain 8 to 15 digits'
            });
        }

        const user = await findUserByPhone(phone);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const lastBooking = await Booking.findOne({ user: user._id })
            .populate('partner', 'fullName name')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: String(user._id),
                    name: user.fullName || user.name || null,
                    phone: user.mobile,
                    plan: null,
                    wallet: user.walletBalance || 0,
                    is_active: user.isActive
                },
                last_booking: lastBooking ? formatBooking(lastBooking) : null
            }
        });
    } catch (error) {
        console.error('CRM user lookup failed:', error);
        return res.status(500).json({ success: false, message: 'Could not look up user' });
    }
};

const getBookingById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID' });
        }

        const booking = await Booking.findById(req.params.id)
            .populate('partner', 'fullName name')
            .populate('user', 'name fullName mobile');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                booking: formatBooking(booking),
                user: booking.user ? {
                    id: String(booking.user._id),
                    name: booking.user.fullName || booking.user.name || null,
                    phone: booking.user.mobile
                } : null
            }
        });
    } catch (error) {
        console.error('CRM booking lookup failed:', error);
        return res.status(500).json({ success: false, message: 'Could not look up booking' });
    }
};

const getBookingsByPhone = async (req, res) => {
    try {
        const phone = normalizePhone(req.query.phone);
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'A valid phone number with country code is required'
            });
        }

        const user = await findUserByPhone(phone);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const bookings = await Booking.find({ user: user._id })
            .populate('partner', 'fullName name')
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            success: true,
            data: {
                bookings: bookings.map(formatBooking)
            }
        });
    } catch (error) {
        console.error('CRM bookings lookup failed:', error);
        return res.status(500).json({ success: false, message: 'Could not look up bookings' });
    }
};

const receiveWebhook = async (req, res) => {
    const secret = process.env.BACKEND_WEBHOOK_SECRET;
    const timestamp = req.get('X-Namohastro-Timestamp');
    const signature = req.get('X-Namohastro-Signature');
    const eventId = req.get('X-Namohastro-Event-Id');
    const event = req.get('X-Namohastro-Event');
    const rawBody = req.rawBody;

    if (!secret) {
        return res.status(503).json({
            success: false,
            message: 'Webhook authentication is not configured'
        });
    }

    if (!verifyWebhookSignature({ timestamp, signature, rawBody, secret })) {
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    if (
        typeof eventId !== 'string' ||
        eventId.length > 128 ||
        typeof event !== 'string' ||
        !/^[a-z0-9._]+$/.test(event) ||
        !req.body ||
        req.body.id !== eventId ||
        req.body.event !== event ||
        !req.body.data ||
        typeof req.body.data !== 'object' ||
        Array.isArray(req.body.data)
    ) {
        return res.status(400).json({ success: false, message: 'Invalid webhook event payload' });
    }

    try {
        await CrmWebhookEvent.create({ eventId, event });
        return res.status(202).json({ success: true, duplicate: false });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({ success: true, duplicate: true });
        }

        console.error('CRM webhook persistence failed:', error);
        return res.status(500).json({ success: false, message: 'Could not accept webhook event' });
    }
};

module.exports = {
    lookupUserByPhone,
    getBookingById,
    getBookingsByPhone,
    receiveWebhook
};
