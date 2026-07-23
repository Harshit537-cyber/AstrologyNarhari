const mongoose = require('mongoose');
const Booking = require('../../models/Booking/Booking');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const moment = require('moment');


const scheduleBooking = async (req, res) => {
    try {
        const { partnerId, date, timeSlot, duration, mode } = req.body;
        const rawUserId = req.user?.id || req.user?._id;

        if (!partnerId || !date || !timeSlot || !duration || !mode) {
            return res.status(400).json({
                success: false,
                message: 'All scheduling fields are required'
            });
        }

const formattedDate = moment(date).format('YYYY-MM-DD');
        const start = moment(`${formattedDate} ${timeSlot}`, 'YYYY-MM-DD hh:mm A');
        const end = moment(start).add(duration, 'minutes');
if (!start.isValid()) {
            return res.status(400).json({ success: false, message: 'Invalid Time Slot format' });
        }



  const overlapping = await Booking.findOne({
            partner: partnerId,
            status: 'accepted',
            $or: [
                { startTime: { $lt: end.toDate(), $gte: start.toDate() } },
                { endTime: { $gt: start.toDate(), $lte: end.toDate() } },
                { startTime: { $lte: start.toDate() }, endTime: { $gte: end.toDate() } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({ success: false, message: 'Astrologer is already booked for this time slot.' });
        }


        const partner = await Partner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }

        const totalFee = (partner.minRate || 25) * duration;
        const user = await User.findById(rawUserId);

        // --- WALLET HOLD LOGIC ---
        if (user.walletBalance < totalFee) {
            return res.status(400).json({ success: false, message: 'Insufficient balance. Please recharge.' });
        }

        // Paise turant kato (Hold karo status pending ke liye)
        user.walletBalance -= totalFee;
        await user.save();

        const newBooking = new Booking({
            user: rawUserId,
            partner: partnerId,
            date: start.toDate(),
            startTime: start.toDate(),
            endTime: end.toDate(),
            timeSlot,
            duration,
            mode,
            ratePerMinute: partner.minRate || 25,
            totalFee,
            status: 'pending'
        });

        await newBooking.save();

        res.status(201).json({
            success: true,
            message: 'Booking request sent. Fee held in wallet.',
            data: newBooking
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

const getPartnerBookingRequests = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        const bookings = await Booking.find({ partner: partnerId, status: 'pending' })
            .populate('user', 'name email mobile walletBalance')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const respondToBooking = async (req, res) => {
    try {
        const { bookingId, action } = req.body;
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        if (!['accepted', 'rejected'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be accepted or rejected'
            });
        }

        const booking = await Booking.findOne({ _id: bookingId, partner: partnerId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking request not found'
            });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Booking has already been ${booking.status}`
            });
        }

        if (action === 'accepted') {
            const user = await User.findById(booking.user);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if ((user.walletBalance || 0) < booking.totalFee) {
                booking.status = 'rejected';
                await booking.save();
                return res.status(400).json({
                    success: false,
                    message: 'User has insufficient balance. Booking rejected automatically.'
                });
            }

            user.walletBalance -= booking.totalFee;
            await user.save();

            booking.status = 'accepted';
            booking.paymentStatus = 'completed';
        } else {
            booking.status = 'rejected';
        }

        await booking.save();

        res.status(200).json({
            success: true,
            message: `Booking has been ${action} successfully`,
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const getUserBookings = async (req, res) => {
    try {
        const rawUserId = req.user?.id || req.user?._id;
        const userId = new mongoose.Types.ObjectId(rawUserId);

        const bookings = await Booking.find({ user: userId })
            .populate('partner', 'fullName profilePic specialties expectedSalary minRate')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const getPartnerAcceptedBookings = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        const bookings = await Booking.find({ partner: partnerId, status: 'accepted' })
            .populate('user', 'name email mobile walletBalance')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const getPartnerRejectedBookings = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        const bookings = await Booking.find({ partner: partnerId, status: 'rejected' })
            .populate('user', 'name email mobile walletBalance')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const rawUserId = req.user?.id || req.user?._id;
        const userId = new mongoose.Types.ObjectId(rawUserId);

        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (['cancelled', 'rejected'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: `Booking is already ${booking.status}`
            });
        }

        if (booking.status === 'accepted' && booking.paymentStatus === 'completed') {
            const user = await User.findById(userId);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + booking.totalFee;
                await user.save();
            }
            booking.paymentStatus = 'refunded';
        }

        booking.status = 'cancelled';
        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const rescheduleBooking = async (req, res) => {
    try {
        const { bookingId, date, timeSlot } = req.body;
        const rawUserId = req.user?.id || req.user?._id;
        const userId = new mongoose.Types.ObjectId(rawUserId);

        if (!bookingId || !date || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID, date, and timeSlot are required'
            });
        }

        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (['cancelled', 'rejected'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot reschedule a ${booking.status} booking`
            });
        }

        booking.date = new Date(date);
        booking.timeSlot = timeSlot;
        booking.status = 'pending';

        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Booking rescheduled successfully. Request sent to partner again.',
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

module.exports = {
    scheduleBooking,
    getPartnerBookingRequests,
    respondToBooking,
    getUserBookings,
    getPartnerAcceptedBookings,
    getPartnerRejectedBookings,
    cancelBooking,
    rescheduleBooking
};