const User = require('../../models/User');
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

        let user = await User.findById(userId);
        if (!user) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(404).json({ message: "User not found" });
        }

        if (user.fullName) {
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
            }
        }

        user.fullName = fullName;
        user.name = fullName;
        user.gender = gender;
        user.dateOfBirth = dateOfBirth;
        user.timeOfBirth = timeOfBirth;
        user.placeOfBirth = placeOfBirth;
        user.profilePic = profilePicUrl;
        user.zodiac = zodiacSign;

        await user.save();
        res.status(201).json({ success: true, data: user });

    } catch (error) {
        console.error("Error in createProfile:", error);
        
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error(unlinkError);
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
        const profile = await User.findById(userId);
        if (!profile || !profile.fullName) {
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

exports.getProfileForKundli = async (req, res) => {
    try {
        const userId = req.user.id; 

        const profile = await User.findById(userId).select(
            'fullName gender dateOfBirth timeOfBirth placeOfBirth profilePic'
        );

        if (!profile || !profile.fullName) {
            return res.status(404).json({
                success: false,
                message: "Profile not found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                fullName: profile.fullName,
                profilePic: profile.profilePic,
                gender: profile.gender,
                dateOfBirth: profile.dateOfBirth,
                timeOfBirth: profile.timeOfBirth,
                placeOfBirth: profile.placeOfBirth
            }
        });

    } catch (error) {
        console.error("Error fetching pre-fill details:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};