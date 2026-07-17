const User = require('../../models/User');
const cloudinary = require('../../config/cloudinary');
const getZodiacSign = require('../../utils/zodiacHelper');
const fs = require('fs');
const path = require('path');

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

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-otp -__v');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Error in getProfile:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

exports.editProfile = async (req, res) => {
    const filePath = req.file ? req.file.path : null;

    try {
        const userId = req.user.id;
        const { fullName, gender, dateOfBirth, timeOfBirth, placeOfBirth } = req.body;

        let user = await User.findById(userId);
        if (!user) {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (fullName !== undefined) {
            user.fullName = fullName;
            user.name = fullName;
        }
        if (gender !== undefined) user.gender = gender;
        if (timeOfBirth !== undefined) user.timeOfBirth = timeOfBirth;
        if (placeOfBirth !== undefined) user.placeOfBirth = placeOfBirth;

        if (dateOfBirth !== undefined) {
            user.dateOfBirth = dateOfBirth;
            user.zodiac = getZodiacSign(dateOfBirth);
        }

        if (filePath) {
            if (fs.existsSync(filePath)) {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: "user_profiles",
                });
                user.profilePic = result.secure_url;
                fs.unlinkSync(filePath);
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user
        });

    } catch (error) {
        console.error("Error in editProfile:", error);
        
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error("Error deleting temp file:", unlinkError);
            }
        }

        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};