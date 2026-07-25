const express = require("express");
const router = express.Router();

const bannerController = require("../../controllers/User/bannerController");
const { isAdmin } = require("../../middleware/auth");

// =======================
// User API
// =======================

// Get Active Banners
router.get("/user-banners",bannerController.getUserBanners);
router.get("/partner-banners", bannerController.getPartnerBanners);



module.exports = router;