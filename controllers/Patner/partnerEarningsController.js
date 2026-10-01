const express = require("express");
const router = express.Router();
const { verifyToken, isPartner } = require("../../middleware/auth");
const mongoose = require("mongoose");
const SessionRequest = require("../../models/SessionRequest/SessionRequest");
const Booking = require("../../models/Booking/Booking");

const getChatSessionModel = () => mongoose.models.ChatSession || mongoose.model('ChatSession', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    ratePerMinute: { type: Number, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    totalMinutes: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
}, { timestamps: true }));

const getPartnerEarningsSummary = async (req, res) => {
  try {
    const rawId = req.user.id || req.user._id;
    const partnerIdStr = rawId.toString();
    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerIdStr)
      ? new mongoose.Types.ObjectId(partnerIdStr)
      : null;

    const partnerMatch = partnerObjId
      ? { $in: [partnerObjId, partnerIdStr] }
      : partnerIdStr;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const matchFilter = {
      partner: partnerMatch,
      status: "completed",
    };

    const earningExpr = {
      $cond: [
        { $gt: [{ $ifNull: ["$totalDeductedAmount", 0] }, 0] },
        { $toDouble: "$totalDeductedAmount" },
        {
          $multiply: [
            { $toDouble: { $ifNull: ["$ratePerMin", 10] } },
            {
              $cond: [
                { $gt: [{ $toDouble: { $ifNull: ["$durationMinutes", 0] } }, 0] },
                { $toDouble: "$durationMinutes" },
                1,
              ],
            },
          ],
        },
      ],
    };

    const durationSecondsExpr = {
      $cond: [
        { $gt: [{ $toDouble: { $ifNull: ["$durationInSeconds", 0] } }, 0] },
        { $toDouble: "$durationInSeconds" },
        {
          $cond: [
            { $gt: [{ $toDouble: { $ifNull: ["$durationMinutes", 0] } }, 0] },
            { $multiply: [{ $toDouble: "$durationMinutes" }, 60] },
            60,
          ],
        },
      ],
    };

    let summary = await SessionRequest.aggregate([
      { $match: matchFilter },
      {
        $project: {
          earned: earningExpr,
          durationInSeconds: durationSecondsExpr,
          createdAt: 1,
        },
      },
      {
        $facet: {
          lifetime: [
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$earned" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
          today: [
            { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$earned" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
          weekly: [
            { $match: { createdAt: { $gte: startOfWeek, $lte: endOfWeek } } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$earned" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
          monthly: [
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$earned" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
        },
      },
    ]);

    const ChatSession = getChatSessionModel();
    const chatSummary = await ChatSession.aggregate([
      {
        $match: {
          partnerId: partnerMatch,
          status: "completed",
        },
      },
      {
        $project: {
          totalAmount: { $toDouble: { $ifNull: ["$totalAmount", 0] } },
          durationInSeconds: { $multiply: [{ $toDouble: { $ifNull: ["$totalMinutes", 0] } }, 60] },
          createdAt: 1,
        },
      },
      {
        $facet: {
          lifetime: [
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$totalAmount" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
          today: [
            { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$totalAmount" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
          weekly: [
            { $match: { createdAt: { $gte: startOfWeek, $lte: endOfWeek } } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$totalAmount" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
          monthly: [
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$totalAmount" },
                totalSessions: { $sum: 1 },
                totalSeconds: { $sum: "$durationInSeconds" },
              },
            },
          ],
        },
      },
    ]);

    const combineFacets = (k) => {
      const base = summary[0]?.[k]?.[0] || { totalEarnings: 0, totalSessions: 0, totalSeconds: 0 };
      const chat = chatSummary[0]?.[k]?.[0] || { totalEarnings: 0, totalSessions: 0, totalSeconds: 0 };
      return [{
        _id: null,
        totalEarnings: (base.totalEarnings || 0) + (chat.totalEarnings || 0),
        totalSessions: (base.totalSessions || 0) + (chat.totalSessions || 0),
        totalSeconds: (base.totalSeconds || 0) + (chat.totalSeconds || 0)
      }];
    };

    summary = [{
      lifetime: combineFacets('lifetime'),
      today: combineFacets('today'),
      weekly: combineFacets('weekly'),
      monthly: combineFacets('monthly'),
    }];

    const formatData = (item) => ({
      totalEarnings: Math.round((item?.totalEarnings || 0) * 100) / 100,
      totalSessions: item?.totalSessions || 0,
      totalMinutes: Math.ceil((item?.totalSeconds || 0) / 60),
    });

    return res.status(200).json({
      success: true,
      data: {
        lifetime: formatData(summary[0]?.lifetime[0]),
        today: formatData(summary[0]?.today[0]),
        thisWeek: formatData(summary[0]?.weekly[0]),
        thisMonth: formatData(summary[0]?.monthly[0]),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching earnings summary",
      error: error.message,
    });
  }
};

const getPartnerEarningsGraph = async (req, res) => {
  try {
    const rawId = req.user.id || req.user._id;
    const partnerIdStr = rawId.toString();
    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerIdStr)
      ? new mongoose.Types.ObjectId(partnerIdStr)
      : null;

    const partnerMatch = partnerObjId
      ? { $in: [partnerObjId, partnerIdStr] }
      : partnerIdStr;

    const { period = "daily", type } = req.query;

    let groupFormat = "%Y-%m-%d";
    let limitCount = 30;

    if (period === "weekly") {
      groupFormat = "%Y-W%V";
      limitCount = 12;
    } else if (period === "monthly") {
      groupFormat = "%Y-%m";
      limitCount = 12;
    }

    const matchQuery = {
      partner: partnerMatch,
      status: "completed",
    };

    if (type) {
      matchQuery.type = type;
    }

    let analytics = [];
    if (!type || type === 'call') {
      analytics = await SessionRequest.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: groupFormat, date: "$createdAt" },
            },
            earnings: { 
              $sum: { 
                $cond: [
                  { $gt: [{ $ifNull: ["$totalDeductedAmount", 0] }, 0] },
                  { $toDouble: "$totalDeductedAmount" },
                  { $multiply: [{ $toDouble: { $ifNull: ["$ratePerMin", 10] } }, { $toDouble: { $ifNull: ["$durationMinutes", 1] } }] }
                ] 
              } 
            },
            sessionsCount: { $sum: 1 },
            totalSeconds: { $sum: { $toDouble: { $ifNull: ["$durationInSeconds", 60] } } },
          },
        },
      ]);
    }

    const ChatSession = getChatSessionModel();
    if (ChatSession && (!type || type === 'chat')) {
      const chatAnalytics = await ChatSession.aggregate([
        {
          $match: {
            partnerId: partnerMatch,
            status: "completed",
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupFormat, date: "$createdAt" },
            },
            earnings: { $sum: { $toDouble: { $ifNull: ["$totalAmount", 0] } } },
            sessionsCount: { $sum: 1 },
            totalSeconds: { $sum: { $multiply: [{ $toDouble: { $ifNull: ["$totalMinutes", 0] } }, 60] } },
          },
        },
      ]);

      const analyticsMap = new Map();
      [...analytics, ...chatAnalytics].forEach(item => {
        if (!item._id) return;
        if (analyticsMap.has(item._id)) {
          const existing = analyticsMap.get(item._id);
          existing.earnings += item.earnings;
          existing.sessionsCount += item.sessionsCount;
          existing.totalSeconds += item.totalSeconds;
        } else {
          analyticsMap.set(item._id, { ...item });
        }
      });

      analytics = Array.from(analyticsMap.values());
    }

    const formattedAnalytics = analytics.map(item => ({
      period: item._id,
      earnings: Math.round((item.earnings || 0) * 100) / 100,
      sessionsCount: item.sessionsCount,
      totalMinutes: Math.ceil((item.totalSeconds || 0) / 60),
    }));

    formattedAnalytics.sort((a, b) => b.period.localeCompare(a.period));
    const finalData = formattedAnalytics.slice(0, limitCount);

    return res.status(200).json({
      success: true,
      period,
      data: finalData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching graph data",
      error: error.message,
    });
  }
};

// FIXED: Ab agar koi period ya startDate nahi aayega, tab bhi lifetime ki saari history aayegi!
const getCallWiseEarnings = async (req, res) => {
  try {
    const rawId = req.user.id || req.user._id;
    const partnerIdStr = rawId.toString();
    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerIdStr)
      ? new mongoose.Types.ObjectId(partnerIdStr)
      : null;

    const partnerMatch = partnerObjId
      ? { $in: [partnerObjId, partnerIdStr] }
      : partnerIdStr;

    const {
      type,
      period,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      partner: partnerMatch,
      status: "completed",
    };

    const chatQuery = {
      partnerId: partnerMatch,
      status: "completed",
    };

    const now = new Date();

    // Date filters tabhi lagenge jab explicitly bheja jaye
    if (startDate || endDate) {
      query.createdAt = {};
      chatQuery.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
        chatQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
        chatQuery.createdAt.$lte = end;
      }
    } else if (period === "daily") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
      chatQuery.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (period === "weekly") {
      const currentDay = now.getDay();
      const diff = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      query.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
      chatQuery.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (period === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
      chatQuery.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    let sessionCalls = [];
    if (!type || type === 'call') {
      sessionCalls = await SessionRequest.find(query)
        .populate("user", "fullName profilePic mobile")
        .lean();
    }

    let chatCalls = [];
    const ChatSession = getChatSessionModel();
    if (ChatSession && (!type || type === 'chat')) {
      chatCalls = await ChatSession.find(chatQuery)
        .populate("userId", "fullName profilePic mobile")
        .lean();
    }

    const formattedSessionCalls = sessionCalls.map((call) => {
      const durationSeconds = Number(call.durationInSeconds) || 0;
      const minutes = durationSeconds > 0 ? Math.ceil(durationSeconds / 60) : Number(call.durationMinutes) || 0;
      const rate = Number(call.ratePerMin) || 10;
      const amount = Number(call.totalDeductedAmount) || (minutes * rate);

      return {
        sessionId: call._id,
        sessionType: call.type || 'call',
        ratePerMin: rate,
        durationInSeconds: durationSeconds,
        durationMinutes: minutes,
        earnedAmount: amount,
        status: call.status,
        startTime: call.startTime || call.createdAt,
        endTime: call.endTime || call.updatedAt,
        createdAt: call.createdAt,
        user: call.user
          ? {
              id: call.user._id,
              name: call.user.fullName || "User",
              mobile: call.user.mobile,
              profilePic: call.user.profilePic || null,
            }
          : null,
      };
    });

    const formattedChatCalls = chatCalls.map((chat) => {
      const minutes = Number(chat.totalMinutes) || 1;
      const durationSeconds = minutes * 60;
      const rate = Number(chat.ratePerMinute) || 5;
      const amount = Number(chat.totalAmount) || (minutes * rate);
      const user = chat.userId;

      return {
        sessionId: chat._id,
        sessionType: 'chat',
        ratePerMin: rate,
        durationInSeconds: durationSeconds,
        durationMinutes: minutes,
        earnedAmount: amount,
        status: chat.status,
        startTime: chat.startTime || chat.createdAt,
        endTime: chat.endTime || chat.updatedAt,
        createdAt: chat.createdAt,
        user: user
          ? {
              id: user._id,
              name: user.fullName || "User",
              mobile: user.mobile,
              profilePic: user.profilePic || null,
            }
          : null,
      };
    });

    let allInteractions = [...formattedSessionCalls, ...formattedChatCalls];
    allInteractions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = allInteractions.length;
    const paginatedInteractions = allInteractions.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: paginatedInteractions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching call details",
      error: error.message,
    });
  }
};

const getCallEarningById = async (req, res) => {
  try {
    const rawId = req.user.id || req.user._id;
    const partnerIdStr = rawId.toString();
    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerIdStr)
      ? new mongoose.Types.ObjectId(partnerIdStr)
      : null;

    const partnerMatch = partnerObjId
      ? { $in: [partnerObjId, partnerIdStr] }
      : partnerIdStr;

    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format",
      });
    }

    const call = await SessionRequest.findOne({
      _id: sessionId,
      partner: partnerMatch,
    })
      .populate("user", "fullName profilePic mobile")
      .lean();

    if (call) {
      const durationSeconds = Number(call.durationInSeconds) || 0;
      const minutes = durationSeconds > 0 ? Math.ceil(durationSeconds / 60) : Number(call.durationMinutes) || 0;
      const rate = Number(call.ratePerMin) || 10;
      const amount = Number(call.totalDeductedAmount) || (minutes * rate);

      return res.status(200).json({
        success: true,
        data: {
          sessionId: call._id,
          sessionType: call.type || 'call',
          ratePerMin: rate,
          durationInSeconds: durationSeconds,
          billedMinutes: minutes,
          earnedAmount: amount,
          status: call.status,
          startTime: call.startTime || call.createdAt,
          endTime: call.endTime || call.updatedAt,
          createdAt: call.createdAt,
          exotelCallSid: call.exotelCallSid || null,
          user: call.user
            ? {
                id: call.user._id,
                name: call.user.fullName || "User",
                mobile: call.user.mobile,
                profilePic: call.user.profilePic || null,
              }
            : null,
        },
      });
    }

    const ChatSession = getChatSessionModel();
    if (ChatSession) {
      const chat = await ChatSession.findOne({
        _id: sessionId,
        partnerId: partnerMatch,
      })
        .populate("userId", "fullName profilePic mobile")
        .lean();

      if (chat) {
        const minutes = Number(chat.totalMinutes) || 1;
        const durationSeconds = minutes * 60;
        const rate = Number(chat.ratePerMinute) || 5;
        const amount = Number(chat.totalAmount) || (minutes * rate);
        const user = chat.userId;

        return res.status(200).json({
          success: true,
          data: {
            sessionId: chat._id,
            sessionType: 'chat',
            ratePerMin: rate,
            durationInSeconds: durationSeconds,
            billedMinutes: minutes,
            earnedAmount: amount,
            status: chat.status,
            startTime: chat.startTime || chat.createdAt,
            endTime: chat.endTime || chat.updatedAt,
            createdAt: chat.createdAt,
            exotelCallSid: null,
            user: user
              ? {
                  id: user._id,
                  name: user.fullName || "User",
                  mobile: user.mobile,
                  profilePic: user.profilePic || null,
                }
              : null,
          },
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: "Call session not found",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching call detail",
      error: error.message,
    });
  }
};

module.exports = {
  getPartnerEarningsSummary,
  getPartnerEarningsGraph,
  getCallWiseEarnings,
  getCallEarningById,
};