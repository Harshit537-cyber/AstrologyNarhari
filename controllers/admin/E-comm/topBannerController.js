const TopBanner = require("../../../models/E-comm/TopBanner");
const cloudinary = require("../../../config/cloudinary");



exports.addTopBanner = async (req, res) => {
    try {
        const {
            title,
            subtitle,
            buttonText,
            redirectType,
            redirectValue,
            displayOrder,
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Title is required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Banner image is required",
            });
        }

        const uploaded = await cloudinary.uploader.upload(req.file.path, {
            folder: "top-banners",
        });

        const banner = await TopBanner.create({
            title,
            subtitle,
            image: uploaded.secure_url,
            buttonText,
            redirectType,
            redirectValue,
            displayOrder,
        });

        return res.status(201).json({
            success: true,
            message: "Top banner created successfully",
            data: banner,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


exports.getTopBanners = async (req, res) => {
    try {

        const banners = await TopBanner.find()
            .sort({ displayOrder: 1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: banners,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};


exports.getTopBannerById = async (req, res) => {
    try {

        const banner = await TopBanner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: banner,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};


exports.updateTopBanner = async (req, res) => {
    try {

        const banner = await TopBanner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        const {
            title,
            subtitle,
            buttonText,
            redirectType,
            redirectValue,
            displayOrder,
            isActive,
        } = req.body;

        if (title !== undefined) banner.title = title;
        if (subtitle !== undefined) banner.subtitle = subtitle;
        if (buttonText !== undefined) banner.buttonText = buttonText;
        if (redirectType !== undefined) banner.redirectType = redirectType;
        if (redirectValue !== undefined) banner.redirectValue = redirectValue;
        if (displayOrder !== undefined) banner.displayOrder = displayOrder;
        if (isActive !== undefined) banner.isActive = isActive;

        if (req.file) {

            const uploaded = await cloudinary.uploader.upload(req.file.path, {
                folder: "top-banners",
            });

            banner.image = uploaded.secure_url;
        }

        await banner.save();

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: banner,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};


exports.deleteTopBanner = async (req, res) => {
    try {

        const banner = await TopBanner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        await banner.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully",
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};