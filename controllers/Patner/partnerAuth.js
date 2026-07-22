const jwt = require('jsonwebtoken');
const fs = require('fs');
const Partner = require('../../models/Partner/Partner');
const cloudinary = require('../../config/cloudinary');
const { DEACTIVATION_REASONS, ALLOWED_DURATIONS } = require('../../utils/deactivationReasons');

const uploadToCloudinary = async (filePath, folder) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, { folder });
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return result.secure_url;
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
};

const cleanUploadedFiles = (files) => {
    if (!files) return;
    if (files.profilePic && files.profilePic[0] && fs.existsSync(files.profilePic[0].path)) {
        fs.unlinkSync(files.profilePic[0].path);
    }
    if (files.additionalPhotos) {
        files.additionalPhotos.forEach((file) => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
    }
};

const sendOtp = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ success: false, message: "Mobile number is required" });
        }

        const otp = "123456"; 
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        const otpExpiry = new Date(Date.now() + sevenDaysInMs);

        await Partner.findOneAndUpdate(
            { mobile },
            { 
                otp, 
                otpExpiry,
                role: 'partner' 
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully. Valid for 7 days.",
            dummyOtp: otp 
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
        }

        const partner = await Partner.findOne({ mobile });

        if (!partner) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (partner.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        if (partner.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        partner.isVerified = true;
        partner.otp = undefined; 
        partner.otpExpiry = undefined;
        await partner.save();

        const token = jwt.sign(
            { id: partner._id, role: partner.role },
            process.env.JWT_SECRET || 'SECRET_KEY_123', 
            { expiresIn: '7d' } 
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: {
                id: partner._id,
                mobile: partner.mobile,
                isProfileComplete: partner.isProfileComplete,
                profileApprovalStatus: partner.profileApprovalStatus
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const register = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        if (partner.isProfileComplete) {
            cleanUploadedFiles(req.files);
            return res.status(400).json({ message: 'Profile is already completed.' });
        }

        const {
            fullName, dateOfBirth, gender, city, specialties,
            languages, experience, qualification, expectedSalary, minRate, bio
        } = req.body;

        let profilePicUrl = partner.profilePic;
        if (req.files?.profilePic?.[0]) {
            profilePicUrl = await uploadToCloudinary(req.files.profilePic[0].path, 'partners/profiles');
        }

        let additionalPhotosUrls = partner.additionalPhotos || [];
        if (req.files?.additionalPhotos) {
            const uploadPromises = req.files.additionalPhotos.map((file) =>
                uploadToCloudinary(file.path, 'partners/gallery')
            );
            const uploadedUrls = await Promise.all(uploadPromises);
            additionalPhotosUrls = [...additionalPhotosUrls, ...uploadedUrls].slice(0, 4);
        }

        partner.fullName = fullName;
        partner.profilePic = profilePicUrl;
        partner.dateOfBirth = dateOfBirth;
        partner.gender = gender;
        partner.city = city;
        partner.specialties = typeof specialties === 'string' ? JSON.parse(specialties) : specialties;
        partner.languages = typeof languages === 'string' ? JSON.parse(languages) : languages;
        partner.experience = experience;
        partner.qualification = qualification;
        partner.expectedSalary = expectedSalary;
        partner.minRate = minRate ? Number(minRate) : partner.minRate;
        partner.additionalPhotos = additionalPhotosUrls;
        partner.bio = bio;
        partner.isProfileComplete = true;
        partner.profileApprovalStatus = 'Pending';

        await partner.save();

        return res.status(200).json({
            success: true,
            message: 'Partner profile updated successfully',
            partner
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
        const { fullName, specialties, languages, experience, minRate, bio } = req.body;

        let partner = await Partner.findById(partnerId);
        if (!partner) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        if (fullName !== undefined) partner.fullName = fullName;
        if (experience !== undefined) partner.experience = Number(experience);
        if (minRate !== undefined) partner.minRate = Number(minRate);
        if (bio !== undefined) partner.bio = bio;

        if (specialties !== undefined) {
            partner.specialties = typeof specialties === 'string' ? JSON.parse(specialties) : specialties;
        }

        if (languages !== undefined) {
            partner.languages = typeof languages === 'string' ? JSON.parse(languages) : languages;
        }

        if (filePath) {
            if (fs.existsSync(filePath)) {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: "partners/profiles",
                });
                partner.profilePic = result.secure_url;
                fs.unlinkSync(filePath);
            }
        }

        await partner.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: partner
        });

    } catch (error) {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error(unlinkError);
            }
        }

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id).select('-otp -otpExpiry');

        if (!partner) {
            return res.status(404).json({ 
                success: false, 
                message: 'Partner not found' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Partner profile retrieved successfully',
            partner 
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Please provide a deletion reason' });
        }

        const partner = await Partner.findByIdAndDelete(req.user.id);
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }

        return res.status(200).json({ success: true, message: 'Account deleted successfully' });
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
                message: `Reason must be one of: ${DEACTIVATION_REASONS.join(', ')}`
            });
        }

        if (duration && !ALLOWED_DURATIONS.includes(Number(duration))) {
            return res.status(400).json({ success: false, message: 'Invalid deactivation duration' });
        }

        const partner = await Partner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }

        const now = new Date();
        partner.isActive = false;
        partner.deactivatedBy = 'self';
        partner.deactivatedAt = now;
        partner.deactivationReason = reason;
        partner.deactivationReasonNote = reasonNote || null;
        partner.deactivationDuration = duration ? Number(duration) : null;
        partner.reactivateAt = duration ? new Date(now.getTime() + Number(duration) * 24 * 60 * 60 * 1000) : null;

        await partner.save();

        return res.status(200).json({ success: true, message: 'Account deactivated successfully', data: partner });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const activateAccount = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }

        if (partner.deactivatedBy === 'admin') {
            return res.status(403).json({ success: false, message: 'Account deactivated by admin. Contact support.' });
        }

        partner.isActive = true;
        partner.deactivatedBy = null;
        partner.deactivatedAt = null;
        partner.reactivateAt = null;
        partner.deactivationReason = null;
        partner.deactivationReasonNote = null;
        partner.deactivationDuration = null;

        await partner.save();

        return res.status(200).json({ success: true, message: 'Account reactivated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getLiveAstrologers = async (req, res) => {
    try {
        let query = {
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved',
            kycStatus: 'Approved' 
        };

        const { specialty, language, gender, search, sortBy } = req.query;

        if (specialty) {
            query.specialties = { $in: [specialty] };
        }

        if (language) {
            query.languages = { $in: [language] };
        }

        if (gender) {
            query.gender = gender;
        }

        if (search) {
            query.fullName = { $regex: search, $options: 'i' };
        }

        let sortOption = {};
        if (sortBy === 'experience') {
            sortOption = { experience: -1 };
        } else if (sortBy === 'rating') {
            sortOption = { averageRating: -1 };
        } else if (sortBy === 'price_low') {
            sortOption = { minRate: 1 };
        } else if (sortBy === 'price_high') {
            sortOption = { minRate: -1 };
        } else {
            sortOption = { isOnline: -1, averageRating: -1 }; 
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const astrologers = await Partner.find(query)
            .select('fullName profilePic specialties languages experience minRate averageRating totalReviews isOnline isBusy bio')
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
            data: astrologers
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching live astrologers",
            error: error.message
        });
    }
};

module.exports = {
    sendOtp,
    verifyOtp,
    register,
    updateProfile,
    getProfile,
    deleteAccount,
    deactivateAccount,
    activateAccount,
    getLiveAstrologers
};