const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DEACTIVATION_REASONS, ALLOWED_DURATIONS } = require('../../utils/deactivationReasons');

const register = async (req, res) => {
    try {
        const { name, email, password, mobile, role } = req.body;

        if (!name || !email || !password || !mobile) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields (name, email, password, mobile) are required' 
            });
        }

        const existingUser = await User.findOne({ 
            $or: [{ email }, { mobile }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or mobile already exists' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const allowedRoles = ['user', 'partner', 'admin'];
        const assignedRole = allowedRoles.includes(role?.toLowerCase()) 
            ? role.toLowerCase() 
            : 'user';

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            mobile,
            role: assignedRole
        });

        await newUser.save();

        res.status(201).json({ 
            success: true,
            message: `${assignedRole.charAt(0).toUpperCase() + assignedRole.slice(1)} registered successfully`,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, role: 'user' });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // --- Deactivation check ---
        if (!user.isActive) {
            if (user.deactivatedBy === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been deactivated by admin. Please contact admin for assistance.'
                });
            }

            // self-deactivated: agar duration poori ho chuki hai to auto-reactivate
            if (user.reactivateAt && new Date() >= user.reactivateAt) {
                user.isActive = true;
                user.deactivatedBy = null;
                user.deactivatedAt = null;
                user.reactivateAt = null;
                user.deactivationReason = null;
                user.deactivationReasonNote = null;
                user.deactivationDuration = null;
                await user.save();
            }
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );

        const response = {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
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
        res.status(500).json({ error: error.message });
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

module.exports = { register, login, deactivateAccount, activateAccount };