// controllers/Session/sessionController.js
const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const admin = require('../../config/firebase');
const { triggerExotelCall } = require('../../services/exotelService'); // ✅ Fixed Import Name

// ==========================================
// 1. USER: Send Instant Chat or Call Request
// ==========================================
const initiateSessionRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { partnerId, type } = req.body; // type: 'chat' OR 'call'

        if (!['chat', 'call'].includes(type)) {
            return res.status(400).json({ success: false, message: "Type must be 'chat' or 'call'" });
        }

        const partner = await Partner.findById(partnerId);
        if (!partner || !partner.isOnline) {
            return res.status(400).json({ success: false, message: "Astrologer is currently offline" });
        }

        if (partner.isBusy) {
            return res.status(400).json({ success: false, message: "Astrologer is currently busy" });
        }

        const user = await User.findById(userId);
        
        // Minimum Balance Check (Min 5 mins balance required)
        const minRate = partner.minRate || 10;
        const requiredBalance = minRate * 5;

        if ((user.walletBalance || 0) < requiredBalance) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance. Minimum ₹${requiredBalance} required.` 
            });
        }

        // 1. Create Pending Request Record
        const sessionRequest = await SessionRequest.create({
            user: userId,
            partner: partnerId,
            type,
            ratePerMin: minRate,
            status: 'pending'
        });

        // 2. Push Notification to Astro Partner (FCM)
        if (partner.fcmToken) {
            const message = {
                token: partner.fcmToken,
                data: {
                    type: 'INCOMING_SESSION_REQUEST',
                    requestId: sessionRequest._id.toString(),
                    sessionType: type,
                    userName: user.fullName || 'User',
                    userPic: user.profilePic || '',
                },
                android: { priority: 'high' }
            };
            await admin.messaging().send(message);
        }

        // 3. Update Firebase Realtime Database Node (For Instant Pop-up on Partner App)
        await admin.database().ref(`session_requests/${partnerId}`).set({
            requestId: sessionRequest._id.toString(),
            userId: userId,
            userName: user.fullName || 'User',
            type: type,
            status: 'pending',
            timestamp: Date.now()
        });

        return res.status(200).json({
            success: true,
            message: "Request sent successfully",
            requestId: sessionRequest._id
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 2. PARTNER: Accept or Decline Request
// ==========================================
const respondToSessionRequest = async (req, res) => {
    try {
        const partnerId = req.user.id;
        const { requestId, action } = req.body; // action: 'accept' OR 'decline'

        const sessionReq = await SessionRequest.findById(requestId).populate('user partner');

        if (!sessionReq || sessionReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Request expired or already processed" });
        }

        // Clear Realtime Notification Node
        await admin.database().ref(`session_requests/${partnerId}`).remove();

        // ---------------- DECLINE ACTION ----------------
        if (action === 'decline') {
            sessionReq.status = 'rejected';
            await sessionReq.save();

            // Notify User via FCM
            if (sessionReq.user.fcmToken) {
                await admin.messaging().send({
                    token: sessionReq.user.fcmToken,
                    data: { 
                        type: 'REQUEST_REJECTED', 
                        message: 'Astrologer declined your request.' 
                    }
                });
            }

            return res.status(200).json({ success: true, message: "Request declined successfully" });
        }

        // ---------------- ACCEPT ACTION ----------------
        if (action === 'accept') {
            sessionReq.status = 'accepted';
            sessionReq.startTime = new Date();

            // Mark Astro Partner as Busy
            await Partner.findByIdAndUpdate(partnerId, { isBusy: true });

            // CASE 1: INSTANT CHAT ACCEPTED
            if (sessionReq.type === 'chat') {
                const chatRoomId = `chat_${sessionReq.user._id}_${partnerId}_${Date.now()}`;
                sessionReq.chatRoomId = chatRoomId;
                await sessionReq.save();

                // Create Firebase Chat Session Node
                await admin.database().ref(`chats/${chatRoomId}`).set({
                    user: sessionReq.user._id.toString(),
                    partner: partnerId,
                    status: 'active',
                    createdAt: Date.now()
                });

                // Notify User with Chat Room ID
                if (sessionReq.user.fcmToken) {
                    await admin.messaging().send({
                        token: sessionReq.user.fcmToken,
                        data: { 
                            type: 'REQUEST_ACCEPTED', 
                            sessionType: 'chat',
                            chatRoomId: chatRoomId 
                        }
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "Chat request accepted",
                    chatRoomId,
                    sessionType: 'chat'
                });
            }

            // CASE 2: VOICE CALL ACCEPTED (EXOTEL) - ✅ FIXED THIS BLOCK
            if (sessionReq.type === 'call') {
                // Wallet balance se Call Duration Limit (Seconds me) calculate karna
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

                // Trigger Exotel Call with exact parameters
                const callResult = await triggerExotelCall(
                    sessionReq.partner.mobile,  // Partner Number (From)
                    sessionReq.user.mobile,     // User Number (To)
                    timeLimitSec,               // Time Limit
                    sessionReq._id.toString()   // Request ID
                );

                if (!callResult.success) {
                    // Reverse busy status if call failed
                    await Partner.findByIdAndUpdate(partnerId, { isBusy: false });
                    return res.status(500).json({ 
                        success: false, 
                        message: "Failed to connect call via Exotel", 
                        error: callResult.error 
                    });
                }

                sessionReq.exotelCallSid = callResult.callSid;
                await sessionReq.save();

                // Notify User
                if (sessionReq.user.fcmToken) {
                    await admin.messaging().send({
                        token: sessionReq.user.fcmToken,
                        data: { type: 'REQUEST_ACCEPTED', sessionType: 'call' }
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "Voice call connecting via Exotel",
                    callSid: callResult.callSid,
                    sessionType: 'call'
                });
            }
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    initiateSessionRequest,
    respondToSessionRequest
};