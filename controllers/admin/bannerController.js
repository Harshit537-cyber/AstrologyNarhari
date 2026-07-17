const Banner = require("../../models/Banner/Banner");


const cloudinary = require("../../config/cloudinary"); // apna cloudinary config
const fs = require("fs");

const addBanner = async (req, res) => {
    try {

        let imageUrl = null;

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "banners"
            });

            imageUrl = result.secure_url;

            // Local file delete
            fs.unlinkSync(req.file.path);
        }

        const banner = await Banner.create({
            title: req.body.title,
            image: imageUrl,
            type: req.body.type,
            redirectType: req.body.redirectType,
            redirectId: req.body.redirectId || null,
            redirectUrl: req.body.redirectUrl || null,
            isActive: req.body.isActive === "true",
            priority: Number(req.body.priority)
        });

        return res.status(201).json({
            success: true,
            message: "Banner added successfully",
            data: banner
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getAllBanners = async (req, res) => {
    try {

        const banners = await Banner.find().sort({ priority: 1 });

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


const getBannerById = async (req, res) => {
    try {

        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: banner
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};




const updateBanner = async (req, res) => {
    try {

        const updateData = {
            title: req.body.title,
            type: req.body.type,
            redirectType: req.body.redirectType,
            redirectId: req.body.redirectId || null,
            redirectUrl: req.body.redirectUrl || null,
            isActive: req.body.isActive === "true",
            priority: Number(req.body.priority)
        };

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "banners"
            });

            updateData.image = result.secure_url;

            fs.unlinkSync(req.file.path);
        }

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: banner
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const deleteBanner = async (req, res) => {
    try {

        const banner = await Banner.findByIdAndDelete(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = {
    addBanner,
    getAllBanners,
    getBannerById,
    updateBanner,
    deleteBanner
};