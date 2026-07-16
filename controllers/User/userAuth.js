const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const jwt = require('jsonwebtoken');
const { DEACTIVATION_REASONS, ALLOWED_DURATIONS } = require('../../utils/deactivationReasons');

const sendOTP = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }

        let user = await User.findOne({ mobile });

        if (!user) {
            user = new User({
                mobile,
                otp: '123456'
            });
        } else {
            user.otp = '123456';
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });
        }

        const user = await User.findOne({ mobile });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (otp !== '123456') {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (!user.isActive) {
            if (user.deactivatedBy === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been deactivated by admin. Please contact admin for assistance.'
                });
            }

            if (user.reactivateAt && new Date() >= user.reactivateAt) {
                user.isActive = true;
                user.deactivatedBy = null;
                user.deactivatedAt = null;
                user.reactivateAt = null;
                user.deactivationReason = null;
                user.deactivationReasonNote = null;
                user.deactivationDuration = null;
            }
        }

        user.otp = null;
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '30d' }
        );

        const isProfileComplete = !!user.fullName;

        const response = {
            success: true,
            message: 'OTP verified successfully',
            token,
            isProfileComplete,
            user: {
                id: user._id,
                mobile: user.mobile,
                role: user.role,
                fullName: user.fullName,
                isActive: user.isActive
            }
        };

        if (!user.isActive) {
            response.message = 'Your account is deactivated. Reactivate to continue.';
            response.deactivationInfo = {
                reason: user.deactivationReason,
                reasonNote: user.deactivationReasonNote,
                duration: user.deactivationDuration,
                deactivatedAt: user.deactivatedAt,
                reactivateAt: user.reactivateAt
            };
        }

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deactivateAccount = async (req, res) => {
    try {
        const { reason, reasonNote, duration } = req.body;

        if (!reason || !DEACTIVATION_REASONS.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: `Reason is required and must be one of: ${DEACTIVATION_REASONS.join(', ')}`
            });
        }

        if (duration !== undefined && duration !== null && !ALLOWED_DURATIONS.includes(Number(duration))) {
            return res.status(400).json({
                success: false,
                message: 'Duration must be 7, 15, 30, or omitted for indefinite deactivation'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(400).json({ success: false, message: 'Account is already deactivated' });
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

        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully',
            data: {
                deactivatedAt: user.deactivatedAt,
                reactivateAt: user.reactivateAt,
                reason: user.deactivationReason
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const activateAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isActive) {
            return res.status(400).json({ success: false, message: 'Account is already active' });
        }

        if (user.deactivatedBy === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'This account was deactivated by admin. Please contact admin to reactivate.'
            });
        }

        user.isActive = true;
        user.deactivatedBy = null;
        user.deactivatedAt = null;
        user.reactivateAt = null;
        user.deactivationReason = null;
        user.deactivationReasonNote = null;
        user.deactivationDuration = null;

        await user.save();

        res.status(200).json({ success: true, message: 'Account activated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPartners = async (req, res) => {
    try {
        const partners = await Partner.find({
            isProfileComplete: true,
            isVerified: true,
            isActive: { $ne: false }
        })
        .select(
            'fullName profilePic specialties languages experience qualification expectedSalary averageRating totalReviews bio'
        )
        .sort({ averageRating: -1 });

        res.status(200).json({
            success: true,
            data: partners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { sendOTP, verifyOTP, deactivateAccount, activateAccount, getPartners };