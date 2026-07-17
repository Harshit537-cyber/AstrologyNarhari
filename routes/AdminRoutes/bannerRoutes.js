const express = require("express");
const router = express.Router();

const {
    addBanner,
    getAllBanners,
    getBannerById,
    updateBanner,
    deleteBanner
} = require("../../controllers/admin/bannerController");


const upload = require('../../middleware/upload');
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Admin Routes
router.post(
    "/",verifyToken, isAdmin,
    upload.single("image"),
    addBanner
);

router.get("/", verifyToken, isAdmin, getAllBanners);
router.get("/:id", getBannerById);
router.put(
    "/:id", verifyToken, isAdmin,
    upload.single("image"),
    updateBanner
);
router.delete("/:id", verifyToken, isAdmin, deleteBanner);

module.exports = router;
