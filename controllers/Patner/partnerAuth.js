const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const Partner = require('../../models/Partner/Partner');
const cloudinary = require('../../config/cloudinary');
const { DEACTIVATION_REASONS, ALLOWED_DURATIONS } = require('../../utils/deactivationReasons');

const parseServiceAccount = () => {
    const envValue = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log("=========================================");
    console.log("🔍 [INIT] Checking FIREBASE_SERVICE_ACCOUNT env...");
    
    if (!envValue) {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT environment variable is not defined.");
        return null;
    }
    try {
        let cleanValue = envValue.trim();
        if ((cleanValue.startsWith("'") && cleanValue.endsWith("'")) || 
            (cleanValue.startsWith('"') && cleanValue.endsWith('"'))) {
            cleanValue = cleanValue.slice(1, -1);
        }
        const parsed = JSON.parse(cleanValue);
        if (parsed && parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        console.log("✅ Successfully parsed service account JSON directly.");
        return parsed;
    } catch (error) {
        console.warn("⚠️ Failed direct JSON parsing. Attempting fallback parse... Error:", error.message);
        try {
            let fallbackValue = envValue.trim().replace(/\r?\n|\r/g, "\\n");
            if (fallbackValue.startsWith("'") && fallbackValue.endsWith("'")) {
                fallbackValue = fallbackValue.slice(1, -1);
            } else if (fallbackValue.startsWith('"') && fallbackValue.endsWith('"')) {
                fallbackValue = fallbackValue.slice(1, -1);
            }
            const parsed = JSON.parse(fallbackValue);
            if (parsed && parsed.private_key) {
                parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
            }
            console.log("✅ Successfully parsed service account using fallback.");
            return parsed;
        } catch (err) {
            console.error("❌ All JSON parsing attempts failed. Raw env value length:", envValue.length);
            console.error("❌ Ultimate parsing error:", err);
            return null;
        }
    }
};

let serviceAccount = parseServiceAccount();

if (!serviceAccount) {
    try {
        console.log("🕒 Attempting to load service account locally...");
        serviceAccount = require('./../../config/astro-narhari-firebase-adminsdk-fbsvc-536f643de4.json');
        console.log("✅ Successfully loaded service account from local JSON file.");
    } catch (error) {
        console.warn("⚠️ PartnerAuth: Local Firebase config file also not found. Error:", error.message);
    }
}

try {
    const activeApps = getApps() || [];
    if (activeApps.length > 0) {
        console.log("ℹ Firebase Admin SDK is already initialized.");
    } else if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
        });
        console.log("=========================================");
        console.log("🔥 Firebase Admin SDK Successfully Initialized!");
        console.log("=========================================");
    } else {
        console.error("❌ Firebase Admin Initialization Skipped: No valid credentials found.");
    }
} catch (error) {
    console.error("=========================================");
    console.error("❌ Firebase Admin Initialization Failed:", error);
    console.error("=========================================");
}

const verifyFirebaseIdToken = async (firebaseToken) => {
    try {
        console.log("=========================================");
        console.log("🕒 Verifying Firebase ID Token...");
        console.log("Token sample (first 25 chars):", firebaseToken ? firebaseToken.substring(0, 25) + "..." : "undefined");
        
        const decodedToken = await getAuth().verifyIdToken(firebaseToken);
        
        if (!decodedToken.phone_number) {
            console.warn("⚠️ Token is valid, but no phone number associated.");
            throw new Error('Phone number not verified on Firebase');
        }
        
        console.log(`✅ Firebase Token verified for: ${decodedToken.phone_number}`);
        console.log("=========================================");
        return decodedToken;
    } catch (error) {
        console.error("=========================================");
        console.error("❌ Firebase Auth Verification Failed!");
        console.error("Error Message:", error.message);
        console.error("Full Error Object:", error);
        console.error("=========================================");
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
        console.log("=========================================");
        console.log("📩 [POST] /api/partner/verify-otp hit");
        console.log("Request Body:", req.body);

        const { mobile, firebaseToken } = req.body;
        if (!mobile || !firebaseToken) {
            console.warn("⚠️ Missing fields in request body.");
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
        console.log("✅ Verification successful. Token generated.");
        console.log("=========================================");

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
        console.error("❌ verifyOtp Controller Error:", error);
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
        console.log("=========================================");
        console.log("📩 [POST] /api/partner/login-with-otp hit");
        console.log("Request Body:", req.body);

        const { mobile, firebaseToken } = req.body;
        if (!mobile || !firebaseToken) {
            console.warn("⚠️ Missing fields in request body.");
            return res.status(400).json({ message: 'Mobile and Firebase Token are required' });
        }

        await verifyFirebaseIdToken(firebaseToken);

        const partner = await Partner.findOne({ mobile });
        if (!partner) {
            console.warn(`⚠️ Partner profile not found for: ${mobile}`);
            return res.status(404).json({ message: 'Partner profile not found.' });
        }

        if (!partner.isActive) {
            if (partner.deactivatedBy === 'admin') {
                console.warn(`⚠️ Blocked deactivated login for: ${mobile}`);
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
                console.log(`✅ Account auto-reactivated for: ${mobile}`);
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

        console.log("✅ Login flow completed successfully.");
        console.log("=========================================");
        return res.status(200).json(response);
    } catch (error) {
        console.error("❌ loginWithOtp Controller Error:", error);
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