const express = require('express');
const router = express.Router();
const { verifyToken, isUser } = require('../../middleware/auth');
const upload = require("../../middleware/upload");
const { 
    createProfile, 
    getDashboardHoroscope, 
    getProfileForKundli,
    getProfile,
    editProfile
} = require('../../controllers/User/userProfileController');

router.post("/create-profile", verifyToken, isUser, upload.single("profilePic"), createProfile);
router.get("/dashboard-horoscope", verifyToken, isUser, getDashboardHoroscope);
router.get("/profile-for-kundli", verifyToken, isUser, getProfileForKundli);
router.get("/get-profile", verifyToken, isUser, getProfile);
router.put("/edit-profile", verifyToken, isUser, upload.single("profilePic"), editProfile);

module.exports = router;