const SessionRequest = require("../../models/SessionRequest/SessionRequest");
const Partner = require("../../models/Partner/Partner");
const User = require("../../models/User");
const admin = require("../../config/firebase");
const { triggerExotelCall } = require("../../services/exotelService");

const initiateSessionRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId, type, durationMinutes } = req.body;

    if (!partnerId || !type || !durationMinutes) {
      return res.status(400).json({
        success: false,
        message: "partnerId, type, and durationMinutes are required",
      });
    }

    if (!["chat", "call"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Type must be 'chat' or 'call'" });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner || !partner.isOnline) {
      return res
        .status(400)
        .json({ success: false, message: "Astrologer is currently offline" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const minRate = partner.minRate || 10;
    const requiredBalance = minRate * Number(durationMinutes);

    if ((user.walletBalance || 0) < requiredBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Minimum ₹${requiredBalance} required for ${durationMinutes} minutes.`,
      });
    }

    const sessionRequest = await SessionRequest.create({
      user: userId,
      partner: partnerId,
      type,
      ratePerMin: minRate,
      durationMinutes: Number(durationMinutes),
      status: "pending",
    });

    if (partner.fcmToken) {
      admin
        .messaging()
        .send({
          token: partner.fcmToken,
          notification: {
            title:
              type === "chat"
                ? "Incoming Chat Request"
                : "Incoming Call Request",
            body: `${user.fullName || "User"} is requesting a ${type} session.`,
          },
          data: {
            type: "INCOMING_SESSION_REQUEST",
            requestId: sessionRequest._id.toString(),
            sessionType: type,
            durationMinutes: durationMinutes.toString(),
            userName: user.fullName || "User",
            userPic: user.profilePic || "",
            isRinging: "true",
          },
          android: {
            priority: "high",
            notification: {
              sound: "ringtone2",
              defaultSound: false,
              defaultVibrateTimings: true,
              priority: "max",
              visibility: "public",
              channelId: "call_sound_v4",
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",
            },
            payload: {
              aps: {
                sound: "ringtone2.mp3",
                contentAvailable: true,
              },
            },
          },
        })
        .catch(() => {});
    }

    admin
      .database()
      .ref(`session_requests/${partnerId}/${sessionRequest._id}`)
      .set({
        requestId: sessionRequest._id.toString(),
        userId: userId,
        userName: user.fullName || "User",
        type: type,
        durationMinutes: durationMinutes,
        status: "pending",
        timestamp: Date.now(),
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Request sent successfully",
      requestId: sessionRequest._id,
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
      return res
        .status(400)
        .json({ success: false, message: "requestId is required" });
    }

    const sessionReq = await SessionRequest.findOne({
      _id: requestId,
      user: userId,
    });

    if (!sessionReq) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    if (sessionReq.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });
    }

    sessionReq.status = "cancelled";
    await sessionReq.save();

    admin
      .database()
      .ref(`session_requests/${sessionReq.partner}/${requestId}`)
      .remove()
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Request cancelled successfully",
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
      return res
        .status(400)
        .json({ success: false, message: "requestId and action are required" });
    }

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'accept' or 'decline'",
      });
    }

    const sessionReq =
      await SessionRequest.findById(requestId).populate("user partner");

    if (!sessionReq || sessionReq.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request expired, cancelled or already processed",
      });
    }

    admin
      .database()
      .ref(`session_requests/${partnerId}/${requestId}`)
      .remove()
      .catch(() => {});

    if (action === "decline") {
      sessionReq.status = "rejected";
      await sessionReq.save();

      if (sessionReq.user && sessionReq.user.fcmToken) {
        admin
          .messaging()
          .send({
            token: sessionReq.user.fcmToken,
            notification: {
              title: "Request Declined",
              body: `${sessionReq.partner.name || "Astrologer"} declined your request.`,
            },
            data: {
              type: "REQUEST_REJECTED",
              message: "Astrologer declined your request.",
            },
            android: {
              priority: "high",
              notification: {
                sound: "default",
                defaultSound: true,
                defaultVibrateTimings: true,
                priority: "high",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                },
              },
            },
          })
          .catch(() => {});
      }

      return res
        .status(200)
        .json({ success: true, message: "Request declined successfully" });
    }

    if (action === "accept") {
      sessionReq.status = "accepted";
      sessionReq.startTime = new Date();

      if (sessionReq.type === "chat") {
        const chatRoomId = `chat_${sessionReq.user._id}_${partnerId}_${Date.now()}`;
        sessionReq.chatRoomId = chatRoomId;
        await sessionReq.save();

        // 1. Realtime Database me banayein
        admin
          .database()
          .ref(`chats/${chatRoomId}`)
          .set({
            user: sessionReq.user._id.toString(),
            partner: partnerId,
            status: "active",
            createdAt: Date.now(),
          })
          .catch(() => {});

        // 2. ✅ FIRESTORE me conversation document banayein (ZAROORI)
        await admin
          .firestore()
          .collection("conversations")
          .doc(chatRoomId)
          .set(
            {
              id: chatRoomId,
              status: "active",
              participants: [
                partnerId.toString(),
                sessionReq.user._id.toString(),
              ],
              userId: sessionReq.user._id.toString(),
              partnerId: partnerId.toString(),
              clientName: sessionReq.user.fullName || "Client",
              partnerName: sessionReq.partner.name || "Astrologer",
              sessionType: "chat",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
          .catch((err) => console.log("Firestore conversation create error:", err));

        if (sessionReq.user && sessionReq.user.fcmToken) {
          admin
            .messaging()
            .send({
              token: sessionReq.user.fcmToken,
              notification: {
                title: "Request Accepted",
                body: `${sessionReq.partner.name || "Astrologer"} accepted your chat request.`,
              },
              data: {
                type: "REQUEST_ACCEPTED",
                sessionType: "chat",
                chatRoomId: chatRoomId,
                requestId: sessionReq._id.toString(),
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  defaultSound: true,
                  defaultVibrateTimings: true,
                  priority: "high",
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                  },
                },
              },
            })
            .catch(() => {});
        }

        return res.status(200).json({
          success: true,
          message: "Chat request accepted",
          chatRoomId,
          sessionType: "chat",
        });
      }

      if (sessionReq.type === "call") {
        const durationMinutes = sessionReq.durationMinutes || 5;
        const timeLimitSec = durationMinutes * 60;

        const userWallet = sessionReq.user.walletBalance || 0;
        const requiredAmount = durationMinutes * (sessionReq.ratePerMin || 10);

        if (userWallet < requiredAmount) {
          return res.status(400).json({
            success: false,
            message:
              "User wallet balance has dropped below required amount for this call duration.",
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
            error: callResult.error,
          });
        }

        sessionReq.exotelCallSid = callResult.callSid;
        await sessionReq.save();

        if (sessionReq.user && sessionReq.user.fcmToken) {
          admin
            .messaging()
            .send({
              token: sessionReq.user.fcmToken,
              notification: {
                title: "Call Connecting",
                body: `${sessionReq.partner.name || "Astrologer"} accepted your call. Connecting now.`,
              },
              data: {
                type: "REQUEST_ACCEPTED",
                sessionType: "call",
                requestId: sessionReq._id.toString(),
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  defaultSound: true,
                  defaultVibrateTimings: true,
                  priority: "high",
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                  },
                },
              },
            })
            .catch(() => {});
        }

        return res.status(200).json({
          success: true,
          message: `Voice call connecting via Exotel for ${durationMinutes} minutes`,
          callSid: callResult.callSid,
          sessionType: "call",
        });
      }
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid action or request type" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// const handleExotelCallWebhook = async (req, res) => {
//   try {
//     const payload = { ...req.query, ...req.body };
//     const requestId = payload.requestId;
//     const callSid = payload.CallSid || payload.Sid;

//     let sessionReq = null;
//     if (requestId) {
//       sessionReq = await SessionRequest.findById(requestId);
//     } else if (callSid) {
//       sessionReq = await SessionRequest.findOne({ exotelCallSid: callSid });
//     }

//     if (!sessionReq) {
//       return res.status(200).send("NO_SESSION_FOUND");
//     }

//     // Agar call pehle hi completed ya failed hai, toh dubara process mat karo (Duplicate webhook prevention)
//     if (sessionReq.status === "completed" || sessionReq.status === "failed") {
//       return res.status(200).send("ALREADY_PROCESSED");
//     }

//     const callStatus = (payload.Status || payload.CallStatus || 'completed').toLowerCase();

//     // Exotel se duration nikalne ki koshish karein
//     let rawSec = parseInt(
//       payload.ConversationDuration ||
//       payload.RecordingDuration ||
//       payload.DialCallDuration ||
//       payload.Duration ||
//       payload.CallDuration ||
//       0,
//       10
//     );

//     let durationInSeconds = isNaN(rawSec) ? 0 : Math.max(0, rawSec);

//     // 🔥 MAIN FIX: Agar Exotel 0 duration bhej raha hai, toh hum khud startTime se calculate karenge
//     if (durationInSeconds === 0 && sessionReq.startTime) {
//       const start = new Date(sessionReq.startTime).getTime();
//       const end = new Date().getTime();
//       durationInSeconds = Math.max(1, Math.floor((end - start) / 1000));
//     }

//     // Agar call cancel, busy ya no-answer thi ya duration bilkul kam hai
//     if (durationInSeconds <= 5 || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'failed') {
//       sessionReq.status = 'failed';
//       sessionReq.endTime = new Date();
//       sessionReq.durationInSeconds = 0;
//       sessionReq.durationMinutes = 0;
//       sessionReq.totalDeductedAmount = 0;
//       await sessionReq.save();
//       return res.status(200).send("CALL_FAILED_OR_TOO_SHORT");
//     }

//     // 🧮 EXACT PER-MINUTE CALCULATION (Jaise 65 sec = 2 min)
//     let durationMinutes = Math.ceil(durationInSeconds / 60);
//     const ratePerMin = Number(sessionReq.ratePerMin || 10);
//     let totalDeductedAmount = durationMinutes * ratePerMin;

//     sessionReq.status = "completed";
//     sessionReq.endTime = new Date();
//     sessionReq.durationInSeconds = durationInSeconds;
//     sessionReq.durationMinutes = durationMinutes;
//     sessionReq.totalDeductedAmount = totalDeductedAmount;
//     sessionReq.callStatus = callStatus;

//     if (payload.RecordingUrl) {
//       sessionReq.recordingUrl = payload.RecordingUrl;
//     }

//     await sessionReq.save();

//     // 💰 EXACT WALLET DEDUCTION (Sirf ek baar chalega)
//     if (totalDeductedAmount > 0) {
//       await User.findByIdAndUpdate(sessionReq.user, {
//         $inc: { walletBalance: -totalDeductedAmount },
//       });

//       await Partner.findByIdAndUpdate(sessionReq.partner, {
//         $inc: { walletBalance: totalDeductedAmount },
//       });
//     }

//     console.log(`>>> REVENUE CAPTURED! RequestId: ${requestId}, Duration: ${durationInSeconds}s (${durationMinutes} mins), Deducted: ₹${totalDeductedAmount} <<<`);

//     return res.status(200).send("OK");
//   } catch (error) {
//     console.error("Exotel Webhook Error:", error.message);
//     return res.status(500).send(error.message);
//   }
// };

const endSession = async (req, res) => {
  try {
    const { requestId, conversationId, chatRoomId } = req.body;
    console.log("👉 /end API Call aayi, Body:", req.body);

    const targetId = requestId || conversationId || chatRoomId;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "requestId, conversationId, or chatRoomId is required",
      });
    }

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(targetId);
    let sessionReq = await SessionRequest.findOne({
      $or: [
        ...(isMongoId ? [{ _id: targetId }] : []),
        { chatRoomId: targetId },
      ],
    }).populate("partner user");

    if (!sessionReq) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (sessionReq.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Session already ended",
        durationMinutes: sessionReq.durationMinutes,
        totalDeductedAmount: sessionReq.totalDeductedAmount,
      });
    }

    const endTime = new Date();
    const startTime = sessionReq.startTime ? new Date(sessionReq.startTime) : endTime;
    
    // Seconds calculate karein
    let durationInSeconds = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
    let durationMinutes = Math.ceil(durationInSeconds / 60);

    const ratePerMin = Number(sessionReq.ratePerMin || 10);
    let totalDeductedAmount = durationMinutes * ratePerMin;

    sessionReq.status = "completed";
    sessionReq.endTime = endTime;
    sessionReq.durationInSeconds = durationInSeconds;
    sessionReq.durationMinutes = durationMinutes;
    sessionReq.totalDeductedAmount = totalDeductedAmount;
    await sessionReq.save();

    // Wallet balance update
    if (totalDeductedAmount > 0) {
      if (sessionReq.user) {
        await User.findByIdAndUpdate(sessionReq.user._id, {
          $inc: { walletBalance: -totalDeductedAmount },
        });
      }
      if (sessionReq.partner) {
        await Partner.findByIdAndUpdate(sessionReq.partner._id, {
          $inc: { walletBalance: totalDeductedAmount },
        });
      }
    }

    const currentUserId = req.user?.id || req.user?._id;
    const isUser = sessionReq.user && currentUserId && currentUserId.toString() === sessionReq.user._id.toString();
    const endedBy = isUser ? "user" : "partner";
    const activeRoomId = sessionReq.chatRoomId || targetId;

    if (activeRoomId) {
      await admin.firestore().collection("conversations").doc(activeRoomId).set({
        status: "ended",
        endedBy: endedBy,
        durationMinutes: durationMinutes,
        totalEarned: totalDeductedAmount,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});

      admin.database().ref(`chats/${activeRoomId}`).update({
        status: "ended",
        durationMinutes: durationMinutes,
        totalEarned: totalDeductedAmount,
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Session ended successfully",
      durationMinutes,
      totalDeductedAmount,
    });
  } catch (error) {
    console.error("❌ endSession Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPartnerPendingRequests = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const requests = await SessionRequest.find({
      partner: partnerId,
      status: "pending",
    })
      .populate("user", "fullName profilePic mobile walletBalance")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPartnerAcceptedRequests = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { status } = req.query;

    const filterStatus = status || "accepted";

    const acceptedRequests = await SessionRequest.find({
      partner: partnerId,
      status: filterStatus,
    })
      .populate("user", "fullName profilePic mobile walletBalance")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: acceptedRequests.length,
      requests: acceptedRequests,
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
      user: userId,
    }).populate("partner", "name profilePic minRate mobile");

    if (!sessionReq) {
      return res.status(404).json({
        success: false,
        message: "Session request not found",
      });
    }

    return res.status(200).json({
      success: true,
      status: sessionReq.status,
      request: sessionReq,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const getSessionSummary = async (req, res) => {
  try {
    const { requestId } = req.params;

    const sessionReq = await SessionRequest.findById(requestId)
      .populate("partner", "fullName mobile avatar name")
      .populate("user", "fullName mobile");

    if (!sessionReq) {
      return res.status(404).json({ success: false, message: "Session request not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        requestId: sessionReq._id,
        type: sessionReq.type, 
        status: sessionReq.status, 
        durationMinutes: sessionReq.durationMinutes || 0, 
        durationInSeconds: sessionReq.durationInSeconds || 0,
        ratePerMin: sessionReq.ratePerMin || 10,
        totalDeductedAmount: sessionReq.totalDeductedAmount || 0, 
        partnerName: sessionReq.partner?.fullName || sessionReq.partner?.name,
        userName: sessionReq.user?.fullName,
        recordingUrl: sessionReq.recordingUrl || null,
        createdAt: sessionReq.createdAt,
        endTime: sessionReq.endTime
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



const checkCallStatusAndSummary = async (req, res) => {
  try {
    const { requestId } = req.params;

    const sessionReq = await SessionRequest.findById(requestId)
      .populate("partner", "fullName mobile avatar name")
      .populate("user", "fullName mobile");

    if (!sessionReq) {
      return res.status(404).json({ success: false, message: "Session request not found" });
    }

  
    if (sessionReq.status === "accepted") {
      return res.status(200).json({
        success: true,
        isCallActive: true, 
        status: sessionReq.status,
        message: "Call is currently active..."
      });
    }


    return res.status(200).json({
      success: true,
      isCallActive: false, 
      data: {
        requestId: sessionReq._id,
        type: sessionReq.type,
        status: sessionReq.status, // 'completed' ya 'failed'
        durationMinutes: sessionReq.durationMinutes || 0,
        durationInSeconds: sessionReq.durationInSeconds || 0,
        ratePerMin: sessionReq.ratePerMin || 10,
        totalDeductedAmount: sessionReq.totalDeductedAmount || 0,
        partnerName: sessionReq.partner?.fullName || sessionReq.partner?.name,
        userName: sessionReq.user?.fullName,
        recordingUrl: sessionReq.recordingUrl || null,
        createdAt: sessionReq.createdAt,
        endTime: sessionReq.endTime
      }
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
  getPartnerAcceptedRequests,
  getUserRequestStatus,
  getSessionSummary,
  checkCallStatusAndSummary
};