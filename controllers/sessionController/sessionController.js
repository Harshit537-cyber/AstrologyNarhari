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
          .catch(() => {});

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
            message: "User wallet balance has dropped below required amount for this call duration.",
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

const endSession = async (req, res) => {
  try {
    const { requestId, conversationId, chatRoomId } = req.body;
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
        durationMinutes: sessionReq.durationMinutes || 0,
        totalDeductedAmount: sessionReq.totalDeductedAmount || 0,
      });
    }

    const endTime = new Date();
    const startTime = sessionReq.startTime ? new Date(sessionReq.startTime) : endTime;
    
    let durationInSeconds = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
    let durationMinutes = Math.ceil(durationInSeconds / 60);

    const ratePerMin = Number(sessionReq.ratePerMin || 10);
    let totalDeductedAmount = durationMinutes * ratePerMin;

    const updatedSession = await SessionRequest.findOneAndUpdate(
      { _id: sessionReq._id, status: { $ne: "completed" } },
      {
        $set: {
          status: "completed",
          endTime: endTime,
          durationInSeconds: durationInSeconds,
          durationMinutes: durationMinutes,
          totalDeductedAmount: totalDeductedAmount
        }
      },
      { new: true }
    );

    if (!updatedSession) {
      const freshReq = await SessionRequest.findById(sessionReq._id);
      return res.status(200).json({
        success: true,
        message: "Session already ended by another process",
        durationMinutes: freshReq?.durationMinutes || durationMinutes,
        totalDeductedAmount: freshReq?.totalDeductedAmount || totalDeductedAmount,
      });
    }

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

// 🔒 TOKEN BASED USER SESSION HISTORY
const getUserSessionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessionRequests = await SessionRequest.find({
      user: userId,
      status: { $in: ["completed", "failed", "rejected"] }
    })
      .populate("partner", "fullName mobile avatar name")
      .populate("user", "fullName mobile")
      .sort({ createdAt: -1 });

    const formattedHistory = sessionRequests.map(sessionReq => ({
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
    }));

    return res.status(200).json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory
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

module.exports = {
  initiateSessionRequest,
  cancelSessionRequest,
  respondToSessionRequest,
  endSession,
  getPartnerPendingRequests,
  getPartnerAcceptedRequests,
  getUserRequestStatus,
  getSessionSummary,
  getUserSessionHistory,
  checkCallStatusAndSummary
};