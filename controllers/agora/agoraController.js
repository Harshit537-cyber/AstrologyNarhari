const LiveSession = require('../../models/Agora/LiveSession');
const Partner = require('../../models/Partner/Partner');
const { generateAgoraTokens } = require('../../services/agoraService');
const User = require("../../models/User");
const moment = require('moment');
const Booking = require('../../models/Booking/Booking');
const admin = require('firebase-admin')
const sendPushNotification = require('../../utils/notificationService')


// THESE API'S FOR LIVE STREAMING

exports.startLive = async (req, res) => {
    try {
        const { partnerId, topic, category } = req.body;

        const partner = await Partner.findById(partnerId);
        if (!partner || partner.profileApprovalStatus !== 'Approved') {
            return res.status(403).json({ message: "Partner not approved for live" });
        }

        const channelName = `channel_${partnerId}`;
        const uid = Math.floor(Math.random() * 1000000);

        const { rtcToken, rtmToken } = generateAgoraTokens(channelName, uid);

        const session = await LiveSession.findOneAndUpdate(
            { partnerId },
            { channelName, topic, category, startTime: Date.now(), status: 'Active' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await Partner.findByIdAndUpdate(partnerId, { isBusy: true, isOnline: true });

        res.status(200).json({
            success: true,
            data: { session, rtcToken, rtmToken, uid, channelName }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.joinLive = async (req, res) => {
    try {
        const { sessionId, userId } = req.body;
        const session = await LiveSession.findById(sessionId).select('channelName status');

        if (!session || session.status !== 'Active') {
            return res.status(404).json({ success: false, message: "Session is not active" });
        }

        const uid = parseInt(userId.toString().substring(userId.toString().length - 6), 16) % 1000000;

        const { rtcToken, rtmToken } = generateAgoraTokens(session.channelName, uid);

        await LiveSession.findByIdAndUpdate(sessionId, { $inc: { viewerCount: 1 } });

        res.status(200).json({
            success: true,
            data: {
                rtcToken,
                rtmToken,
                uid,
                channelName: session.channelName
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getActiveSessions = async (req, res) => {
    try {
        const { category } = req.query;
        let query = { status: 'Active' };

        if (category && category.trim() !== "") {
            query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
        }

        const sessions = await LiveSession.find(query)
            .populate('partnerId', 'fullName profilePic specialties averageRating');

        res.status(200).json({
            success: true,
            total: sessions.length,
            sessions
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.endLive = async (req, res) => {
    try {
        const { partnerId } = req.body;

        await LiveSession.findOneAndUpdate(
            { partnerId, status: 'Active' },
            { status: 'Ended', endTime: Date.now() }
        );

        await Partner.findByIdAndUpdate(partnerId, { isBusy: false, isOnline: false });

        res.status(200).json({ success: true, message: "Live ended successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.likeSession = async (req, res) => {
    try {
        const { sessionId, userId } = req.body;
        const { action } = req.query;

        if (!userId || !sessionId) {
            return res.status(400).json({ success: false, message: "Details is Incompleted!" });
        }

        const user = await User.findById(userId).select('fullName');
        const nameOfLiker = user ? user.fullName : "Someone";

        if (action === 'like') {
            const updatedSession = await LiveSession.findOneAndUpdate(
                {
                    _id: sessionId,
                    likedByUsers: { $ne: userId }
                },
                {
                    $inc: { likeCount: 1 },
                    $addToSet: { likedByUsers: userId }
                },
                { new: true }
            );

            if (!updatedSession) {
                const currentSession = await LiveSession.findById(sessionId).select('likeCount');
                return res.status(200).json({
                    success: true,
                    message: "Count does not increased, You have already liked!",
                    totalLikes: currentSession.likeCount,
                    likedBy: nameOfLiker,
                    isNewLike: false
                });
            }

            return res.status(200).json({
                success: true,
                message: "Congratulation! First Like Count.",
                totalLikes: updatedSession.likeCount,
                likedBy: nameOfLiker,
                isNewLike: true
            });
        }

        if (action === 'unlike') {
            const updatedSession = await LiveSession.findOneAndUpdate(
                {
                    _id: sessionId,
                    likedByUsers: userId
                },
                {
                    $inc: { likeCount: -1 },
                    $pull: { likedByUsers: userId }
                },
                { new: true }
            );

            if (!updatedSession) {
                const currentSession = await LiveSession.findById(sessionId).select('likeCount');
                return res.status(200).json({
                    success: true,
                    message: "You dost not liked so You dont unlike it until you liked !",
                    totalLikes: currentSession.likeCount,
                    likedBy: nameOfLiker,
                    isNewLike: false
                });
            }

            if (updatedSession.likeCount < 0) {
                updatedSession.likeCount = 0;
                await updatedSession.save();
            }

            return res.status(200).json({
                success: true,
                message: "Like removed successfully.",
                totalLikes: updatedSession.likeCount,
                likedBy: nameOfLiker,
                isNewLike: false
            });
        }

        res.status(400).json({ success: false, message: "Invalid action! Use 'like' or 'unlike'." });

    } catch (error) {
        console.error("Like API Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.getViewerCount = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSession.findById(sessionId).select('viewerCount');

        if (!session) {
            return res.status(404).json({ success: false, message: "Session does not found" });
        }

        res.status(200).json({
            success: true,
            viewerCount: session.viewerCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.getLikeStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSession.findById(sessionId)
            .select('likeCount likedByUsers')
            .populate('likedByUsers', 'fullName');

        if (!session) {
            return res.status(404).json({ success: false, message: "Session nahi mila!" });
        }

        const likersNames = session.likedByUsers.map(user => user.fullName);

        res.status(200).json({
            success: true,
            totalLikes: session.likeCount,
            allLikedBy: likersNames
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// LIVE STREAMING API'S ENDING HERE


//----------------------------------------------------------------------------------------------------------------------------------------------

// AUDIO CALL API'S STARTING HERE 

exports.startConsultation =  async (req, res) => {
    try {
        const { bookingId } = req.body;
        const currentUserId = req.user.id;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }
        const booking = await Booking.findById(bookingId).populate('user partner');
        
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Consultation booking not found' });
        }

        const isPartner = booking.partner._id.toString() === currentUserId;
        const isUser = booking.user._id.toString() === currentUserId;

        if (!isPartner && !isUser) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        if (booking.status !== 'accepted') {
            return res.status(400).json({ 
                success: false, 
                message: `Consultation cannot start. Status: ${booking.status}` 
            });
        }

        const now = moment();
        const startTime = moment(booking.startTime);
        const endTime = moment(booking.endTime);

        if (now.isBefore(startTime.clone().subtract(5, 'minutes'))) {
            return res.status(400).json({ 
                success: false, 
                message: `Scheduled at ${booking.timeSlot}. Please wait.` 
            });
        }

        if (now.isAfter(endTime)) {
            return res.status(400).json({ success: false, message: 'Session expired.' });
        }

        const channelName = `consultation_${bookingId}`;
        const uid = Math.floor(Math.random() * 1000000); 
        const tokens = generateAgoraTokens(channelName, uid, 'publisher');
        const encryptionKey = crypto.createHash('sha256').update(bookingId).digest('hex').substring(0, 32);

        if (isPartner) {
            await Partner.findByIdAndUpdate(booking.partner._id, { isBusy: true });

            if (booking.user.fcmToken) {
                await sendPushNotification(booking.user.fcmToken, {
                    type: 'INCOMING_CALL',
                    bookingId: booking._id.toString(),
                    channelName: channelName,
                    rtcToken: tokens.rtcToken,
                    encryptionKey: encryptionKey,
                    partnerName: booking.partner.fullName,
                    duration: booking.duration.toString()
                }, {
                    title: 'Incoming Call',
                    body: `${booking.partner.fullName} is calling you.`
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Consultation initialized successfully',
            data: {
                ...tokens,
                uid,
                channelName,
                encryptionKey, 
                role: isPartner ? 'partner' : 'user',
                duration: booking.duration,
                startTime: booking.startTime,
                endTime: booking.endTime,
                partnerName: booking.partner.fullName,
                userName: booking.user.fullName
            }
        });

    } catch (error) {
        console.error("Start Consultation Error:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error',
            error: error.message 
        });
    }
};

exports.endConsultation =  async (req, res) => {
    try {
        const { bookingId } = req.body;
        const currentUserId = req.user.id;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }
        const booking = await Booking.findById(bookingId).populate('user partner');
        
        if (!booking || booking.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Invalid or already completed booking' });
        }
        const isPartner = booking.partner._id.toString() === currentUserId;
        const isUser = booking.user._id.toString() === currentUserId;
        if (!isPartner && !isUser) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const now = moment();
        const callStartTime = moment(booking.startTime);
        
        let actualMinutes = Math.ceil(now.diff(callStartTime, 'seconds') / 60);
        if (actualMinutes <= 0) actualMinutes = 1; 
        if (actualMinutes > booking.duration) actualMinutes = booking.duration;
        const actualFee = actualMinutes * booking.ratePerMinute;
        const refundAmount = booking.totalFee - actualFee;
        const partner = await Partner.findById(booking.partner._id);
        if (partner) {
            partner.walletBalance = (partner.walletBalance || 0) + actualFee;
            partner.isBusy = false;
            await partner.save();
        }

        if (refundAmount > 0) {
            const user = await User.findById(booking.user._id);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + refundAmount;
                await user.save();
            }
        }
        booking.status = 'completed';
        booking.paymentStatus = 'completed';
        booking.actualDuration = actualMinutes;
        await booking.save();

        const recipientToken = isPartner ? booking.user.fcmToken : booking.partner.fcmToken;
        if (recipientToken) {
            await sendPushNotification(recipientToken, {
                type: 'CALL_ENDED',
                bookingId: bookingId.toString(),
                actualMinutes: actualMinutes.toString()
            }, {
                title: 'Consultation Ended',
                body: `Session lasted ${actualMinutes} mins. Wallet updated.`
            });
        }
        res.status(200).json({
            success: true,
            message: 'Consultation ended successfully',
            data: {
                totalMinutes: actualMinutes,
                feeCharged: actualFee,
                refunded: refundAmount > 0 ? refundAmount : 0
            }
        });

    } catch (error) {
        console.error("End Consultation Error:", error);
        res.status(500).json({ success: false, message: 'Error ending session' });
    }
};