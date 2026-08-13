const Banner = require("../../models/Banner/Banner");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");

const addBanner = async (req, res) => {
    try {
        let imageUrl = null;

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "banners"
            });
            imageUrl = result.secure_url;
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        }

        const banner = await Banner.create({
            title: req.body.title,
            image: imageUrl,
            type: req.body.type,
            bannerFor: req.body.bannerFor,
            redirectType: req.body.redirectType,
            slug: req.body.slug,
            redirectId: req.body.redirectId || null,
            redirectUrl: req.body.redirectUrl || null,
            isActive: req.body.isActive !== undefined ? req.body.isActive === "true" || req.body.isActive === true : true,
            priority: req.body.priority ? Number(req.body.priority) : 0
        });

        return res.status(201).json({
            success: true,
            message: "Banner added successfully",
            data: banner
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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

const getActiveBanners = async (req, res) => {
    try {
        const { bannerFor, type } = req.query;
        const filter = { isActive: true };

        if (bannerFor) filter.bannerFor = bannerFor;
        if (type) filter.type = type;

        const banners = await Banner.find(filter).sort({ priority: 1 });

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
        const updateData = {};

        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.type !== undefined) updateData.type = req.body.type;
        if (req.body.slug !== undefined) updateData.slug = req.body.slug;
        if (req.body.bannerFor !== undefined) updateData.bannerFor = req.body.bannerFor;
        if (req.body.redirectType !== undefined) updateData.redirectType = req.body.redirectType;
        if (req.body.redirectId !== undefined) updateData.redirectId = req.body.redirectId || null;
        if (req.body.redirectUrl !== undefined) updateData.redirectUrl = req.body.redirectUrl || null;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === "true" || req.body.isActive === true;
        if (req.body.priority !== undefined) updateData.priority = Number(req.body.priority);

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "banners"
            });
            updateData.image = result.secure_url;
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const toggleBannerStatus = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        return res.status(200).json({
            success: true,
            message: `Banner ${banner.isActive ? "activated" : "deactivated"} successfully`,
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
    getActiveBanners,
    getBannerById,
    updateBanner,
    toggleBannerStatus,
    deleteBanner
};