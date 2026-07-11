const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, role: 'admin' });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );
        res.status(200).json({
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




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
            User.countDocuments({ role: "partner" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({
                role: "user",
                createdAt: { $gte: today }
            }),
            User.countDocuments({
                role: "partner",
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

module.exports = { 
    register, login, getDashboardStats, getRecentUsers, getUserAnalytics
 };