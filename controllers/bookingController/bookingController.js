const mongoose = require('mongoose');
const Booking = require('../../models/Booking/Booking');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');

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

        const partner = await Partner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }

        const ratePerMinute = partner.minRate || 25;
        const totalFee = ratePerMinute * duration;

        const userId = new mongoose.Types.ObjectId(rawUserId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if ((user.walletBalance || 0) < totalFee) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance to schedule this consultation',
                requiredBalance: totalFee,
                currentBalance: user.walletBalance || 0
            });
        }

        const newBooking = new Booking({
            user: userId,
            partner: partnerId,
            date: new Date(date),
            timeSlot,
            duration,
            mode,
            ratePerMinute,
            totalFee,
            status: 'pending'
        });

        await newBooking.save();

        res.status(201).json({
            success: true,
            message: 'Booking request sent to partner successfully',
            data: newBooking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const getPartnerBookingRequests = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        const bookings = await Booking.find({ partner: partnerId })
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

module.exports = {
    scheduleBooking,
    getPartnerBookingRequests,
    respondToBooking,
    getUserBookings,
    getPartnerAcceptedBookings,
    getPartnerRejectedBookings
};