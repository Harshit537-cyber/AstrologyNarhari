const mongoose = require("mongoose");
const ConsultationRating = require("../../models/ConsultationRating/ConsultationRating");
const Partner = require("../../models/Partner/Partner");
const Booking = require("../../models/Booking/Booking");
const SessionRequest = require("../../models/SessionRequest/SessionRequest");

const updatePartnerAverageRating = async (partnerId) => {
  const stats = await ConsultationRating.aggregate([
    { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
    {
      $group: {
        _id: "$partner",
        totalRatings: { $sum: 1 },
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await Partner.findByIdAndUpdate(partnerId, {
      averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
      totalReviews: stats[0].totalRatings,
    });
  } else {
    await Partner.findByIdAndUpdate(partnerId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

const createConsultationRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId, serviceType, referenceId, rating, feedback } = req.body;

    if (!partnerId || !serviceType || !referenceId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: "partnerId, serviceType, referenceId, and rating are required",
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (["call", "video_call", "chat"].includes(serviceType)) {
      const booking = await Booking.findOne({
        _id: referenceId,
        user: userId,
        partner: partnerId,
        status: "completed",
      });
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Completed booking session not found",
        });
      }
    } else if (["instant_call", "instant_chat"].includes(serviceType)) {
      const session = await SessionRequest.findOne({
        _id: referenceId,
        user: userId,
        partner: partnerId,
        status: "completed",
      });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Completed instant session not found",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid serviceType",
      });
    }

    const existingRating = await ConsultationRating.findOne({
      user: userId,
      referenceId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "Rating already submitted for this consultation",
      });
    }

    const newRating = await ConsultationRating.create({
      user: userId,
      partner: partnerId,
      serviceType,
      referenceId,
      rating: numRating,
      feedback: feedback || "",
    });

    if (["call", "video_call", "chat"].includes(serviceType)) {
      await Booking.findByIdAndUpdate(referenceId, {
        rating: numRating,
        review: feedback || "",
      });
    }

    await updatePartnerAverageRating(partnerId);

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      data: newRating,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPartnerRatingHistory = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [partner, ratings, total] = await Promise.all([
      Partner.findById(partnerId).select("averageRating totalReviews"),
      ConsultationRating.find({ partner: partnerId })
        .populate("user", "fullName name profilePic")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConsultationRating.countDocuments({ partner: partnerId }),
    ]);

    return res.status(200).json({
      success: true,
      overallAverageRating: partner ? partner.averageRating || 0 : 0,
      totalRatingsReceived: partner ? partner.totalReviews || 0 : 0,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAdminAllConsultationRatings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { partnerId, serviceType, rating } = req.query;

    let filter = {};
    if (partnerId) filter.partner = partnerId;
    if (serviceType) filter.serviceType = serviceType;
    if (rating) filter.rating = Number(rating);

    const [ratings, total] = await Promise.all([
      ConsultationRating.find(filter)
        .populate("user", "fullName name mobile profilePic")
        .populate("partner", "fullName mobile profilePic averageRating totalReviews")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConsultationRating.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAdminAstrologersRatingList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [astrologers, total] = await Promise.all([
      Partner.find()
        .select("fullName mobile profilePic averageRating totalReviews isOnline")
        .sort({ averageRating: -1, totalReviews: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Partner.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: astrologers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createConsultationRating,
  getPartnerRatingHistory,
  getAdminAllConsultationRatings,
  getAdminAstrologersRatingList,
};