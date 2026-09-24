const mongoose = require("mongoose");
const ConsultationRating = require("../../models/ConsultationRating/ConsultationRating");
const Partner = require("../../models/Partner/Partner");
const Booking = require("../../models/Booking/Booking");
const SessionRequest = require("../../models/SessionRequest/SessionRequest");

const updatePartnerAverageRating = async (partnerId) => {
  try {
    const stats = await ConsultationRating.aggregate([
      { $match: { partner: new mongoose.Types.ObjectId(partnerId.toString()) } },
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
  } catch (err) {}
};

const createConsultationRating = async (req, res) => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const { serviceType, referenceId, rating, feedback } = req.body || {};
    let partnerId = req.body?.partnerId;

    if (!serviceType || !referenceId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: "serviceType, referenceId, and rating are required",
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    let sessionDoc = null;

    if (["call", "video_call", "chat"].includes(serviceType)) {
      sessionDoc = await Booking.findById(referenceId);
      if (!sessionDoc) {
        return res.status(404).json({
          success: false,
          message: `Booking not found with ID: ${referenceId}`,
        });
      }
    } else if (["instant_call", "instant_chat"].includes(serviceType)) {
      sessionDoc = await SessionRequest.findById(referenceId);
      if (!sessionDoc) {
        return res.status(404).json({
          success: false,
          message: `Instant session not found with ID: ${referenceId}`,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid serviceType",
      });
    }

    const actualPartnerId = sessionDoc.partner?._id?.toString() || sessionDoc.partner?.toString();
    if (!partnerId) {
      partnerId = actualPartnerId;
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
      partner: partnerId || actualPartnerId,
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

    await updatePartnerAverageRating(partnerId || actualPartnerId);

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

const getPartnerOverallRatingById = async (req, res) => {
  try {
    const { partnerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid partnerId format",
      });
    }

    const partner = await Partner.findById(partnerId).select("averageRating totalReviews");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      partnerId: partner._id,
      overallRating: {
        averageRating: partner.averageRating || 0,
        totalReviews: partner.totalReviews || 0,
      },
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
    const partnerId = req.user?._id?.toString() || req.user?.id?.toString();
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
  getPartnerOverallRatingById,
  getPartnerRatingHistory,
  getAdminAllConsultationRatings,
  getAdminAstrologersRatingList,
};