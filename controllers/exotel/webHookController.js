const Booking = require('../../models/Booking/Booking');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const sendPushNotification = require('../../utils/notificationService');
const mongoose = require('mongoose');
const CallLog = require("../../models/CallLog/CallLog")

exports.exotelWebhook =async (req, res) => {
    const { bookingId, auth } = req.query;
    const { Status, Duration, RecordingUrl, CallSid, StartTime, EndTime } = req.body;

    if (auth !== process.env.MY_INTERNAL_API_KEY) {
        return res.status(401).send("Unauthorized");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const booking = await Booking.findById(bookingId).populate('user partner').session(session);
        if (!booking || booking.status === 'completed') {
            await session.abortTransaction();
            return res.status(200).send("Already Processed");
        }

        const user = await User.findById(booking.user._id).session(session);
        const partner = await Partner.findById(booking.partner._id).session(session);

        if (partner) {
            partner.isBusy = false;
            await partner.save({ session });
        }

        const billedMins = Status === 'completed' ? Math.ceil(parseInt(Duration || 0) / 60) : 0;
        const finalCost = parseFloat((billedMins * booking.ratePerMinute).toFixed(2));

        const userBalBefore = user?.walletBalance || 0;
        const partnerBalBefore = partner?.walletBalance || 0;

        if (Status === 'completed' && finalCost > 0) {
            if (user) user.walletBalance = parseFloat((user.walletBalance - finalCost).toFixed(2));
            if (partner) partner.walletBalance = parseFloat((partner.walletBalance + finalCost).toFixed(2));
            
            if (user) await user.save({ session });
            if (partner) await partner.save({ session });
        }

        const newCallLog = new CallLog({
            bookingId: booking._id,
            user: {
                id: user?._id,
                name: user?.fullName,
                mobile: user?.mobile,
                balanceBefore: userBalBefore,
                balanceAfter: user?.walletBalance
            },
            partner: {
                id: partner?._id,
                name: partner?.fullName,
                mobile: partner?.mobile,
                balanceBefore: partnerBalBefore,
                balanceAfter: partner?.walletBalance
            },
            callSid: CallSid,
            status: Status === 'completed' ? 'completed' : (Status || 'failed'),
            durationSeconds: parseInt(Duration || 0),
            billedMinutes: billedMins,
            ratePerMinute: booking.ratePerMinute,
            totalCost: finalCost,
            recordingUrl: RecordingUrl,
            startTime: StartTime || new Date(),
            endTime: EndTime || new Date()
        });

        await newCallLog.save({ session });

        booking.status = Status === 'completed' ? 'completed' : 'missed';
        booking.actualDuration = parseInt(Duration || 0);
        if (Status === 'completed') {
    booking.paymentStatus = 'completed'; 
}
        await booking.save({ session });

        await session.commitTransaction();
        session.endSession();

        if (Status === 'completed') {
            await sendPushNotification(user?.fcmToken, { type: 'CALL_SUCCESS' }, {
                title: "Consultation Done",
                body: `Charged ₹${finalCost} for ${billedMins} mins.`
            });
        } else {
            await sendPushNotification(partner?.fcmToken, { type: 'MISSED_CALL' }, {
                title: "Missed Call",
                body: `You missed a consultation with ${user?.fullName}`
            });
        }

        return res.status(200).send("Call Logged and Processed");

    } catch (error) {
        if (session.inAtomicityPlaceholder()) await session.abortTransaction();
        session.endSession();
        console.error("WEBHOOK_ERROR:", error);
        return res.status(500).send("Internal Error");
    }
};
