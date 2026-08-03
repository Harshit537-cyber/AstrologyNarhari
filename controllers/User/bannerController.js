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



const Card = require("../../models/Banner/Card");

// Get All Cards (User)
const getAllCards = async (req, res) => {
    try {
        const cards = await Card.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Cards fetched successfully.",
            data: cards,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

module.exports = {
    getUserBanners,
    getPartnerBanners,
    getAllCards
};