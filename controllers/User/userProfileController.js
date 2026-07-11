const UserProfile = require('../../models/user/UserProfile');
const cloudinary = require('../../config/cloudinary');
const getZodiacSign = require('../../utils/zodiacHelper');
const fs = require('fs');
const path = require('path');

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
