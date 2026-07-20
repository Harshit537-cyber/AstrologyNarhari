const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const jwt = require('jsonwebtoken');

const User = require('../../models/User.js');
const UserProfile = require('../../models/User.js');
const Partner = require("../../models/Partner/Partner");

const parseServiceAccount = () => {
    const envValue = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!envValue) {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT environment variable is not defined.");
        return null;
    }
    try {
        let cleanValue = envValue.trim();
        cleanValue = cleanValue.replace(/\r?\n|\r/g, "");
        if (cleanValue.startsWith("'") && cleanValue.endsWith("'")) {
            cleanValue = cleanValue.slice(1, -1);
        } else if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
            cleanValue = cleanValue.slice(1, -1);
        }
        const parsed = JSON.parse(cleanValue);
        if (parsed && parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        return parsed;
    } catch (error) {
        console.warn("⚠️ AdminAuth: Failed to parse FIREBASE_SERVICE_ACCOUNT env variable. Error:", error.message);
        return null;
    }
};

let serviceAccount = parseServiceAccount();

if (!serviceAccount) {
    try {
        serviceAccount = require('./../../config/astro-narhari-firebase-adminsdk-fbsvc-536f643de4.json');
    } catch (error) {
        console.warn(" AdminAuth: Local Firebase config file also not found.");
    }
}

try {
    const activeApps = getApps() || [];
    if (activeApps.length > 0) {
        console.log("ℹ Firebase Admin SDK is already initialized.");
    } else if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log(" Firebase Admin SDK successfully initialized via Admin Auth!");
    } else {
        console.error(" Firebase Admin Initialization Skipped: No valid credentials found.");
    }
} catch (error) {
    console.error(" Firebase Admin Initialization Failed (Admin):", error.message);
}

const verifyFirebaseIdToken = async (firebaseToken) => {
    try {
        const decodedToken = await getAuth().verifyIdToken(firebaseToken);
        if (!decodedToken.phone_number) {
            throw new Error('Phone number not verified on Firebase');
        }
        return decodedToken;
    } catch (error) {
        throw new Error(`Firebase Auth Error: ${error.message}`);
    }
};

const sendAdminOTP = async (req, res) => {
    try {
        const { mobile, action } = req.body;

        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }

        if (action === 'register') {
            const existingUser = await User.findOne({ mobile });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Mobile number already registered' });
            }

            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount >= 2) {
                return res.status(400).json({ success: false, message: 'Admin registration limit reached. Max 2 admins allowed.' });
            }

        } else if (action === 'login') {
            const existingAdmin = await User.findOne({ mobile, role: 'admin' });
            if (!existingAdmin) {
                return res.status(404).json({ success: false, message: 'Admin not found with this mobile number' });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action type' });
        }

        return res.status(200).json({
            success: true,
            message: 'Validation checks passed. Trigger OTP on client.'
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const register = async (req, res) => {
    try {
        const { name, mobile, firebaseToken } = req.body;

        if (!name || !mobile || !firebaseToken) {
            return res.status(400).json({ success: false, message: 'Name, mobile, and firebaseToken are required' });
        }

        await verifyFirebaseIdToken(firebaseToken);

        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount >= 2) {
            return res.status(400).json({ success: false, message: 'Admin registration limit reached. Max 2 admins allowed.' });
        }

        let admin = await User.findOne({ mobile });
        if (!admin) {
            admin = new User({ mobile });
        }

        admin.name = name;
        admin.role = 'admin';
        admin.isActive = true;
        await admin.save();

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );

        return res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                mobile: admin.mobile,
                role: admin.role
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { mobile, firebaseToken } = req.body;

        if (!mobile || !firebaseToken) {
            return res.status(400).json({ success: false, message: 'Mobile and firebaseToken are required' });
        }

        await verifyFirebaseIdToken(firebaseToken);

        const admin = await User.findOne({ mobile, role: 'admin' });

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'This admin account is deactivated' });
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Admin logged in successfully',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                mobile: admin.mobile,
                role: admin.role
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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
            Partner.countDocuments({
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

        const existingUser = await User.findOne({
            email: req.body.email,
            _id: { $ne: id }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            {
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mobile
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const profile = await UserProfile.findOneAndUpdate(
            { user: id },
            {
                fullName: req.body.fullName,
                gender: req.body.gender,
                zodiac: req.body.zodiac,
                dateOfBirth: req.body.dateOfBirth,
                timeOfBirth: req.body.timeOfBirth,
                placeOfBirth: req.body.placeOfBirth,
                profilePic: req.body.profilePic
            },
            {
                new: true,
                runValidators: true,
                upsert: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "User and profile updated successfully",
            data: {
                user,
                profile
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
    sendAdminOTP,
    register,
    login,
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
    approvePartnerProfile
};