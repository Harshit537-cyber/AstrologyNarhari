const mongoose = require("mongoose");
const SessionRequest = require("../../models/SessionRequest/SessionRequest");
const Booking = require("../../models/Booking/Booking");

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
      status: { $in: ["completed", "accepted"] },
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

    const lifetimeData = summary[0]?.lifetime[0];

    if (!lifetimeData || lifetimeData.totalSessions === 0) {
      const bookingDurationExpr = {
        $cond: [
          { $gt: [{ $toDouble: { $ifNull: ["$duration", 0] } }, 0] },
          { $multiply: [{ $toDouble: "$duration" }, 60] },
          60,
        ],
      };

      const bookingSummary = await Booking.aggregate([
        {
          $match: {
            partner: partnerMatch,
            status: "completed",
          },
        },
        {
          $project: {
            totalFee: { $toDouble: { $ifNull: ["$totalFee", 0] } },
            durationInSeconds: bookingDurationExpr,
            updatedAt: 1,
          },
        },
        {
          $facet: {
            lifetime: [
              {
                $group: {
                  _id: null,
                  totalEarnings: { $sum: "$totalFee" },
                  totalSessions: { $sum: 1 },
                  totalSeconds: { $sum: "$durationInSeconds" },
                },
              },
            ],
            today: [
              { $match: { updatedAt: { $gte: startOfToday, $lte: endOfToday } } },
              {
                $group: {
                  _id: null,
                  totalEarnings: { $sum: "$totalFee" },
                  totalSessions: { $sum: 1 },
                  totalSeconds: { $sum: "$durationInSeconds" },
                },
              },
            ],
            weekly: [
              { $match: { updatedAt: { $gte: startOfWeek, $lte: endOfWeek } } },
              {
                $group: {
                  _id: null,
                  totalEarnings: { $sum: "$totalFee" },
                  totalSessions: { $sum: 1 },
                  totalSeconds: { $sum: "$durationInSeconds" },
                },
              },
            ],
            monthly: [
              { $match: { updatedAt: { $gte: startOfMonth, $lte: endOfMonth } } },
              {
                $group: {
                  _id: null,
                  totalEarnings: { $sum: "$totalFee" },
                  totalSessions: { $sum: 1 },
                  totalSeconds: { $sum: "$durationInSeconds" },
                },
              },
            ],
          },
        },
      ]);

      if (bookingSummary[0]?.lifetime[0]?.totalSessions > 0) {
        summary = bookingSummary;
      }
    }

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
      status: { $in: ["completed", "accepted"] },
    };

    if (type) {
      matchQuery.type = type;
    }

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

    const analytics = await SessionRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: "$createdAt" },
          },
          earnings: { $sum: earningExpr },
          sessionsCount: { $sum: 1 },
          totalSeconds: { $sum: durationSecondsExpr },
        },
      },
      {
        $project: {
          period: "$_id",
          earnings: { $round: ["$earnings", 2] },
          sessionsCount: 1,
          totalMinutes: { $ceil: { $divide: ["$totalSeconds", 60] } },
          _id: 0,
        },
      },
      { $sort: { period: -1 } },
      { $limit: limitCount },
    ]);

    return res.status(200).json({
      success: true,
      period,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching graph data",
      error: error.message,
    });
  }
};

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
      status: { $in: ["completed", "accepted"] },
    };

    if (type) {
      query.type = type;
    }

    const now = new Date();

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    } else if (period === "daily") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (period === "weekly") {
      const currentDay = now.getDay();
      const diff = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      query.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (period === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const [calls, total] = await Promise.all([
      SessionRequest.find(query)
        .populate("user", "fullName profilePic mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SessionRequest.countDocuments(query),
    ]);

    const formattedCalls = calls.map((call) => {
      const durationSeconds =
        Number(call.durationInSeconds) ||
        (call.durationMinutes ? Number(call.durationMinutes) * 60 : 60);
      const minutes = Math.ceil(durationSeconds / 60);
      const amount =
        Number(call.totalDeductedAmount) ||
        (call.ratePerMin ? Number(call.ratePerMin) * minutes : 0);

      return {
        sessionId: call._id,
        sessionType: call.type,
        ratePerMin: call.ratePerMin || 0,
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

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: formattedCalls,
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

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call session not found",
      });
    }

    const durationSeconds =
      Number(call.durationInSeconds) ||
      (call.durationMinutes ? Number(call.durationMinutes) * 60 : 60);
    const minutes = Math.ceil(durationSeconds / 60);
    const amount =
      Number(call.totalDeductedAmount) ||
      (call.ratePerMin ? Number(call.ratePerMin) * minutes : 0);

    return res.status(200).json({
      success: true,
      data: {
        sessionId: call._id,
        sessionType: call.type,
        ratePerMin: call.ratePerMin || 0,
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