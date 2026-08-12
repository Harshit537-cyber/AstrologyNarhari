const CommissionConfig = require('../../models/Partner/CommissionConfig');
const Partner = require('../../models/Partner/Partner');

exports.setPartnerCommission = async (req, res) => {
    try {
        const { partnerId, commissionPercentage } = req.body;
        const adminId = req.user?.id || req.user?._id; 

        if (!partnerId || commissionPercentage === undefined) {
            return res.status(400).json({
                success: false,
                message: "Partner ID and Commission Percentage are required."
            });
        }

        const partner = await Partner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found."
            });
        }

        const config = await CommissionConfig.findOneAndUpdate(
            { partnerId: partnerId },
            { 
                commissionPercentage: commissionPercentage,
                lastUpdatedBy: adminId 
            },
            { new: true, upsert: true } 
        );

        res.status(200).json({
            success: true,
            message: `Commission set to ${commissionPercentage}% for partner ${partner.fullName || partner.mobile}`,
            data: config
        });

    } catch (error) {
        console.error("SET_COMMISSION_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

exports.getAllCommissions = async (req, res) => {
    try {
        const commissions = await CommissionConfig.find().populate('partnerId', 'fullName mobile');
        res.status(200).json({
            success: true,
            data: commissions
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCommissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const commission = await CommissionConfig.findById(id).populate('partnerId', 'fullName mobile profilePic');

        if (!commission) {
            return res.status(404).json({ success: false, message: "Commission record not found." });
        }

        res.status(200).json({ success: true, data: commission });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

exports.getCommissionByPartnerId = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const commission = await CommissionConfig.findOne({ partnerId }).populate('partnerId', 'fullName mobile');

        if (!commission) {
            return res.status(404).json({ success: false, message: "No commission set for this partner." });
        }

        res.status(200).json({ success: true, data: commission });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

exports.deleteCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CommissionConfig.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        res.status(200).json({ 
            success: true, 
            message: "Commission rule deleted. Partner will now use default commission." 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

exports.updateCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const { commissionPercentage } = req.body;
        const adminId = req.user?.id || req.user?._id;

        const updatedConfig = await CommissionConfig.findByIdAndUpdate(
            id,
            { commissionPercentage, lastUpdatedBy: adminId },
            { new: true, runValidators: true }
        );

        if (!updatedConfig) {
            return res.status(404).json({ success: false, message: "Commission record not found." });
        }

        res.status(200).json({
            success: true,
            message: "Commission updated successfully.",
            data: updatedConfig
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};