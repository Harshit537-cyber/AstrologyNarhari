const mongoose = require('mongoose');
const Booking = require('../../models/Booking/Booking');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const moment = require('moment');
const { validateBookingTime } = require('../../utils/dateValidator');
const sendPushNotification = require("../../utils/notificationService")

const scheduleBooking = async (req, res) => {
    try {
        const { partnerId, date, timeSlot, duration, mode } = req.body;
        const rawUserId = req.user?.id || req.user?._id;

        if (!rawUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User ID not found.'
            });
        }

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

        const user = await User.findById(rawUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        const totalFee = partner.minRate * duration;
        const currentBalance = user.walletBalance || 0;

        if (currentBalance < totalFee) {
            return res.status(400).json({ success: false, message: 'Insufficient balance. Please recharge.' });
        }

        user.walletBalance = currentBalance - totalFee;
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
            ratePerMinute: partner.minRate,
            totalFee,
            status: 'pending'
        });

        await newBooking.save();

        if (partner.fcmToken) {
            const notificationPayload = {
                title: 'New Booking Request! ',
                body: `You have a new ${mode} booking request from ${user.name || 'a user'} for ${timeSlot}.`
            };

            const dataPayload = {
                bookingId: newBooking._id.toString(),
                type: 'NEW_BOOKING',
                startTime: start.toISOString(),
                mode: mode
            };

            sendPushNotification(partner.fcmToken, dataPayload, notificationPayload)
                .then(res => console.log("Notification sent to partner"))
                .catch(err => console.error("Notification Error:", err));
        }

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

        const booking = await Booking.findOne({ _id: bookingId, partner: partnerId }).populate('user');
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
        const user = booking.user;

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in this booking' });
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


        if (user && user.fcmToken) {
            const notificationPayload = {
                title: action === 'accepted' ? 'Booking Confirmed! ✅' : 'Booking Rejected ❌',
                body: action === 'accepted'
                    ? `Astrologer has accepted your booking for ${booking.timeSlot}.`
                    : `Sorry, your booking for ${booking.timeSlot} was rejected. Amount refunded.`
            };

            const dataPayload = {
                bookingId: String(booking._id),
                type: 'BOOKING_RESPONSE',
                status: String(action)
            };

            sendPushNotification(user.fcmToken, dataPayload, notificationPayload)
                .then(() => console.log("Notification sent to User"))
                .catch(err => console.error("Notification Error:", err));
        }



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

        const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('partner');
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
        if (booking.partner && booking.partner.fcmToken) {
            const notificationPayload = {
                title: 'Booking Cancelled 🚫',
                body: `A user has cancelled the booking scheduled for ${booking.timeSlot}.`
            };

            const dataPayload = {
                bookingId: String(booking._id),
                type: 'BOOKING_CANCELLED'
            };

            sendPushNotification(booking.partner.fcmToken, dataPayload, notificationPayload)
                .then(() => console.log("Notification sent to Partner"))
                .catch(err => console.error("Notification Error:", err));
        }
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

        const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('partner');
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
        if (booking.partner && booking.partner.fcmToken) {
            const notificationPayload = {
                title: 'Booking Rescheduled 📅',
                body: `User has rescheduled their booking to ${timeSlot}. Please review the request.`
            };

            const dataPayload = {
                bookingId: String(booking._id),
                type: 'BOOKING_RESCHEDULED',
                newTime: String(timeSlot)
            };

            sendPushNotification(booking.partner.fcmToken, dataPayload, notificationPayload)
                .then(() => console.log("Reschedule notification sent to Partner"))
                .catch(err => console.error("Notification Error:", err));
        }
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

const getPartnerClientLogs = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        const bookings = await Booking.find({ partner: partnerId })
            .populate('user', 'name profilePic email mobile')
            .sort({ date: -1, createdAt: -1 });

        const formatBooking = (booking) => {
            const consultationDate = moment(booking.date || booking.startTime);
            const formattedDate = consultationDate.calendar(null, {
                sameDay: '[Today,] hh:mm A',
                lastDay: '[Yesterday,] hh:mm A',
                lastWeek: 'DD MMM, hh:mm A',
                sameElse: 'DD MMM YYYY, hh:mm A'
            });

            return {
                bookingId: booking._id,
                client: {
                    id: booking.user?._id || null,
                    name: booking.user?.name || 'Unknown Client',
                    profilePic: booking.user?.profilePic || null
                },
                mode: booking.mode || 'General',
                status: booking.status,
                rating: booking.rating || 5.0,
                lastConsultation: formattedDate,
                duration: `${booking.duration || 0} mins`,
                totalFee: booking.totalFee || 0
            };
        };

        const all = bookings.map(formatBooking);
        const completed = bookings
            .filter(booking => booking.status === 'completed')
            .map(formatBooking);

        res.status(200).json({
            success: true,
            data: {
                all,
                completed
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const searchPartnerClientLogs = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);
        const { query } = req.query;

        if (!query) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const matchingUsers = await User.find({
            name: { $regex: query, $options: 'i' }
        }).select('_id');

        const userIds = matchingUsers.map(u => u._id);

        const bookings = await Booking.find({
            partner: partnerId,
            $or: [
                { user: { $in: userIds } },
                { mode: { $regex: query, $options: 'i' } }
            ]
        })
            .populate('user', 'name profilePic email mobile')
            .sort({ date: -1, createdAt: -1 });

        const results = bookings.map(booking => {
            const consultationDate = moment(booking.date || booking.startTime);
            const formattedDate = consultationDate.calendar(null, {
                sameDay: '[Today,] hh:mm A',
                lastDay: '[Yesterday,] hh:mm A',
                lastWeek: 'DD MMM, hh:mm A',
                sameElse: 'DD MMM YYYY, hh:mm A'
            });

            return {
                bookingId: booking._id,
                client: {
                    id: booking.user?._id || null,
                    name: booking.user?.name || 'Unknown Client',
                    profilePic: booking.user?.profilePic || null
                },
                mode: booking.mode || 'General',
                status: booking.status,
                rating: booking.rating || 5.0,
                lastConsultation: formattedDate,
                duration: `${booking.duration || 0} mins`,
                totalFee: booking.totalFee || 0
            };
        });

        res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

const clearPartnerRejectedBookings = async (req, res) => {
    try {
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

       
        const result = await Booking.deleteMany({ partner: partnerId, status: 'rejected' });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} rejected booking(s) cleared successfully.`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};


const clearSingleRejectedBooking = async (req, res) => {
    try {
        const { bookingId } = req.params; 
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

      
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Booking ID format'
            });
        }

        
        const deletedBooking = await Booking.findOneAndDelete({
            _id: bookingId,
            partner: partnerId,
            status: 'rejected'
        });

        if (!deletedBooking) {
            return res.status(404).json({
                success: false,
                message: 'Rejected booking not found or already deleted'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Rejected booking cleared successfully',
            data: { bookingId }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};


const completeBooking = async (req, res) => {
    try {
        const { bookingId, actualDuration } = req.body;
        const rawPartnerId = req.user?.id || req.user?._id;
        const partnerId = new mongoose.Types.ObjectId(rawPartnerId);

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        const booking = await Booking.findOne({ _id: bookingId, partner: partnerId }).populate('user');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found for this partner'
            });
        }

        if (booking.status !== 'accepted') {
            return res.status(400).json({
                success: false,
                message: `Only 'accepted' bookings can be completed. Current status: ${booking.status}`
            });
        }

        
        const finalDuration = actualDuration ? Number(actualDuration) : booking.duration;
        const finalFee = booking.ratePerMinute * finalDuration;

      
        booking.status = 'completed';
        booking.duration = finalDuration;
        booking.totalFee = finalFee;
        await booking.save();

        
        const partner = await Partner.findById(partnerId);
        if (partner) {
            partner.walletBalance = (partner.walletBalance || 0) + finalFee;
            await partner.save();
        }

       
        if (booking.user && booking.user.fcmToken) {
            const notificationPayload = {
                title: 'Consultation Completed! 🎉',
                body: `Your session with ${partner?.fullName || 'Astrologer'} is complete. Please rate your experience.`
            };

            const dataPayload = {
                bookingId: String(booking._id),
                type: 'BOOKING_COMPLETED'
            };

            sendPushNotification(booking.user.fcmToken, dataPayload, notificationPayload)
                .then(() => console.log("Completion notification sent to User"))
                .catch(err => console.error("Notification Error:", err));
        }

        res.status(200).json({
            success: true,
            message: 'Booking marked as completed and fee credited to partner wallet.',
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
    rescheduleBooking,
    getPartnerClientLogs,
    searchPartnerClientLogs,
    clearPartnerRejectedBookings,
    clearSingleRejectedBooking,
    completeBooking
};