const jwt = require('jsonwebtoken');
const fs = require('fs');
const Pandit = require('../../models/Pandit/Pandit');
const cloudinary = require('../../config/cloudinary');
const admin = require('../../config/firebase');

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
    if (files.profilePic && files.profilePic[0] && fs.existsSync(files.profilePic[0].path)) {
        fs.unlinkSync(files.profilePic[0].path);
    }
    if (files.certificatePhotos) {
        files.certificatePhotos.forEach((file) => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
    }
};

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
            return res.status(400).json({ success: false, message: "Firebase ID Token or Mobile number is required" });
        }

        let pandit = await Pandit.findOne({ mobile });

        if (!pandit) {
            pandit = await Pandit.create({
                mobile,
                role: 'pandit',
                isVerified: false,
                profileApprovalStatus: 'Pending'
            });
        }

        const token = jwt.sign(
            { id: pandit._id, role: pandit.role },
            process.env.JWT_SECRET || 'SECRET_KEY_123',
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: "Authentication successful",
            token,
            data: {
                id: pandit._id,
                mobile: pandit.mobile,
                role: pandit.role,
                isProfileComplete: pandit.isProfileComplete,
                profileApprovalStatus: pandit.profileApprovalStatus
            }
        });

    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired Firebase token", error: error.message });
    }
};

const register = async (req, res) => {
    try {
        const pandit = await Pandit.findById(req.user.id);
        if (!pandit) {
            cleanUploadedFiles(req.files);
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        const {
            fullName,
            dateOfBirth,
            gender,
            city,
            poojaServiceMode,
            expertise,
            primaryCategory,
            languages,
            experience,
            vedicEducation,
            canArrangeSamagri,
            expectedMonthlyEarnings,
            minPoojaFee,
            bio
        } = req.body;

        let profilePicUrl = pandit.profilePic;
        if (req.files?.profilePic?.[0]) {
            profilePicUrl = await uploadToCloudinary(req.files.profilePic[0].path, 'pandits/profiles');
        }

        let certificatePhotosUrls = pandit.certificatePhotos || [];
        if (req.files?.certificatePhotos) {
            const uploadPromises = req.files.certificatePhotos.map((file) =>
                uploadToCloudinary(file.path, 'pandits/certificates')
            );
            const uploadedUrls = await Promise.all(uploadPromises);
            certificatePhotosUrls = [...certificatePhotosUrls, ...uploadedUrls].slice(0, 4);
        }

        pandit.fullName = fullName;
        pandit.profilePic = profilePicUrl;
        pandit.dateOfBirth = dateOfBirth;
        pandit.gender = gender;
        pandit.city = city;
        pandit.poojaServiceMode = poojaServiceMode;
        pandit.expertise = typeof expertise === 'string' ? JSON.parse(expertise) : expertise;
        pandit.primaryCategory = primaryCategory;
        pandit.languages = typeof languages === 'string' ? JSON.parse(languages) : languages;
        pandit.experience = experience ? Number(experience) : pandit.experience;
        pandit.vedicEducation = vedicEducation;
        pandit.canArrangeSamagri = canArrangeSamagri === 'true' || canArrangeSamagri === true || canArrangeSamagri === 'Yes';
        pandit.expectedMonthlyEarnings = expectedMonthlyEarnings ? Number(expectedMonthlyEarnings) : undefined;
        pandit.minPoojaFee = minPoojaFee ? Number(minPoojaFee) : undefined;
        pandit.certificatePhotos = certificatePhotosUrls;
        pandit.bio = bio;
        pandit.isProfileComplete = true;
        pandit.profileApprovalStatus = 'Pending';

        await pandit.save();

        return res.status(200).json({
            success: true,
            message: 'Pandit registration submitted successfully',
            data: pandit
        });

    } catch (error) {
        cleanUploadedFiles(req.files);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const pandit = await Pandit.findById(req.user.id);
        if (!pandit) {
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }
        return res.status(200).json({ success: true, data: pandit });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const pandit = await Pandit.findById(req.user.id);
        if (!pandit) {
            cleanUploadedFiles(req.files);
            return res.status(404).json({ success: false, message: 'Pandit not found' });
        }

        const {
            fullName, dateOfBirth, gender, city, poojaServiceMode, expertise,
            primaryCategory, languages, experience, vedicEducation,
            canArrangeSamagri, expectedMonthlyEarnings, minPoojaFee, bio
        } = req.body;

        let profilePicUrl = pandit.profilePic;
        if (req.files?.profilePic?.[0]) {
            profilePicUrl = await uploadToCloudinary(req.files.profilePic[0].path, 'pandits/profiles');
        }

        if (fullName !== undefined) pandit.fullName = fullName;
        if (profilePicUrl !== undefined) pandit.profilePic = profilePicUrl;
        if (dateOfBirth !== undefined) pandit.dateOfBirth = dateOfBirth;
        if (gender !== undefined) pandit.gender = gender;
        if (city !== undefined) pandit.city = city;
        if (poojaServiceMode !== undefined) pandit.poojaServiceMode = poojaServiceMode;
        if (expertise !== undefined) pandit.expertise = typeof expertise === 'string' ? JSON.parse(expertise) : expertise;
        if (primaryCategory !== undefined) pandit.primaryCategory = primaryCategory;
        if (languages !== undefined) pandit.languages = typeof languages === 'string' ? JSON.parse(languages) : languages;
        if (experience !== undefined) pandit.experience = Number(experience);
        if (vedicEducation !== undefined) pandit.vedicEducation = vedicEducation;
        if (canArrangeSamagri !== undefined) {
            pandit.canArrangeSamagri = canArrangeSamagri === 'true' || canArrangeSamagri === true || canArrangeSamagri === 'Yes';
        }
        if (expectedMonthlyEarnings !== undefined) pandit.expectedMonthlyEarnings = Number(expectedMonthlyEarnings);
        if (minPoojaFee !== undefined) pandit.minPoojaFee = Number(minPoojaFee);
        if (bio !== undefined) pandit.bio = bio;

        await pandit.save();

        return res.status(200).json({
            success: true,
            message: 'Pandit profile updated successfully',
            data: pandit
        });

    } catch (error) {
        cleanUploadedFiles(req.files);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const pandit = await Pandit.findById(req.user.id);
        if (!pandit) return res.status(404).json({ success: false, message: 'Pandit not found' });
        await Pandit.findByIdAndDelete(req.user.id);
        return res.status(200).json({ success: true, message: 'Pandit account deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updatePanditFCMToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ success: false, message: "FCM Token is required" });
        await Pandit.findByIdAndUpdate(req.user.id, { fcmToken });
        return res.status(200).json({ success: true, message: "FCM Token updated successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const logoutPandit = async (req, res) => {
    try {
        await Pandit.findByIdAndUpdate(req.user.id, { fcmToken: null });
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
};

const getAllPanditsForAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", status } = req.query;
        const filter = {};

        if (status) {
            filter.profileApprovalStatus = status;
        }

        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { city: { $regex: search, $options: "i" } },
                { primaryCategory: { $regex: search, $options: "i" } }
            ];
        }

        const pandits = await Pandit.find(filter)
            .select("-fcmToken")
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Pandit.countDocuments(filter);

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: pandits
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPanditByIdForAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const pandit = await Pandit.findById(id).select("-fcmToken");

        if (!pandit) {
            return res.status(404).json({ success: false, message: "Pandit not found" });
        }

        return res.status(200).json({
            success: true,
            data: pandit
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updatePanditApprovalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'Approved' or 'Rejected'"
            });
        }

        const pandit = await Pandit.findById(id);
        if (!pandit) {
            return res.status(404).json({ success: false, message: "Pandit not found" });
        }

        pandit.profileApprovalStatus = status;
        if (status === "Approved") {
            pandit.isVerified = true;
        }

        await pandit.save();

        return res.status(200).json({
            success: true,
            message: `Pandit profile has been ${status.toLowerCase()} successfully`,
            data: pandit
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    verifyOtp,
    register,
    getProfile,
    updateProfile,
    deleteAccount,
    updatePanditFCMToken,
    logoutPandit,
    getAllPanditsForAdmin,
    getPanditByIdForAdmin,
    updatePanditApprovalStatus
};