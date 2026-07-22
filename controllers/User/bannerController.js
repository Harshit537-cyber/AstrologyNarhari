const Banner = require("../../models/Banner/Banner");

const getBanners = async (req, res) => {
    try {

        const banners = await Banner.find({
            isActive: true
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: banners.length,
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
    getBanners
};