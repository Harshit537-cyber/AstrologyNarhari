const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const Pandit = require('../../models/Pandit/Pandit');
const admin = require('../../config/firebase');
const { DEACTIVATION_REASONS, ALLOWED_DURATIONS } = require('../../utils/deactivationReasons');
const Transaction = require('../../models/Transaction/Transaction'); 
const RitualTransaction = require('../../models/Ritual/RitualTransaction');

const verifyOTP = async (req, res) => {
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
                message: "Firebase ID Token or Mobile number is required" 
            });
        }

        let user = await User.findOne({ mobile });

        if (!user) {
            user = await User.create({
                mobile,
                role: 'user',
                isVerified: true
            });
        } else {
            if (user.isActive === false && user.deactivatedBy === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Account deactivated by admin. Please contact support.'
                });
            }

            user.isVerified = true;
            user.isActive = true;
            user.deactivatedBy = null;
            user.deactivatedAt = null;
            user.reactivateAt = null;
            user.deactivationReason = null;
            user.deactivationReasonNote = null;
            user.deactivationDuration = null;

            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, role: user.role || 'user' },
            process.env.JWT_SECRET || 'SECRET_KEY_123',
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: "Authentication successful",
            token,
            data: {
                id: user._id,
                mobile: user.mobile,
                isProfileComplete: Boolean(user.fullName),
                isActive: true
            }
        });

    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: "Invalid or expired Firebase token", 
            error: error.message 
        });
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

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const now = new Date();
        user.isActive = false;
        user.deactivatedBy = 'self';
        user.deactivatedAt = now;
        user.deactivationReason = reason;
        user.deactivationReasonNote = reasonNote || null;
        user.deactivationDuration = duration ? Number(duration) : null;
        user.reactivateAt = duration ? new Date(now.getTime() + Number(duration) * 24 * 60 * 60 * 1000) : null;

        await user.save();

        return res.status(200).json({ success: true, message: 'Account deactivated successfully', data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const activateAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.deactivatedBy === 'admin') {
            return res.status(403).json({ success: false, message: 'Account deactivated by admin. Contact support.' });
        }

        user.isActive = true;
        user.deactivatedBy = null;
        user.deactivatedAt = null;
        user.reactivateAt = null;
        user.deactivationReason = null;
        user.deactivationReasonNote = null;
        user.deactivationDuration = null;

        await user.save();

        return res.status(200).json({ success: true, message: 'Account reactivated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const searchExperts = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        };

        if (search) {
            query.fullName = { $regex: search, $options: 'i' };
        }

        const experts = await Partner.find(query)
            .select('fullName profilePic specialties languages experience minRate averageRating totalReviews isOnline')
            .lean();

        return res.status(200).json({ success: true, data: experts });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPartners = async (req, res) => {
    try {
        const partners = await Partner.find({
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        })
        .select('fullName profilePic specialties languages experience minRate averageRating totalReviews isOnline')
        .limit(20)
        .lean();

        return res.status(200).json({ success: true, data: partners });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAllPartnersForUser = async (req, res) => {
    try {
        const partners = await Partner.find({
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        })
        .select('fullName profilePic specialties languages experience minRate averageRating totalReviews isOnline firebaseUid')
        .lean();

        return res.status(200).json({ success: true, data: partners });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAllPandits = async (req, res) => {
    try {
        const pandits = await Pandit.find({
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        })
        .select('fullName profilePic city primaryCategory expertise languages experience minPoojaFee bio averageRating totalReviews isOnline canArrangeSamagri poojaServiceMode')
        .lean();

        return res.status(200).json({ 
            success: true, 
            count: pandits.length,
            data: pandits 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const searchPandits = async (req, res) => {
    try {
        const { search, city, category } = req.query;
        let query = {
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        };

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { primaryCategory: { $regex: search, $options: 'i' } }
            ];
        }

        if (city) {
            query.city = { $regex: city, $options: 'i' };
        }

        if (category) {
            query.primaryCategory = { $regex: category, $options: 'i' };
        }

        const pandits = await Pandit.find(query)
            .select('fullName profilePic city primaryCategory expertise languages experience minPoojaFee bio averageRating totalReviews isOnline canArrangeSamagri poojaServiceMode')
            .lean();

        return res.status(200).json({ 
            success: true, 
            count: pandits.length,
            data: pandits 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPanditById = async (req, res) => {
    try {
        const { id } = req.params;
        const pandit = await Pandit.findOne({
            _id: id,
            isVerified: true,
            isProfileComplete: true,
            profileApprovalStatus: 'Approved'
        }).select('-fcmToken -__v');

        if (!pandit) {
            return res.status(404).json({ success: false, message: 'Pandit not found or profile not approved' });
        }

        return res.status(200).json({
            success: true,
            data: pandit
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateFCMToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.id;

        if (!fcmToken) {
            return res.status(400).json({ success: false, message: 'FCM Token is required' });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { fcmToken }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'FCM Token updated successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

const logoutUser = async (req, res) => {
    try {
        const userId = req.user.id; 

        const user = await User.findByIdAndUpdate(
            userId, 
            { fcmToken: null }, 
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Logged out successfully and FCM token removed' 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Account permanently deleted successfully' 
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Error deleting account', 
            error: error.message 
        });
    }
};

const getUserTransactionHistory =  async (req, res) => {
    try {
        const userId = req.user.id || req.user._id; 
        const { type } = req.query;

        if (!type) {
            return res.status(400).json({ success: false, message: "Query type (wallet or ritual) is required" });
        }

        let data = [];

        if (type === 'wallet') {
            data = await Transaction.find({ user: userId })
                .sort({ createdAt: -1 })
                .select('amount status type razorpay_order_id razorpay_payment_id createdAt');

            return res.status(200).json({
                success: true,
                message: "Wallet history fetched successfully",
                data
            });
        } 

        else if (type === 'ritual') {
            data = await RitualTransaction.find({ userId: userId })
                .sort({ createdAt: -1 })
                .populate('partnerId', 'name') 
                .select('ritualName totalAmountPaid status ritualPrice orderId logisticsFee taxAmount createdAt');

            return res.status(200).json({
                success: true,
                message: "Ritual transaction history fetched successfully",
                data
            });
        } 

        else {
            return res.status(400).json({ success: false, message: "Invalid type. Use 'wallet' or 'ritual'" });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    verifyOTP,
    deactivateAccount,
    activateAccount,
    searchExperts,
    getPartners,
    getAllPartnersForUser,
    getAllPandits,
    searchPandits,
    getPanditById,
    updateFCMToken,
    deleteAccount,
    logoutUser,
    getUserTransactionHistory
};