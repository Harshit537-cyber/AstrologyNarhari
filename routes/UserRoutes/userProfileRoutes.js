const express = require('express');
const router = express.Router();
const {verifyToken, isUser} = require('../../middleware/auth');
const upload = require("../../middleware/upload");
const { createProfile,getDashboardHoroscope } = require('../../controllers/User/userProfileController');


router.post("/create-profile", verifyToken, isUser,upload.single("profilePic") , createProfile );
router.get("/dashboard-horoscope", verifyToken, isUser, getDashboardHoroscope)

module.exports = router;