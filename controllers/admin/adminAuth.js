const jwt = require('jsonwebtoken');
const User = require('../../models/User.js');
const Partner = require("../../models/Partner/Partner");

const DUMMY_OTP = "123456";

const sendAdminOTP = async (req, res) => {
    try {
        const { mobile, action } = req.body;
        if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });

        if (action === 'register') {
            const existingUser = await User.findOne({ mobile });
            if (existingUser) return res.status(400).json({ success: false, message: 'Mobile number already registered' });
        } else if (action === 'login') {
            const existingAdmin = await User.findOne({ mobile, role: 'admin' });
            if (!existingAdmin) return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        return res.status(200).json({ success: true, message: `OTP sent. Use ${DUMMY_OTP}` });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const register = async (req, res) => {
    try {
        const { name, mobile, otp } = req.body;
        if (otp !== DUMMY_OTP) return res.status(400).json({ success: false, message: 'Invalid OTP' });

        let admin = await User.findOne({ mobile }) || new User({ mobile });
        admin.name = name;
        admin.role = 'admin';
        admin.isActive = true;
        await admin.save();

        const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });
        return res.status(201).json({ success: true, token, admin });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        if (otp !== DUMMY_OTP) return res.status(400).json({ success: false, message: 'Invalid OTP' });

        const admin = await User.findOne({ mobile, role: 'admin' });
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

        const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });
        return res.status(200).json({ success: true, token, admin });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalPartners, totalAdmins] = await Promise.all([
            User.countDocuments({ role: "user" }),
            Partner.countDocuments(),
            User.countDocuments({ role: "admin" })
        ]);
        res.status(200).json({ success: true, data: { totalUsers, totalPartners, totalAdmins } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getRecentUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).limit(10);
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getUserAnalytics = async (req, res) => {
    try {
        const analytics = await User.aggregate([{ $group: { _id: "$role", total: { $sum: 1 } } }]);
        res.json({ success: true, data: analytics });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUserById = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getPartnerById = async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);
        res.status(200).json({ success: true, data: partner });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updatePartner = async (req, res) => {
    try {
        const partner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: partner });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deletePartner = async (req, res) => {
    try {
        await Partner.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Partner deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updatePartnerDocumentStatus = async (req, res) => {
    try {
        const { partnerId, document, status } = req.body;
        const partner = await Partner.findById(partnerId);
        if (partner && partner[document]) {
            partner[document].status = status;
            await partner.save();
        }
        res.status(200).json({ success: true, message: "Status updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const approvePartnerProfile = async (req, res) => {
    try {
        const partner = await Partner.findByIdAndUpdate(req.params.id, { profileApprovalStatus: req.body.status }, { new: true });
        res.status(200).json({ success: true, data: partner });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deactivateUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isActive: false, deactivationReason: req.body.reason });
        res.status(200).json({ success: true, message: "Deactivated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const activateUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isActive: true });
        res.status(200).json({ success: true, message: "Activated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deactivatePartner = async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, { isActive: false, deactivationReason: req.body.reason });
        res.status(200).json({ success: true, message: "Partner Deactivated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const activatePartner = async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, { isActive: true });
        res.status(200).json({ success: true, message: "Partner Activated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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