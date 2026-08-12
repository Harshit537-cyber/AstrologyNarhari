const User = require("../../models/User");
const Partner = require("../../models/Partner/Partner");
const Pandit = require("../../models/Pandit/Pandit");
const Notification = require("../../models/Notification/Notification");
const sendPushNotification = require("../../utils/notificationService");

const sendAdminNotification = async (req, res) => {
  try {
    const { title, body, imageUrl, targetType, targetIds, targetModel } = req.body;

    if (!title || !body || !targetType) {
      return res.status(400).json({
        success: false,
        message: "Title, Body, and Target Type are required",
      });
    }

    let tokens = [];

    if (targetType === "users") {
      const users = await User.find({
        role: "user",
        fcmToken: { $exists: true, $ne: null, $ne: "" },
      }).select("fcmToken");
      tokens = users.map((u) => u.fcmToken);
    } else if (targetType === "partners") {
      const partners = await Partner.find({
        fcmToken: { $exists: true, $ne: null, $ne: "" },
      }).select("fcmToken");
      tokens = partners.map((p) => p.fcmToken);
    } else if (targetType === "pandits") {
      const pandits = await Pandit.find({
        fcmToken: { $exists: true, $ne: null, $ne: "" },
      }).select("fcmToken");
      tokens = pandits.map((p) => p.fcmToken);
    } else if (targetType === "all") {
      const [users, partners, pandits] = await Promise.all([
        User.find({ role: "user", fcmToken: { $exists: true, $ne: null, $ne: "" } }).select("fcmToken"),
        Partner.find({ fcmToken: { $exists: true, $ne: null, $ne: "" } }).select("fcmToken"),
        Pandit.find({ fcmToken: { $exists: true, $ne: null, $ne: "" } }).select("fcmToken"),
      ]);

      const allTokens = [
        ...users.map((u) => u.fcmToken),
        ...partners.map((p) => p.fcmToken),
        ...pandits.map((p) => p.fcmToken),
      ];
      tokens = [...new Set(allTokens)];
    } else if (targetType === "specific") {
      if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0 || !targetModel) {
        return res.status(400).json({
          success: false,
          message: "targetIds (Array) and targetModel ('User', 'Partner', 'Pandit') are required for specific target",
        });
      }

      let Model;
      if (targetModel === "User") Model = User;
      else if (targetModel === "Partner") Model = Partner;
      else if (targetModel === "Pandit") Model = Pandit;

      if (Model) {
        const records = await Model.find({
          _id: { $in: targetIds },
          fcmToken: { $exists: true, $ne: null, $ne: "" },
        }).select("fcmToken");
        tokens = records.map((r) => r.fcmToken);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid targetType",
      });
    }

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No FCM tokens found for the selected target group",
      });
    }

    const notificationPayload = { title, body };
    const dataPayload = imageUrl ? { imageUrl } : {};

    const results = await Promise.allSettled(
      tokens.map((token) => sendPushNotification(token, dataPayload, notificationPayload))
    );

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value !== null) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    const notificationRecord = await Notification.create({
      title,
      body,
      imageUrl: imageUrl || null,
      targetType,
      targetUserIds: targetType === "specific" ? targetIds : [],
      targetModel: targetType === "specific" ? targetModel : undefined,
      successCount,
      failureCount,
      sentBy: req.user ? req.user.id : null,
    });

    return res.status(200).json({
      success: true,
      message: "Push Notification processed successfully",
      stats: {
        totalTokens: tokens.length,
        successCount,
        failureCount,
      },
      data: notificationRecord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error sending notification",
      error: error.message,
    });
  }
};

const getNotificationHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find()
        .populate("sentBy", "name mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification log not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification log deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendAdminNotification,
  getNotificationHistory,
  deleteNotification,
};