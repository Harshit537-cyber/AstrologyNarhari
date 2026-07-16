const User = require('../../models/User.js');
const Partner = require("../../models/Partner/Partner");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, role: 'admin' });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );
        res.status(200).json({
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            newPartnersToday
        ] = await Promise.all([
            User.countDocuments({ role: "user" }),
            Partner.countDocuments(),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({
                role: "user",
                createdAt: { $gte: today }
            }),
            User.countDocuments({
                role: "partner",
                createdAt: { $gte: today }
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalPartners,
                totalAdmins,
                newUsersToday,
                newPartnersToday
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
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
            data: users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
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
                        $sum: 1
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: analytics
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = ""
        } = req.query;

        const filter = {
            role: "user"
        };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } }
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
            data: users
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select("-password -otp");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user,
                profile: user
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobile, role } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({
                email,
                _id: { $ne: id }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists"
                });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.mobile = mobile || user.mobile;
        user.role = role || user.role;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
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
                message: "User not found."
            });
        }

        await User.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "User deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllPartners = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            isVerified,
            isProfileComplete,
            isActive,
            profileApprovalStatus
        } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { city: { $regex: search, $options: "i" } },
                { qualification: { $regex: search, $options: "i" } }
            ];
        }

        if (isVerified !== undefined) {
            filter.isVerified = isVerified === "true";
        }

        if (isProfileComplete !== undefined) {
            filter.isProfileComplete = isProfileComplete === "true";
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        if (profileApprovalStatus) {
            filter.profileApprovalStatus = profileApprovalStatus;
        }

        const partners = await Partner.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Partner.countDocuments(filter);

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
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

const getPartnerById = async (req, res) => {
    try {
        const { id } = req.params;

        const partner = await Partner.findById(id);

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Partner details fetched successfully",
            data: partner
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updatePartner = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            fullName,
            mobile,
            dateOfBirth,
            gender,
            city,
            specialties,
            languages,
            experience,
            qualification,
            expectedSalary,
            bio,
            profilePic,
            additionalPhotos,
            isVerified,
            isProfileComplete
        } = req.body;

        const partner = await Partner.findById(id);

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found"
            });
        }

        if (mobile && mobile !== partner.mobile) {
            const mobileExists = await Partner.findOne({
                mobile,
                _id: { $ne: id }
            });

            if (mobileExists) {
                return res.status(400).json({
                    success: false,
                    message: "Mobile number already exists"
                });
            }
        }

        partner.fullName = fullName || partner.fullName;
        partner.mobile = mobile || partner.mobile;
        partner.dateOfBirth = dateOfBirth || partner.dateOfBirth;
        partner.gender = gender || partner.gender;
        partner.city = city || partner.city;
        partner.specialties = specialties || partner.specialties;
        partner.languages = languages || partner.languages;
        partner.experience = experience ?? partner.experience;
        partner.qualification = qualification || partner.qualification;
        partner.expectedSalary = expectedSalary ?? partner.expectedSalary;
        partner.bio = bio || partner.bio;
        partner.profilePic = profilePic || partner.profilePic;
        partner.additionalPhotos = additionalPhotos || partner.additionalPhotos;

        if (typeof isVerified === "boolean") {
            partner.isVerified = isVerified;
        }

        if (typeof isProfileComplete === "boolean") {
            partner.isProfileComplete = isProfileComplete;
        }

        await partner.save();

        return res.status(200).json({
            success: true,
            message: "Partner updated successfully",
            data: partner
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
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
                message: "Partner not found"
            });
        }

        await Partner.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Partner deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
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
            "addressProof"
        ];

        if (!validDocuments.includes(document)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document type"
            });
        }

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const partner = await Partner.findById(partnerId);

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found"
            });
        }

        if (!partner[document] || !partner[document].url) {
            return res.status(400).json({
                success: false,
                message: `${document} not uploaded`
            });
        }

        partner[document].status = status;

        const docs = [
            partner.selfie,
            partner.nationalId,
            partner.astrologyCertificate,
            partner.addressProof
        ];

        if (docs.some(doc => doc.status === "Rejected")) {
            partner.kycStatus = "Rejected";
        } else if (docs.every(doc => doc.status === "Approved")) {
            partner.kycStatus = "Approved";
        } else {
            partner.kycStatus = "Pending";
        }

        await partner.save();

        return res.status(200).json({
            success: true,
            message: `${document} ${status} successfully`,
            data: partner
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const approvePartnerProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Approved or Rejected"
            });
        }

        const partner = await Partner.findById(id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found"
            });
        }

        partner.profileApprovalStatus = status;
        await partner.save();

        res.status(200).json({
            success: true,
            message: `Partner profile ${status} successfully`,
            data: partner
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
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
                message: "Reason is required"
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.isActive) {
            return res.status(400).json({ success: false, message: "User is already deactivated" });
        }

        user.isActive = false;
        user.deactivatedBy = 'admin';
        user.deactivatedAt = new Date();
        user.deactivationReason = reason;
        user.deactivationReasonNote = reasonNote || null;
        user.deactivationDuration = null;
        user.reactivateAt = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "User deactivated by admin"
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
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isActive) {
            return res.status(400).json({ success: false, message: "User is already active" });
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
            message: "User activated by admin"
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
                message: "Reason is required"
            });
        }

        const partner = await Partner.findById(id);
        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        if (!partner.isActive) {
            return res.status(400).json({ success: false, message: "Partner is already deactivated" });
        }

        partner.isActive = false;
        partner.deactivatedBy = 'admin';
        partner.deactivatedAt = new Date();
        partner.deactivationReason = reason;
        partner.deactivationReasonNote = reasonNote || null;
        partner.deactivationDuration = null;
        partner.reactivateAt = null;

        await partner.save();

        return res.status(200).json({
            success: true,
            message: "Partner deactivated by admin"
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
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        if (partner.isActive) {
            return res.status(400).json({ success: false, message: "Partner is already active" });
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
            message: "Partner activated by admin"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register, login, getDashboardStats, getRecentUsers, getUserAnalytics,
    getAllUsers, updateUser, getAllPartners, updatePartner, getPartnerById,
    updatePartnerDocumentStatus, getUserById, deleteUserById, deletePartner,
    deactivateUser, activateUser, deactivatePartner, activatePartner, approvePartnerProfile
};