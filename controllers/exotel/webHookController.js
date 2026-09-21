const Booking = require('../../models/Booking/Booking');
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
        const booking = await Booking.findById(bookingId).populate('user partner').session(session);
        if (!booking || booking.status === 'completed' || booking.status === 'missed') {
            await session.abortTransaction();
            session.endSession();
            return res.status(200).send("Already Processed");
        }

        const user = await User.findById(booking.user._id).session(session);
        const partner = await Partner.findById(booking.partner._id).session(session);
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

        const ratePerMinute = Number(booking.ratePerMinute || partner?.minRate || 10);

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
            const balanceDiff = parseFloat(((booking.totalFee || 0) - finalCost).toFixed(2));

            if (user && balanceDiff !== 0) {
                user.walletBalance = parseFloat((user.walletBalance + balanceDiff).toFixed(2));
                await user.save({ session });
            }

            const commissionRatio = (booking.totalFee && booking.adminCommission)
                ? (booking.adminCommission / booking.totalFee)
                : 0;

            aComm = parseFloat((finalCost * commissionRatio).toFixed(2));
            pEarning = parseFloat((finalCost - aComm).toFixed(2));

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
            booking.totalFee = finalCost;
            booking.partnerEarning = pEarning;
            booking.adminCommission = aComm;
            booking.duration = billedMins;
        } else {
            if (user) {
                user.walletBalance = parseFloat((user.walletBalance + (booking.totalFee || 0)).toFixed(2));
                await user.save({ session });
            }
            booking.status = 'missed';
            booking.paymentStatus = 'refunded';
            booking.duration = 0;
            booking.totalFee = 0;
        }

        booking.actualDuration = durationSeconds;
        await booking.save({ session });

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
        } else {
            await sendPushNotification(partner?.fcmToken, { type: 'MISSED_CALL' }, {
                title: "Missed Call",
                body: `You missed a consultation with ${user?.fullName || 'User'}`
            });
        }

        return res.status(200).send("Call Logged and Processed");

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        return res.status(500).send("Internal Error");
    }
};