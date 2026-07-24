const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const jwt = require('jsonwebtoken');

const User = require('../../models/User.js');
const UserProfile = require('../../models/User.js');
const Partner = require("../../models/Partner/Partner");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");

// const parseServiceAccount = () => {
//     const envValue = process.env.FIREBASE_SERVICE_ACCOUNT;
//     if (!envValue) {
//         console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT environment variable is not defined.");
//         return null;
//     }
//     try {
//         let cleanValue = envValue.trim();
//         cleanValue = cleanValue.replace(/\r?\n|\r/g, "");
//         if (cleanValue.startsWith("'") && cleanValue.endsWith("'")) {
//             cleanValue = cleanValue.slice(1, -1);
//         } else if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
//             cleanValue = cleanValue.slice(1, -1);
//         }
//         const parsed = JSON.parse(cleanValue);
//         if (parsed && parsed.private_key) {
//             parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
//         }
//         return parsed;
//     } catch (error) {
//         console.warn("⚠️ AdminAuth: Failed to parse FIREBASE_SERVICE_ACCOUNT env variable. Error:", error.message);
//         return null;
//     }
// };

// let serviceAccount = parseServiceAccount();

// if (!serviceAccount) {
//     try {
//         serviceAccount = require('./../../config/astro-narhari-firebase-adminsdk-fbsvc-536f643de4.json');
//     } catch (error) {
//         console.warn(" AdminAuth: Local Firebase config file also not found.");
//     }
// }

// try {
//     const activeApps = getApps() || [];
//     if (activeApps.length > 0) {
//         console.log("ℹ Firebase Admin SDK is already initialized.");
//     } else if (serviceAccount) {
//         initializeApp({
//             credential: cert(serviceAccount)
//         });
//         console.log(" Firebase Admin SDK successfully initialized via Admin Auth!");
//     } else {
//         console.error(" Firebase Admin Initialization Skipped: No valid credentials found.");
//     }
// } catch (error) {
//     console.error(" Firebase Admin Initialization Failed (Admin):", error.message);
// }

// const verifyFirebaseIdToken = async (firebaseToken) => {
//     try {
//         const decodedToken = await getAuth().verifyIdToken(firebaseToken);
//         if (!decodedToken.phone_number) {
//             throw new Error('Phone number not verified on Firebase');
//         }
//         return decodedToken;
//     } catch (error) {
//         throw new Error(`Firebase Auth Error: ${error.message}`);
//     }
// };

// const sendAdminOTP = async (req, res) => {
//     try {
//         const { mobile, action } = req.body;

//         if (!mobile) {
//             return res.status(400).json({ success: false, message: 'Mobile number is required' });
//         }

//         if (action === 'register') {
//             const existingUser = await User.findOne({ mobile });
//             if (existingUser) {
//                 return res.status(400).json({ success: false, message: 'Mobile number already registered' });
//             }

//             const adminCount = await User.countDocuments({ role: 'admin' });
//             if (adminCount >= 2) {
//                 return res.status(400).json({ success: false, message: 'Admin registration limit reached. Max 2 admins allowed.' });
//             }

//         } else if (action === 'login') {
//             const existingAdmin = await User.findOne({ mobile, role: 'admin' });
//             if (!existingAdmin) {
//                 return res.status(404).json({ success: false, message: 'Admin not found with this mobile number' });
//             }
//         } else {
//             return res.status(400).json({ success: false, message: 'Invalid action type' });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Validation checks passed. Trigger OTP on client.'
//         });

//     } catch (error) {
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

const sendAdminOTP = async (req, res) => {
    try {

        const { mobile, action } = req.body;

        if (!mobile || !action) {
            return res.status(400).json({
                success: false,
                message: "Mobile and action are required"
            });
        }

        let user = await User.findOne({ mobile });

        if (action === "register") {

            if (user && user.role === "admin") {
                return res.status(400).json({
                    success: false,
                    message: "Admin already exists"
                });
            }

            if (!user) {
                user = new User({ mobile });
            }

        } else if (action === "login") {

            user = await User.findOne({
                mobile,
                role: "admin"
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

        } else {

            return res.status(400).json({
                success: false,
                message: "Invalid action"
            });

        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            otp
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



const register = async (req, res) => {
    try {

        const { name, mobile, otp } = req.body;

        if (!name || !mobile || !otp) {
            return res.status(400).json({
                success: false,
                message: "Name, mobile and otp are required"
            });
        }

        const adminCount = await User.countDocuments({ role: "admin" });

        const existingAdmin = await User.findOne({
            mobile,
            role: "admin"
        });

        if (!existingAdmin && adminCount <= 6) {
            return res.status(400).json({
                success: false,
                message: "Admin registration limit reached. Max 2 admins allowed."
            });
        }

        let admin = await User.findOne({ mobile });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Please send OTP first."
            });
        }

        if (admin.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        admin.name = name;
        admin.role = "admin";
        admin.isActive = true;
        admin.otp = null;

        await admin.save();

        const token = jwt.sign(
            {
                id: admin._id,
                role: admin.role
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "1d"
            }
        );

        return res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            token,
            admin
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


const login = async (req, res) => {
    try {

        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({
                success: false,
                message: "Mobile and OTP are required"
            });
        }

        const admin = await User.findOne({
            mobile,
            role: "admin"
        });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        if (admin.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: "This admin account is deactivated"
            });
        }

        admin.otp = null;

        await admin.save();

        const token = jwt.sign(
            {
                id: admin._id,
                role: admin.role
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Admin logged in successfully",
            token,
            admin
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



// const register = async (req, res) => {
//     try {
//         // 1. FirebaseToken hata diya, sirf name aur mobile liya
//         const { name, mobile } = req.body;

//         if (!name || !mobile) {
//             return res.status(400).json({ success: false, message: 'Name and mobile are required' });
//         }

//         // --- EXISTING LOGIC STARTS ---
//         // Firebase verification line remove kar di gayi hai

//         const adminCount = await User.countDocuments({ role: 'admin' });
//         if (adminCount >= 2) {
//             return res.status(400).json({ success: false, message: 'Admin registration limit reached. Max 2 admins allowed.' });
//         }

//         let admin = await User.findOne({ mobile });
//         if (!admin) {
//             admin = new User({ mobile });
//         }

//         admin.name = name;
//         admin.role = 'admin';
//         admin.isActive = true;
//         await admin.save();

//         const token = jwt.sign(
//             { id: admin._id, role: admin.role },
//             process.env.JWT_SECRET || 'secretkey',
//             { expiresIn: '1d' }
//         );

//         return res.status(201).json({
//             success: true,
//             message: 'Admin registered successfully',
//             token,
//             admin: {
//                 id: admin._id,
//                 name: admin.name,
//                 mobile: admin.mobile,
//                 role: admin.role
//             }
//         });
//         // --- EXISTING LOGIC ENDS ---

//     } catch (error) {
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// const login = async (req, res) => {
//     try {
//         const { mobile, firebaseToken } = req.body;

//         if (!mobile || !firebaseToken) {
//             return res.status(400).json({ success: false, message: 'Mobile and firebaseToken are required' });
//         }

//         await verifyFirebaseIdToken(firebaseToken);

//         const admin = await User.findOne({ mobile, role: 'admin' });

//         if (!admin) {
//             return res.status(404).json({ success: false, message: 'Admin not found' });
//         }

//         if (!admin.isActive) {
//             return res.status(403).json({ success: false, message: 'This admin account is deactivated' });
//         }

//         const token = jwt.sign(
//             { id: admin._id, role: admin.role },
//             process.env.JWT_SECRET || 'secretkey',
//             { expiresIn: '1d' }
//         );

//         return res.status(200).json({
//             success: true,
//             message: 'Admin logged in successfully',
//             token,
//             admin: {
//                 id: admin._id,
//                 name: admin.name,
//                 mobile: admin.mobile,
//                 role: admin.role
//             }
//         });

//     } catch (error) {
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

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

        const {
            name,
            email,
            mobile,
            fullName,
            gender,
            zodiac,
            dateOfBirth,
            timeOfBirth,
            placeOfBirth
        } = req.body || {};

        // Check duplicate email
        if (email) {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists"
                });
            }
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Partial Update
        if (name) user.name = name;
        if (email) user.email = email;
        if (mobile) user.mobile = mobile;

        await user.save();

        let profile = await UserProfile.findOne({ user: id });

        if (!profile) {
            profile = new UserProfile({ user: id });
        }

        if (fullName) profile.fullName = fullName;
        if (gender) profile.gender = gender;
        if (zodiac) profile.zodiac = zodiac;
        if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
        if (timeOfBirth) profile.timeOfBirth = timeOfBirth;
        if (placeOfBirth) profile.placeOfBirth = placeOfBirth;

        // Upload Profile Pic to Cloudinary
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "users/profilePic"
            });

            profile.profilePic = result.secure_url;

            // Delete local file
            fs.unlinkSync(req.file.path);
        }

        await profile.save();

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
        const { status } = req.query;

        const filter = {};

        if (status) {
            filter.profileApprovalStatus = status;
        }

        const partners = await Partner.find(filter)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: partners
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

        const partner = await Partner.findById(id);

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found"
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
            isProfileComplete
        } = req.body;


        // Mobile Duplicate Check
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

        if (fullName) partner.fullName = fullName;
        if (mobile) partner.mobile = mobile;
        if (dateOfBirth) partner.dateOfBirth = dateOfBirth;
        if (gender) partner.gender = gender;
        if (city) partner.city = city;
        if (experience) partner.experience = Number(experience);
        if (qualification) partner.qualification = qualification;
        if (expectedSalary) partner.expectedSalary = Number(expectedSalary);
        if (bio) partner.bio = bio;

        // Arrays (form-data me string bhejna)
        if (req.body.specialties) {
            partner.specialties = JSON.parse(req.body.specialties);
        }

        if (req.body.languages) {
            partner.languages = JSON.parse(req.body.languages);
        }

        if (req.body.additionalPhotos) {
            partner.additionalPhotos = JSON.parse(req.body.additionalPhotos);
        }

        // Profile Pic
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "partners/profilePic"
            });

            partner.profilePic = result.secure_url;

            // Local file delete kar do
            fs.unlinkSync(req.file.path);
        }

        // Boolean
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


const getPendingKycPartners = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            profileApprovalStatus: "Approved",
            kycStatus: "Pending"
        };

        const [partners, total] = await Promise.all([
            Partner.find(filter)
                .sort({ createdAt: -1 })
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
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
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
    approvePartnerProfile,
    getPendingKycPartners
};