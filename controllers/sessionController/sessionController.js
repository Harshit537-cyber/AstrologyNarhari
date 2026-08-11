const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const admin = require('../../config/firebase');
const { triggerExotelCall } = require('../../services/exotelService');

const initiateSessionRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { partnerId, type } = req.body;

        if (!partnerId || !type) {
            return res.status(400).json({ success: false, message: "partnerId and type are required" });
        }

        if (!['chat', 'call'].includes(type)) {
            return res.status(400).json({ success: false, message: "Type must be 'chat' or 'call'" });
        }

        const partner = await Partner.findById(partnerId);
        if (!partner || !partner.isOnline) {
            return res.status(400).json({ success: false, message: "Astrologer is currently offline" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const minRate = partner.minRate || 10;
        const requiredBalance = minRate * 5;

        if ((user.walletBalance || 0) < requiredBalance) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance. Minimum ₹${requiredBalance} required.` 
            });
        }

        const sessionRequest = await SessionRequest.create({
            user: userId,
            partner: partnerId,
            type,
            ratePerMin: minRate,
            status: 'pending'
        });

        if (partner.fcmToken) {
            admin.messaging().send({
                token: partner.fcmToken,
                data: {
                    type: 'INCOMING_SESSION_REQUEST',
                    requestId: sessionRequest._id.toString(),
                    sessionType: type,
                    userName: user.fullName || 'User',
                    userPic: user.profilePic || '',
                },
                android: { priority: 'high' }
            }).catch(err => console.error("FCM Error:", err.message));
        }

        admin.database().ref(`session_requests/${partnerId}/${sessionRequest._id}`).set({
            requestId: sessionRequest._id.toString(),
            userId: userId,
            userName: user.fullName || 'User',
            type: type,
            status: 'pending',
            timestamp: Date.now()
        }).catch(err => console.error("Firebase DB Error:", err.message));

        return res.status(200).json({
            success: true,
            message: "Request sent successfully",
            requestId: sessionRequest._id
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const cancelSessionRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ success: false, message: "requestId is required" });
        }

        const sessionReq = await SessionRequest.findOne({ _id: requestId, user: userId });

        if (!sessionReq) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        if (sessionReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Only pending requests can be cancelled" });
        }

        sessionReq.status = 'cancelled';
        await sessionReq.save();

        admin.database().ref(`session_requests/${sessionReq.partner}/${requestId}`).remove()
            .catch(err => console.error("Firebase DB Error:", err.message));

        return res.status(200).json({
            success: true,
            message: "Request cancelled successfully"
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const respondToSessionRequest = async (req, res) => {
    try {
        const partnerId = req.user.id;
        const { requestId, action } = req.body;

        if (!requestId || !action) {
            return res.status(400).json({ success: false, message: "requestId and action are required" });
        }

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ success: false, message: "Action must be 'accept' or 'decline'" });
        }

        const sessionReq = await SessionRequest.findById(requestId).populate('user partner');

        if (!sessionReq || sessionReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Request expired, cancelled or already processed" });
        }

        admin.database().ref(`session_requests/${partnerId}/${requestId}`).remove()
            .catch(err => console.error("Firebase DB Error:", err.message));

        if (action === 'decline') {
            sessionReq.status = 'rejected';
            await sessionReq.save();

            if (sessionReq.user && sessionReq.user.fcmToken) {
                admin.messaging().send({
                    token: sessionReq.user.fcmToken,
                    data: { 
                        type: 'REQUEST_REJECTED', 
                        message: 'Astrologer declined your request.' 
                    }
                }).catch(err => console.error("FCM Error:", err.message));
            }

            return res.status(200).json({ success: true, message: "Request declined successfully" });
        }

        if (action === 'accept') {
            sessionReq.status = 'accepted';
            sessionReq.startTime = new Date();

            if (sessionReq.type === 'chat') {
                const chatRoomId = `chat_${sessionReq.user._id}_${partnerId}_${Date.now()}`;
                sessionReq.chatRoomId = chatRoomId;
                await sessionReq.save();

                admin.database().ref(`chats/${chatRoomId}`).set({
                    user: sessionReq.user._id.toString(),
                    partner: partnerId,
                    status: 'active',
                    createdAt: Date.now()
                }).catch(err => console.error("Firebase DB Error:", err.message));

                if (sessionReq.user && sessionReq.user.fcmToken) {
                    admin.messaging().send({
                        token: sessionReq.user.fcmToken,
                        data: { 
                            type: 'REQUEST_ACCEPTED', 
                            sessionType: 'chat',
                            chatRoomId: chatRoomId 
                        }
                    }).catch(err => console.error("FCM Error:", err.message));
                }

                return res.status(200).json({
                    success: true,
                    message: "Chat request accepted",
                    chatRoomId,
                    sessionType: 'chat'
                });
            }

            if (sessionReq.type === 'call') {
                const userWallet = sessionReq.user.walletBalance || 0;
                const ratePerMin = sessionReq.ratePerMin || 10;
                const maxAllowedMinutes = userWallet / ratePerMin;
                const timeLimitSec = Math.floor(maxAllowedMinutes * 60);

                if (timeLimitSec < 60) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "User wallet balance is too low for a 1-minute call." 
                    });
                }

                const callResult = await triggerExotelCall(
                    sessionReq.partner.mobile,
                    sessionReq.user.mobile,
                    timeLimitSec,
                    sessionReq._id.toString()
                );

                if (!callResult.success) {
                    return res.status(500).json({ 
                        success: false, 
                        message: "Failed to connect call via Exotel", 
                        error: callResult.error 
                    });
                }

                sessionReq.exotelCallSid = callResult.callSid;
                await sessionReq.save();

                if (sessionReq.user && sessionReq.user.fcmToken) {
                    admin.messaging().send({
                        token: sessionReq.user.fcmToken,
                        data: { type: 'REQUEST_ACCEPTED', sessionType: 'call' }
                    }).catch(err => console.error("FCM Error:", err.message));
                }

                return res.status(200).json({
                    success: true,
                    message: "Voice call connecting via Exotel",
                    callSid: callResult.callSid,
                    sessionType: 'call'
                });
            }
        }

        return res.status(400).json({ success: false, message: "Invalid action or request type" });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const endSession = async (req, res) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ success: false, message: "requestId is required" });
        }

        const sessionReq = await SessionRequest.findById(requestId);

        if (!sessionReq || sessionReq.status !== 'accepted') {
            return res.status(400).json({ success: false, message: "Session is not active or already completed" });
        }

        const endTime = new Date();
        const startTime = sessionReq.startTime || new Date();
        const durationSeconds = Math.max(1, Math.ceil((endTime - startTime) / 1000));
        const durationMinutes = Math.ceil(durationSeconds / 60);

        const totalCost = durationMinutes * (sessionReq.ratePerMin || 10);

        sessionReq.status = 'completed';
        sessionReq.endTime = endTime;
        sessionReq.durationSeconds = durationSeconds;
        sessionReq.totalCost = totalCost;
        await sessionReq.save();

        await User.findByIdAndUpdate(sessionReq.user, {
            $inc: { walletBalance: -totalCost }
        });

        await Partner.findByIdAndUpdate(sessionReq.partner, {
            $inc: { walletBalance: totalCost }
        });

        if (sessionReq.chatRoomId) {
            admin.database().ref(`chats/${sessionReq.chatRoomId}`).update({ status: 'ended' })
                .catch(err => console.error("Firebase DB Error:", err.message));
        }

        return res.status(200).json({
            success: true,
            message: "Session ended successfully",
            durationMinutes,
            totalCost
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPartnerPendingRequests = async (req, res) => {
    try {
        const partnerId = req.user.id;

        const requests = await SessionRequest.find({
            partner: partnerId,
            status: 'pending'
        }).populate('user', 'fullName profilePic mobile walletBalance').sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getUserRequestStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;

        const sessionReq = await SessionRequest.findOne({
            _id: requestId,
            user: userId
        }).populate('partner', 'name profilePic minRate mobile');

        if (!sessionReq) {
            return res.status(404).json({
                success: false,
                message: "Session request not found"
            });
        }

        return res.status(200).json({
            success: true,
            status: sessionReq.status,
            request: sessionReq
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    initiateSessionRequest,
    cancelSessionRequest,
    respondToSessionRequest,
    endSession,
    getPartnerPendingRequests,
    getUserRequestStatus
};