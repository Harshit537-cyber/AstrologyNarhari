const { initializeApp, cert, apps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const Partner = require('../../models/Partner/Partner');
const cloudinary = require('../../config/cloudinary');
const { DEACTIVATION_REASONS, ALLOWED_DURATIONS } = require('../../utils/deactivationReasons');

const serviceAccount = require('./../../config/astro-narhari-firebase-adminsdk-fbsvc-536f643de4.json');

try {
    const activeApps = apps || [];
    if (activeApps.length === 0) {
        initializeApp({
            credential: cert(serviceAccount),
        });

        console.log("=========================================");
        console.log("🔥 Firebase Admin SDK Successfully Initialized!");
        console.log("=========================================");
    }
} catch (error) {
    console.error("=========================================");
    console.error("❌ Firebase Admin Initialization Failed:", error.message);
    console.error("=========================================");
}

const verifyFirebaseIdToken = async (firebaseToken) => {
    try {
        console.log("🕒 Verifying Firebase ID Token...");
        const decodedToken = await getAuth().verifyIdToken(firebaseToken);
        
        if (!decodedToken.phone_number) {
            console.warn(" Token is valid, but no phone number associated.");
            throw new Error('Phone number not verified on Firebase');
        }
        
        console.log(`✅ Firebase Token verified for: ${decodedToken.phone_number}`);
        return decodedToken;
    } catch (error) {
        console.error(`Firebase Auth Verification Failed: ${error.message}`);
        throw new Error(`Firebase Auth Error: ${error.message}`);
    }
};

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

const generateToken = (partner) => {
    return jwt.sign(
        { id: partner._id, role: partner.role },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '30d' }
    );
};

const sendOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ message: 'Mobile number is required' });
        }

        const partner = await Partner.findOne({ mobile });
        return res.status(200).json({
            success: true,
            isRegistered: !!partner,
            message: partner ? 'Partner exists. Proceed to OTP verification.' : 'New mobile number.'
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { mobile, firebaseToken } = req.body;
        if (!mobile || !firebaseToken) {
            return res.status(400).json({ message: 'Mobile and Firebase Token are required' });
        }

        await verifyFirebaseIdToken(firebaseToken);

        let partner = await Partner.findOne({ mobile });
        if (!partner) {
            partner = new Partner({ mobile, isVerified: true });
            await partner.save();
            console.log(`👤 New partner registered with mobile: ${mobile}`);
        }

        const token = generateToken(partner);

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token,
            isProfileComplete: partner.isProfileComplete,
            profileApprovalStatus: partner.profileApprovalStatus,
            partner: {
                id: partner._id,
                mobile: partner.mobile,
                role: partner.role
            }
        });
    } catch (error) {
        return res.status(401).json({ success: false, message: error.message });
    }
};

const sendLoginOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ message: 'Mobile number is required' });
        }

        const partner = await Partner.findOne({ mobile });
        if (!partner) {
            return res.status(404).json({ message: 'Partner not registered. Please register first.' });
        }

        return res.status(200).json({ success: true, message: 'Valid partner account. Trigger OTP on client.' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const loginWithOtp = async (req, res) => {
    try {
        const { mobile, firebaseToken } = req.body;
        if (!mobile || !firebaseToken) {
            return res.status(400).json({ message: 'Mobile and Firebase Token are required' });
        }

        await verifyFirebaseIdToken(firebaseToken);

        const partner = await Partner.findOne({ mobile });
        if (!partner) {
            return res.status(404).json({ message: 'Partner profile not found.' });
        }

        if (!partner.isActive) {
            if (partner.deactivatedBy === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is deactivated by admin. Contact support.'
                });
            }

            if (partner.reactivateAt && new Date() >= partner.reactivateAt) {
                partner.isActive = true;
                partner.deactivatedBy = null;
                partner.deactivatedAt = null;
                partner.reactivateAt = null;
                partner.deactivationReason = null;
                partner.deactivationReasonNote = null;
                partner.deactivationDuration = null;
                await partner.save();
                console.log(` Account auto-reactivated for: ${mobile}`);
            }
        }

        const token = generateToken(partner);

        const response = {
            success: true,
            message: 'Login successful',
            token,
            isProfileComplete: partner.isProfileComplete,
            profileApprovalStatus: partner.profileApprovalStatus,
            partner: {
                id: partner._id,
                mobile: partner.mobile,
                role: partner.role,
                isActive: partner.isActive
            }
        };

        if (!partner.isActive) {
            response.message = 'Account is deactivated. Reactivate to continue.';
            response.deactivationInfo = {
                reason: partner.deactivationReason,
                reasonNote: partner.deactivationReasonNote,
                duration: partner.deactivationDuration,
                deactivatedAt: partner.deactivatedAt,
                reactivateAt: partner.reactivateAt
            };
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(401).json({ success: false, message: error.message });
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

const getProfile = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id).select('-otp -otpExpiry');
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }
        return res.status(200).json({ success: true, partner });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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

module.exports = {
    sendOtp,
    verifyOtp,
    sendLoginOtp,
    loginWithOtp,
    register,
    getProfile,
    deleteAccount,
    deactivateAccount,
    activateAccount
};