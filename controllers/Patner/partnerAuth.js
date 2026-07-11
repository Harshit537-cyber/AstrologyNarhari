const Partner = require('../../models/Partner/Partner');
const jwt = require('jsonwebtoken');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

const uploadToCloudinary = async (filePath, folder) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, { folder });
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return result.secure_url;
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
};

const sendOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ message: 'Mobile number is required' });
        }

        const dummyOtp = '123456';
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        let partner = await Partner.findOne({ mobile });
        if (!partner) {
            partner = new Partner({ mobile });
        }

        partner.otp = dummyOtp;
        partner.otpExpiry = otpExpiry;
        await partner.save();

        res.status(200).json({ message: 'OTP sent successfully', otp: dummyOtp });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        if (!mobile || !otp) {
            return res.status(400).json({ message: 'Mobile and OTP are required' });
        }

        const partner = await Partner.findOne({ mobile });
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        if (partner.otp !== otp || new Date() > partner.otpExpiry) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        partner.otp = undefined;
        partner.otpExpiry = undefined;
        partner.isVerified = true;
        await partner.save();

        const token = jwt.sign(
            { id: partner._id, role: partner.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            message: 'OTP verified successfully',
            token,
            isProfileComplete: partner.isProfileComplete,
            partner: {
                id: partner._id,
                mobile: partner.mobile,
                role: partner.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const register = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        if (partner.isProfileComplete === true) {
            if (req.files) {
                if (req.files.profilePic && req.files.profilePic[0] && fs.existsSync(req.files.profilePic[0].path)) {
                    fs.unlinkSync(req.files.profilePic[0].path);
                }
                if (req.files.additionalPhotos) {
                    req.files.additionalPhotos.forEach((file) => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            }
            return res.status(400).json({ message: 'Partner with this mobile number is already registered' });
        }

        const {
            fullName,
            dateOfBirth,
            gender,
            city,
            specialties,
            languages,
            experience,
            qualification,
            expectedSalary,
            bio
        } = req.body;

        let profilePicUrl = partner.profilePic;
        if (req.files && req.files.profilePic && req.files.profilePic[0]) {
            profilePicUrl = await uploadToCloudinary(
                req.files.profilePic[0].path,
                'partners/profiles'
            );
        }

        let additionalPhotosUrls = partner.additionalPhotos || [];
        if (req.files && req.files.additionalPhotos) {
            const uploadPromises = req.files.additionalPhotos.map((file) =>
                uploadToCloudinary(file.path, 'partners/gallery')
            );
            const uploadedUrls = await Promise.all(uploadPromises);
            additionalPhotosUrls = [...additionalPhotosUrls, ...uploadedUrls].slice(0, 4);
        }

        partner.fullName = fullName;
        partner.profilePic = profilePicUrl;
        partner.dateOfBirth = dateOfBirth;
        partner.gender = gender;
        partner.city = city;
        partner.specialties = typeof specialties === 'string' ? JSON.parse(specialties) : specialties;
        partner.languages = typeof languages === 'string' ? JSON.parse(languages) : languages;
        partner.experience = experience;
        partner.qualification = qualification;
        partner.expectedSalary = expectedSalary;
        partner.additionalPhotos = additionalPhotosUrls;
        partner.bio = bio;
        partner.isProfileComplete = true;

        await partner.save();

        res.status(200).json({
            message: 'Partner profile registered successfully',
            partner: {
                id: partner._id,
                mobile: partner.mobile,
                role: partner.role,
                isProfileComplete: partner.isProfileComplete,
                fullName: partner.fullName,
                profilePic: partner.profilePic,
                dateOfBirth: partner.dateOfBirth,
                gender: partner.gender,
                city: partner.city,
                specialties: partner.specialties,
                languages: partner.languages,
                experience: partner.experience,
                qualification: partner.qualification,
                expectedSalary: partner.expectedSalary,
                additionalPhotos: partner.additionalPhotos,
                bio: partner.bio
            }
        });
    } catch (error) {
        if (req.files) {
            if (req.files.profilePic && req.files.profilePic[0] && fs.existsSync(req.files.profilePic[0].path)) {
                fs.unlinkSync(req.files.profilePic[0].path);
            }
            if (req.files.additionalPhotos) {
                req.files.additionalPhotos.forEach((file) => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = { sendOtp, verifyOtp, register };