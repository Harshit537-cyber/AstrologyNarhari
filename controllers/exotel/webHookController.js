const Booking = require('../../models/Booking/Booking');
const SessionRequest = require('../../models/SessionRequest/SessionRequest'); // ✅ 1. Yeh model import karein
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
        // ✅ 2. Check karein ki yeh ID Booking ki hai ya SessionRequest ki (Instant Booking)
        let booking = await Booking.findById(bookingId).populate('user partner').session(session);
        let isSessionRequest = false;

        if (!booking) {
            booking = await SessionRequest.findById(bookingId).populate('user partner').session(session);
            isSessionRequest = true; // Yeh Instant booking hai
        }

        if (!booking || booking.status === 'completed' || booking.status === 'missed') {
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

        // Instant booking me 'ratePerMin' hota hai, normal me 'ratePerMinute'
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

        // Total fee nikalne ke liye
        const initialFee = isSessionRequest ? (billedMins * ratePerMinute) : (booking.totalFee || 0);

        if (isCallSuccessful) {
            // Instant booking ke liye wallet deduction aur partner earning
            aComm = parseFloat((finalCost * (booking.adminCommission ? booking.adminCommission / booking.totalFee : 0.1)).toFixed(2));
            pEarning = parseFloat((finalCost - aComm).toFixed(2));

            if (user) {
                // Wallet balance update for instant/normal
                user.walletBalance = Math.max(0, parseFloat((user.walletBalance - finalCost).toFixed(2)));
                await user.save({ session });
            }

            if (partner) {
                partner.walletBalance = parseFloat((partner.walletBalance + pEarning).toFixed(2));
                await partner.save({ session });
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
            booking.status = 'missed';
            booking.paymentStatus = 'refunded';
            booking.duration = 0;
            booking.durationMinutes = 0;
            if (!isSessionRequest) booking.totalFee = 0;
            else booking.totalDeductedAmount = 0;
        }

        booking.actualDuration = durationSeconds;
        booking.durationInSeconds = durationSeconds;
        await booking.save({ session });

        // Call Log save karein
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

        return res.status(200).send("Call Logged and Processed");

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        console.error("Webhook Error:", error);
        return res.status(500).send("Internal Error");
    }
};