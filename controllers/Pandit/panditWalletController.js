const Pandit = require('../../models/Pandit/Pandit');
const RitualBooking = require('../../models/Ritual/RitualBooking');

const getPanditWalletBalance = async (req, res) => {
    try {
        const panditId = req.user.id;
        const pandit = await Pandit.findById(panditId).select('walletBalance fullName mobile');

        if (!pandit) {
            return res.status(404).json({ success: false, message: "Pandit not found" });
        }

        return res.status(200).json({
            success: true,
            walletBalance: pandit.walletBalance || 0,
            pandit: {
                id: pandit._id,
                fullName: pandit.fullName,
                mobile: pandit.mobile
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPanditEarningsHistory = async (req, res) => {
    try {
        const panditId = req.user.id;
        
        const acceptedBookings = await RitualBooking.find({ 
            panditId: panditId, 
            status: 'Accepted' 
        })
        .populate('userId', 'fullName mobile')
        .populate('ritualId', 'title price')
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            totalEarnings: acceptedBookings.reduce((acc, item) => acc + (item.paymentDetails?.amount || 0), 0),
            data: acceptedBookings
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPanditWalletBalance,
    getPanditEarningsHistory
};