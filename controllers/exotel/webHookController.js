const Booking = require('../../models/Booking/Booking');
const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const sendPushNotification = require('../../utils/notificationService');
const mongoose = require('mongoose');
const CallLog = require("../../models/CallLog/CallLog");

exports.exotelWebhook = async (req, res) => {
    const payload = { ...req.query, ...req.body };
    const bookingId = payload.requestId || req.query.requestId;
    const auth = payload.auth || req.query.auth;

    const Status = payload.Status;
    const RecordingUrl = payload.RecordingUrl;
    const CallSid = payload.CallSid || payload.Sid;
    const StartTime = payload.StartTime;
    const EndTime = payload.EndTime;

    if (auth !== process.env.MY_INTERNAL_API_KEY) {
        return res.status(401).send("Unauthorized");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Check Booking or SessionRequest
        let booking = await Booking.findById(bookingId).populate('user partner').session(session);
        let isSessionRequest = false;

        if (!booking) {
            booking = await SessionRequest.findById(bookingId).populate('user partner').session(session);
            isSessionRequest = true;
        }

        if (!booking || booking.status === 'completed' || booking.status === 'failed' || booking.status === 'rejected') {
            await session.abortTransaction();
            session.endSession();
            return res.status(200).send("Already Processed");
        }

        const user = await User.findById(booking.user._id || booking.user).session(session);
        const partner = await Partner.findById(booking.partner._id || booking.partner).session(session);
        const adminUser = await User.findOne({ role: 'admin' }).session(session);

        if (partner) {
            partner.isBusy = false;
            await partner.save({ session });
        }

        const rawSec = parseInt(
            payload.ConversationDuration ||
            payload.DialCallDuration ||
            payload.Duration ||
            0,
            10
        );

        const durationSeconds = isNaN(rawSec) ? 0 : Math.max(0, rawSec);
        const statusLower = Status ? Status.toLowerCase() : "";

        let finalCost = 0;
        let billedMins = 0;
        let isCallSuccessful = false;

        const ratePerMinute = Number(booking.ratePerMinute || booking.ratePerMin || partner?.minRate || 10);

        if (statusLower === 'completed' && durationSeconds > 0) {
            billedMins = Math.ceil(durationSeconds / 60);
            finalCost = parseFloat((billedMins * ratePerMinute).toFixed(2));
            isCallSuccessful = true;
        }

        const userBalBefore = user?.walletBalance || 0;
        const partnerBalBefore = partner?.walletBalance || 0;

        let pEarning = 0;
        let aComm = 0;

        if (isCallSuccessful) {
            aComm = parseFloat((finalCost * 0.1).toFixed(2)); // Default 10% commission
            pEarning = parseFloat((finalCost - aComm).toFixed(2));

            if (user) {
                user.walletBalance = Math.max(0, parseFloat((user.walletBalance - finalCost).toFixed(2)));
                await user.save({ session });
            }

            if (partner) {
                partner.walletBalance = parseFloat((partner.walletBalance + pEarning).toFixed(2));
                await partner.save({ session });
            }

            if (adminUser && aComm > 0) {
                adminUser.walletBalance = parseFloat((adminUser.walletBalance + aComm).toFixed(2));
                await adminUser.save({ session });
            }

            booking.status = 'completed';
            booking.paymentStatus = 'completed';
            if (!isSessionRequest) {
                booking.totalFee = finalCost;
                booking.partnerEarning = pEarning;
                booking.adminCommission = aComm;
            } else {
                booking.totalDeductedAmount = finalCost;
            }
            booking.duration = billedMins;
            booking.durationMinutes = billedMins;
        } else {
            // Fix: SessionRequest ke liye 'failed' use karenge taaki enum validation error na aaye
            booking.status = isSessionRequest ? 'failed' : 'missed';
            if (!isSessionRequest) booking.paymentStatus = 'refunded';
            booking.duration = 0;
            booking.durationMinutes = 0;
            if (!isSessionRequest) booking.totalFee = 0;
            else booking.totalDeductedAmount = 0;
        }

        booking.actualDuration = durationSeconds;
        booking.durationInSeconds = durationSeconds;
        await booking.save({ session });

        const newCallLog = new CallLog({
            bookingId: isSessionRequest ? null : booking._id,
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
            status: isCallSuccessful ? 'completed' : (Status || 'failed'),
            durationSeconds: durationSeconds,
            billedMinutes: billedMins,
            ratePerMinute: ratePerMinute,
            totalCost: finalCost,
            recordingUrl: RecordingUrl || "",
            startTime: StartTime || new Date(),
            endTime: EndTime || new Date()
        });

        await newCallLog.save({ session });

        await session.commitTransaction();
        session.endSession();

        if (booking.status === 'completed') {
            await sendPushNotification(user?.fcmToken, { type: 'CALL_SUCCESS' }, {
                title: "Consultation Done",
                body: `Charged ₹${finalCost} for ${billedMins} mins session.`
            });
        }

        return res.status(200).send("Call Logged and Processed");

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        console.error("Webhook Internal Error:", error); 
        return res.status(500).send("Internal Error: " + error.message);
    }
};