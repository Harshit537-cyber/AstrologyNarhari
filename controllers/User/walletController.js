const User = require('../../models/User');

const addMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + Number(amount);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Money added to wallet successfully',
            walletBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('walletBalance');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            walletBalance: user.walletBalance || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { addMoney, getBalance };