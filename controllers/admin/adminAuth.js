const jwt = require("jsonwebtoken");
const fs = require("fs");
const User = require("../../models/User.js");
const Partner = require("../../models/Partner/Partner");
const cloudinary = require("../../config/cloudinary");
const admin = require("../../config/firebase");

const verifyOtp = async (req, res) => {
  try {
    const { idToken, mobile: bodyMobile } = req.body;
    let mobile;

    if (idToken) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      mobile = decodedToken.phone_number;
    } else if (bodyMobile) {
      mobile = bodyMobile;
    }

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID Token or Mobile number is required",
      });
    }

    let adminUser = await User.findOne({ mobile });

    if (!adminUser) {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount >= 10) {
        return res.status(400).json({
          success: false,
          message: "Admin registration limit reached. Max 2 admin allowed.",
        });
      }

      adminUser = await User.create({
        mobile,
        role: "admin",
        isActive: true,
      });
    } else {
      if (adminUser.role !== "admin") {
        return res.status(400).json({
          success: false,
          message: "User is not registered as an admin",
        });
      }

      if (!adminUser.isActive) {
        return res.status(403).json({
          success: false,
          message: "This admin account is deactivated",
        });
      }
    }

    const token = jwt.sign(
      {
        id: adminUser._id,
        role: adminUser.role,
      },
      process.env.JWT_SECRET || "secretkey",
      {
        expiresIn: "1d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      token,
      admin: {
        id: adminUser._id,
        mobile: adminUser.mobile,
        name: adminUser.name,
        role: adminUser.role,
        isProfileComplete: !!adminUser.name,
        isActive: adminUser.isActive,
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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const adminUser = await User.findById(req.user.id);
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    adminUser.name = name;
    adminUser.role = "admin";
    adminUser.isActive = true;

    await adminUser.save();

    return res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      admin: adminUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalPartners,
      totalAdmins,
      newUsersToday,
      newPartnersToday,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Partner.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({
        role: "user",
        createdAt: { $gte: today },
      }),
      Partner.countDocuments({
        createdAt: { $gte: today },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalPartners,
        totalAdmins,
        newUsersToday,
        newPartnersToday,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getRecentUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserAnalytics = async (req, res) => {
  try {
    const analytics = await User.aggregate([
      {
        $group: {
          _id: "$role",
          total: {
            $sum: 1,
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const filter = {
      role: "user",
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -otp")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
        profile: user,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      mobile,
      fullName,
      gender,
      zodiac,
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
    } = req.body || {};

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;

    if (fullName) user.fullName = fullName;
    if (gender) user.gender = gender;
    if (zodiac) user.zodiac = zodiac;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (timeOfBirth) user.timeOfBirth = timeOfBirth;
    if (placeOfBirth) user.placeOfBirth = placeOfBirth;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "users/profilePic",
      });
      user.profilePic = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllPartners = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.profileApprovalStatus = status;
    }

    const partners = await Partner.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: partners,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Partner details fetched successfully",
      data: partner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    const {
      fullName,
      mobile,
      dateOfBirth,
      gender,
      city,
      experience,
      qualification,
      expectedSalary,
      bio,
      isVerified,
      isProfileComplete,
    } = req.body;

    if (mobile && mobile !== partner.mobile) {
      const mobileExists = await Partner.findOne({
        mobile,
        _id: { $ne: id },
      });

      if (mobileExists) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    if (fullName) partner.fullName = fullName;
    if (mobile) partner.mobile = mobile;
    if (dateOfBirth) partner.dateOfBirth = dateOfBirth;
    if (gender) partner.gender = gender;
    if (city) partner.city = city;
    if (experience) partner.experience = Number(experience);
    if (qualification) partner.qualification = qualification;
    if (expectedSalary) partner.expectedSalary = Number(expectedSalary);
    if (bio) partner.bio = bio;

    if (req.body.specialties) {
      partner.specialties = JSON.parse(req.body.specialties);
    }

    if (req.body.languages) {
      partner.languages = JSON.parse(req.body.languages);
    }

    if (req.body.additionalPhotos) {
      partner.additionalPhotos = JSON.parse(req.body.additionalPhotos);
    }

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "partners/profilePic",
      });
      partner.profilePic = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    if (isVerified !== undefined) {
      partner.isVerified = isVerified === "true";
    }

    if (isProfileComplete !== undefined) {
      partner.isProfileComplete = isProfileComplete === "true";
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Partner updated successfully",
      data: partner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    await Partner.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Partner deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePartnerDocumentStatus = async (req, res) => {
  try {
    const { partnerId, document, status } = req.body;

    const validDocuments = [
      "selfie",
      "nationalId",
      "astrologyCertificate",
      "addressProof",
    ];

    if (!validDocuments.includes(document)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const partner = await Partner.findById(partnerId);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    if (!partner[document] || !partner[document].url) {
      return res.status(400).json({
        success: false,
        message: `${document} not uploaded`,
      });
    }

    partner[document].status = status;

    const docs = [
      partner.selfie,
      partner.nationalId,
      partner.astrologyCertificate,
      partner.addressProof,
    ];

    if (docs.some((doc) => doc.status === "Rejected")) {
      partner.kycStatus = "Rejected";
    } else if (docs.every((doc) => doc.status === "Approved")) {
      partner.kycStatus = "Approved";
    } else {
      partner.kycStatus = "Pending";
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: `${document} ${status} successfully`,
      data: partner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approvePartnerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected",
      });
    }

    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    partner.profileApprovalStatus = status;
    await partner.save();

    res.status(200).json({
      success: true,
      message: `Partner profile ${status} successfully`,
      data: partner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reasonNote } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "User is already deactivated" });
    }

    user.isActive = false;
    user.deactivatedBy = "admin";
    user.deactivatedAt = new Date();
    user.deactivationReason = reason;
    user.deactivationReasonNote = reasonNote || null;
    user.deactivationDuration = null;
    user.reactivateAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deactivated by admin",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "User is already active" });
    }

    user.isActive = true;
    user.deactivatedBy = null;
    user.deactivatedAt = null;
    user.reactivateAt = null;
    user.deactivationReason = null;
    user.deactivationReasonNote = null;
    user.deactivationDuration = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User activated by admin",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deactivatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reasonNote } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const partner = await Partner.findById(id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    if (!partner.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Partner is already deactivated" });
    }

    partner.isActive = false;
    partner.deactivatedBy = "admin";
    partner.deactivatedAt = new Date();
    partner.deactivationReason = reason;
    partner.deactivationReasonNote = reasonNote || null;
    partner.deactivationDuration = null;
    partner.reactivateAt = null;

    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Partner deactivated by admin",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const activatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    if (partner.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Partner is already active" });
    }

    partner.isActive = true;
    partner.deactivatedBy = null;
    partner.deactivatedAt = null;
    partner.reactivateAt = null;
    partner.deactivationReason = null;
    partner.deactivationReasonNote = null;
    partner.deactivationDuration = null;

    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Partner activated by admin",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPendingKycPartners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      profileApprovalStatus: "Approved",
      kycStatus: "Pending",
    };

    const [partners, total] = await Promise.all([
      Partner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Partner.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: partners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approveMinRateUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected",
      });
    }

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    if (status === "Approved") {
      partner.minRate = partner.requestedMinRate;
      partner.minRateApprovalStatus = 'Approved';
      partner.requestedMinRate = null;
    }

     await partner.save();
      return res.status(200).json({
            success: true,
            message: `Partner rate update ${status.toLowerCase()} successfully`,
            data: partner
        });
  } catch (error) {
     return res.status(500).json({
            success: false,
            message: error.message
        });
  }
};

const getPendingMinRatePartners = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            minRateApprovalStatus: "Pending"
        };

        const [partners, total] = await Promise.all([
            Partner.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Partner.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: partners
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
  verifyOtp,
  register,
  getDashboardStats,
  getRecentUsers,
  getUserAnalytics,
  getAllUsers,
  updateUser,
  getAllPartners,
  updatePartner,
  getPartnerById,
  updatePartnerDocumentStatus,
  getUserById,
  deleteUserById,
  deletePartner,
  deactivateUser,
  activateUser,
  deactivatePartner,
  activatePartner,
  approvePartnerProfile,
  getPendingKycPartners,
  approveMinRateUpdate,
  getPendingMinRatePartners
};

