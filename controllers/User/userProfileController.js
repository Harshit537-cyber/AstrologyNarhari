const UserProfile = require('../../models/user/UserProfile');
const cloudinary = require('../../config/cloudinary');
const getZodiacSign = require('../../utils/zodiacHelper');
const fs = require('fs');
const path = require('path');
const getDailyHoroscope = require('../../utils/horoscopeGenerator');

exports.createProfile = async (req, res) => {
    const filePath = req.file ? req.file.path : null;

    try {
        const { fullName, gender, dateOfBirth, timeOfBirth, placeOfBirth } = req.body;
        const userId = req.user.id;

        let profile = await UserProfile.findOne({ user: userId });
        if (profile) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ message: "Profile already exists" });
        }

        const zodiacSign = getZodiacSign(dateOfBirth);

        let profilePicUrl = "";
        if (filePath) {
            if (fs.existsSync(filePath)) {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: "user_profiles",
                });
                profilePicUrl = result.secure_url;
                                fs.unlinkSync(filePath);
            } else {
                console.log("File not found at path:", filePath);
            }
        }

        profile = new UserProfile({
            user: userId,
            fullName,
            gender,
            dateOfBirth,
            timeOfBirth,
            placeOfBirth,
            profilePic: profilePicUrl,
            zodiac: zodiacSign
        });

        await profile.save();
        res.status(201).json({ success: true, data: profile });

    } catch (error) {
        console.error("Error in createProfile:", error);
        
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error("Could not delete temp file:", unlinkError);
            }
        }

        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};


exports.getDashboardHoroscope = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await UserProfile.findOne({ user: userId });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found. Please create your profile first."
            });
        }
        const horoscopeData = getDailyHoroscope(profile.zodiac);
        res.status(200).json({
            success: true,
            data: {
                user: {
                    fullName: profile.fullName,
                    profilePic: profile.profilePic || "default_url_here",
                    zodiac: profile.zodiac
                },
                horoscope: {
                    zodiacSign: profile.zodiac,
                    prediction: horoscopeData.prediction,
                    luckyColor: horoscopeData.luckyColor,
                    luckyNumber: horoscopeData.luckyNumber,
                    alignment: horoscopeData.alignment,
                    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                }
            }
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};