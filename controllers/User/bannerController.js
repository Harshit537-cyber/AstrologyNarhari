const Banner = require("../../models/Banner/Banner");
const getUserBanners = async (req, res) => {
    try {
        const banners = await Banner.find({
            isActive: true,
            bannerFor: "user"
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "User banners fetched successfully",
            data: banners
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



const getPartnerBanners = async (req, res) => {
    try {
        const banners = await Banner.find({
            isActive: true,
            bannerFor: "partner"
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Partner banners fetched successfully",
            data: banners
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getUserBanners,
    getPartnerBanners
};