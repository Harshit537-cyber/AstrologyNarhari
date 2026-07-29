const express = require("express");
const router = express.Router();

const {
    addBanner,
    getAllBanners,
    getActiveBanners,
    getBannerById,
    updateBanner,
    toggleBannerStatus,
    deleteBanner
} = require("../../controllers/admin/bannerController");

const upload = require('../../middleware/upload');
const { verifyToken, isAdmin } = require("../../middleware/auth");

router.post(
    "/", 
    verifyToken, 
    isAdmin,
    upload.single("image"),
    addBanner
);

router.get("/", verifyToken, isAdmin, getAllBanners);
router.get("/active", getActiveBanners);
router.get("/:id", getBannerById);

router.put(
    "/:id", 
    verifyToken, 
    isAdmin,
    upload.single("image"),
    updateBanner
);

router.patch("/:id/toggle-status", verifyToken, isAdmin, toggleBannerStatus);
router.delete("/:id", verifyToken, isAdmin, deleteBanner);

module.exports = router;