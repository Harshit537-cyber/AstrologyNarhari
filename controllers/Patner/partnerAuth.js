const jwt = require("jsonwebtoken");
const fs = require("fs");
const Partner = require("../../models/Partner/Partner");
const User = require("../../models/User");
const cloudinary = require("../../config/cloudinary");
const admin = require("../../config/firebase");
const Booking = require("../../models/Booking/Booking");
const {
  DEACTIVATION_REASONS,
  ALLOWED_DURATIONS,
} = require("../../utils/deactivationReasons");
const mongoose = require("mongoose");

const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return result.secure_url;
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw error;
  }
};

const cleanUploadedFiles = (files) => {
  if (!files) return;
  if (
    files.profilePic &&
    files.profilePic[0] &&
    fs.existsSync(files.profilePic[0].path)
  ) {
    fs.unlinkSync(files.profilePic[0].path);
  }
  if (files.additionalPhotos) {
    files.additionalPhotos.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    // Request body se role bhi accept kar rahe hain
    const {
      idToken,
      mobile: bodyMobile,
      role,
      firebaseUid: bodyUid,
    } = req.body;
    let mobile;
    let firebaseUid = bodyUid;

    // Firebase Token verification
    if (idToken) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      mobile = decodedToken.phone_number;
      firebaseUid = decodedToken.uid;
    } else if (bodyMobile) {
      mobile = bodyMobile;
    }

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID Token or Mobile number is required",
      });
    }

    let partner = await Partner.findOne({ mobile });

    // User role set karna (request body se ya default 'partner')
    const assignedRole = role || (partner ? partner.role : "partner");

    if (!partner) {
      // New Partner Creation
      partner = await Partner.create({
        mobile,
        role: assignedRole,
        isVerified: true,
        firebaseUid: firebaseUid,
      });
    } else {
      // Update Existing Partner
      partner.isVerified = true;
      if (role) {
        partner.role = role; // Agar request me role bheja gaya hai to update karein
      }
      if (firebaseUid) {
        partner.firebaseUid = firebaseUid;
      }
      await partner.save();
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: partner._id, role: partner.role },
      process.env.JWT_SECRET || "SECRET_KEY_123",
      { expiresIn: "7d" },
    );

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      token,
      data: {
        id: partner._id,
        mobile: partner.mobile,
        role: partner.role, // Response me role include kiya gaya hai
        isProfileComplete: partner.isProfileComplete,
        profileApprovalStatus: partner.profileApprovalStatus,
        isActive: partner.isActive,
        firebaseUid: partner.firebaseUid,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired Firebase token",
      error: error.message,
    });
  }
};

const register = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user.id);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    if (partner.isProfileComplete) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({ message: "Profile is already completed." });
    }

    const {
      fullName,
      dateOfBirth,
      gender,
      city,
      specialties,
      languages,
      experience,
      qualification,
      expectedSalary,
      minRate,
      bio,
      categories,
    } = req.body;

    let profilePicUrl = partner.profilePic;
    if (req.files?.profilePic?.[0]) {
      profilePicUrl = await uploadToCloudinary(
        req.files.profilePic[0].path,
        "partners/profiles",
      );
    }

    let additionalPhotosUrls = partner.additionalPhotos || [];
    if (req.files?.additionalPhotos) {
      const uploadPromises = req.files.additionalPhotos.map((file) =>
        uploadToCloudinary(file.path, "partners/gallery"),
      );
      const uploadedUrls = await Promise.all(uploadPromises);
      additionalPhotosUrls = [...additionalPhotosUrls, ...uploadedUrls].slice(
        0,
        4,
      );
    }

    partner.fullName = fullName;
    partner.profilePic = profilePicUrl;
    partner.dateOfBirth = dateOfBirth;
    partner.gender = gender;
    partner.city = city;
    partner.specialties =
      typeof specialties === "string" ? JSON.parse(specialties) : specialties;
    partner.languages =
      typeof languages === "string" ? JSON.parse(languages) : languages;
    partner.categories =
      typeof categories === "string" ? JSON.parse(categories) : categories;
    partner.experience = experience;
    partner.qualification = qualification;
    partner.expectedSalary = expectedSalary;
    partner.minRate = minRate ? Number(minRate) : partner.minRate;
    partner.additionalPhotos = additionalPhotosUrls;
    partner.bio = bio;
    partner.isProfileComplete = true;
    partner.profileApprovalStatus = "Pending";

    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Partner profile updated successfully",
      partner,
    });
  } catch (error) {
    cleanUploadedFiles(req.files);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const filePath = req.file ? req.file.path : null;

  try {
    const partnerId = req.user.id;
    const { fullName, specialties, languages, experience, minRate, bio } =
      req.body;

    let partner = await Partner.findById(partnerId);
    if (!partner) {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    if (fullName !== undefined) partner.fullName = fullName;
    if (experience !== undefined) partner.experience = Number(experience);
    if (minRate !== undefined) partner.minRate = Number(minRate);
    if (bio !== undefined) partner.bio = bio;

    if (specialties !== undefined) {
      partner.specialties =
        typeof specialties === "string" ? JSON.parse(specialties) : specialties;
    }

    if (languages !== undefined) {
      partner.languages =
        typeof languages === "string" ? JSON.parse(languages) : languages;
    }

    if (filePath && fs.existsSync(filePath)) {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "partners/profiles",
      });
      partner.profilePic = result.secure_url;
      fs.unlinkSync(filePath);
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: partner,
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user.id);

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Partner profile retrieved successfully",
      partner,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a deletion reason" });
    }

    const partner = await Partner.findByIdAndDelete(req.user.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const { reason, reasonNote, duration } = req.body;

    if (!reason || !DEACTIVATION_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Reason must be one of: ${DEACTIVATION_REASONS.join(", ")}`,
      });
    }

    if (duration && !ALLOWED_DURATIONS.includes(Number(duration))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid deactivation duration" });
    }

    const partner = await Partner.findById(req.user.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const now = new Date();
    partner.isActive = false;
    partner.deactivatedBy = "self";
    partner.deactivatedAt = now;
    partner.deactivationReason = reason;
    partner.deactivationReasonNote = reasonNote || null;
    partner.deactivationDuration = duration ? Number(duration) : null;
    partner.reactivateAt = duration
      ? new Date(now.getTime() + Number(duration) * 24 * 60 * 60 * 1000)
      : null;

    await partner.save();

    return res
      .status(200)
      .json({
        success: true,
        message: "Account deactivated successfully",
        data: partner,
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const activateAccount = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    if (partner.deactivatedBy === "admin") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Account deactivated by admin. Contact support.",
        });
    }

    partner.isActive = true;
    partner.deactivatedBy = null;
    partner.deactivatedAt = null;
    partner.reactivateAt = null;
    partner.deactivationReason = null;
    partner.deactivationReasonNote = null;
    partner.deactivationDuration = null;

    await partner.save();

    return res
      .status(200)
      .json({ success: true, message: "Account reactivated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getLiveAstrologers = async (req, res) => {
  try {
    let query = {
      isVerified: true,
      isProfileComplete: true,
      profileApprovalStatus: "Approved",
      kycStatus: "Approved",
    };

    const { specialty, language, gender, search, sortBy } = req.query;

    if (specialty) query.specialties = { $in: [specialty] };
    if (language) query.languages = { $in: [language] };
    if (gender) query.gender = gender;
    if (search) query.fullName = { $regex: search, $options: "i" };

    let sortOption = {};
    if (sortBy === "experience") sortOption = { experience: -1 };
    else if (sortBy === "rating") sortOption = { averageRating: -1 };
    else if (sortBy === "price_low") sortOption = { minRate: 1 };
    else if (sortBy === "price_high") sortOption = { minRate: -1 };
    else sortOption = { isOnline: -1, averageRating: -1 };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const astrologers = await Partner.find(query)
      .select(
        "fullName profilePic specialties languages experience minRate averageRating totalReviews isOnline isBusy bio",
      )
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await Partner.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: astrologers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: astrologers,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching live astrologers",
        error: error.message,
      });
  }
};

const updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!fcmToken) {
      return res
        .status(400)
        .json({ success: false, message: "FCM Token is required" });
    }

    let updatedUser;
    if (role === "partner") {
      updatedUser = await Partner.findByIdAndUpdate(
        userId,
        { fcmToken },
        { new: true },
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { fcmToken },
        { new: true },
      );
    }

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User/Partner not found" });
    }

    res
      .status(200)
      .json({
        success: true,
        message: `FCM Token updated successfully for ${role}`,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const logoutPartner = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role === "partner") {
      await Partner.findByIdAndUpdate(userId, { fcmToken: null });
    } else {
      await User.findByIdAndUpdate(userId, { fcmToken: null });
    }

    res
      .status(200)
      .json({ success: true, message: "Logged out and FCM token removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

const getTopAstrologers = async (req, res) => {
  try {
    let query = {
      profileApprovalStatus: "Approved",
      isVerified: true,
      isProfileComplete: true,
    };

    const topAstrologers = await Partner.find(query)
      .select(
        "fullName profilePic specialties experience averageRating totalReviews minRate isOnline languages",
      )
      .sort({
        isTopAstrologer: -1,
        averageRating: -1,
        totalReviews: -1,
      })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      count: topAstrologers.length,
      data: topAstrologers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const partner = await Partner.findById(partnerId).select("averageRating");
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const totalConsults = await Booking.countDocuments({
      partner: partnerId,
      status: "completed",
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayRevenueAggregate = await Booking.aggregate([
      {
        $match: {
          partner: new mongoose.Types.ObjectId(partnerId),
          status: "completed",
          updatedAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalFee" },
        },
      },
    ]);

    const todayRevenue =
      todayRevenueAggregate.length > 0
        ? todayRevenueAggregate[0].totalRevenue
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalConsults,
        todayRevenue,
        rating: partner.averageRating || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};

const getRecentConsultations = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const consultations = await Booking.find({
      partner: partnerId,
      status: "completed",
    })
      .populate("user", "fullName profilePic mobile gender")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments({
      partner: partnerId,
      status: "completed",
    });

    return res.status(200).json({
      success: true,
      count: consultations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: consultations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching recent consultations",
      error: error.message,
    });
  }
};

const getAstrologerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Astrologer ID format",
      });
    }
    const astrologer = await Partner.findById(id);
    if (!astrologer) {
      return res.status(404).json({
        success: false,
        message: "Astrologer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: astrologer,
    });
  } catch (error) {
    console.error("Error fetching astrologer:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getUpcomingBookings = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const bookings = await Booking.find({
      partner: partnerId,
      status: { $in: ["pending", "accepted"] },
    })
      .populate("user", "fullName profilePic mobile gender")
      .sort({ date: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching upcoming bookings",
      error: error.message,
    });
  }
};

const getPartnerReviews = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Booking.find({
      partner: partnerId,
      rating: { $ne: null },
    })
      .select("user rating review updatedAt mode duration")
      .populate("user", "fullName profilePic")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments({
      partner: partnerId,
      rating: { $ne: null },
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

const updateMinRate = async (req, res) => {
  try {
    const { minRate } = req.body;

    if (
      minRate === undefined ||
      minRate === null ||
      isNaN(minRate) ||
      Number(minRate) < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a valid minRate" });
    }

    const partner = await Partner.findById(req.user.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    partner.requestedMinRate = Number(minRate);
    partner.minRateApprovalStatus = "Pending";
    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Minimum rate update request submitted for admin approval",
      data: {
        minRate: partner.minRate,
        requestedMinRate: partner.requestedMinRate,
        minRateApprovalStatus: partner.minRateApprovalStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMinRate = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user.id).select(
      "minRate requestedMinRate minRateApprovalStatus",
    );
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        minRate: partner.minRate || 0,
        requestedMinRate: partner.requestedMinRate || null,
        minRateApprovalStatus: partner.minRateApprovalStatus || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deletePartnerByMobile = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const partner = await Partner.findOne({ mobile });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found with this mobile number",
      });
    }

    await Partner.deleteOne({ _id: partner._id });

    return res.status(200).json({
      success: true,
      message: "Partner account deleted successfully",
      data: {
        id: partner._id,
        mobile: partner.mobile,
      },
    });
  } catch (error) {
    console.error("Delete Partner Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete partner account",
      error: error.message,
    });
  }
};

module.exports = {
  verifyOtp,
  register,
  updateProfile,
  getProfile,
  deleteAccount,
  deactivateAccount,
  activateAccount,
  getLiveAstrologers,
  updateFCMToken,
  getTopAstrologers,
  getAstrologerById,
  getDashboardStats,
  getRecentConsultations,
  getUpcomingBookings,
  getPartnerReviews,
  updateMinRate,
  getMinRate,
  logoutPartner,
  deletePartnerByMobile
};
