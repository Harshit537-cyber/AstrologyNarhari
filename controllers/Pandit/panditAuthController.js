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
                isVerified: true
            });
        } else {
            pandit.isVerified = true;
            await pandit.save();
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

        if (pandit.isProfileComplete) {
            cleanUploadedFiles(req.files);
            return res.status(400).json({ success: false, message: 'Profile is already completed.' });
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
            message: 'Pandit registration completed successfully',
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

        return res.status(200).json({
            success: true,
            data: pandit
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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

module.exports = {
    verifyOtp,
    register,
    getProfile,
    logoutPandit
};