const mongoose = require("mongoose");
const Pandit = require("../../models/Pandit/Pandit");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");

// =====================================================
// CREATE PANDIT
// =====================================================
const createPandit = async (req, res) => {
    try {
        const {
            mobile,
            isVerified,
            isProfileComplete,
            profileApprovalStatus,
            fullName,
            profilePic,
            dateOfBirth,
            gender,
            city,
            poojaServiceMode,
            expertise,
            primaryCategory,
            languages,
            experience,
            vedicEducation,
            canArrangeSamagri,
            expectedMonthlyEarnings,
            minPoojaFee,
            certificatePhotos,
            bio,
            isOnline
        } = req.body;

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required"
            });
        }

        const existingPandit = await Pandit.findOne({ mobile });

        if (existingPandit) {
            return res.status(409).json({
                success: false,
                message: "Pandit with this mobile number already exists"
            });
        }

        const pandit = await Pandit.create({
            mobile,
            role: "pandit",
            isVerified,
            isProfileComplete,
            profileApprovalStatus,
            fullName,
            profilePic,
            dateOfBirth,
            gender,
            city,
            poojaServiceMode,
            expertise,
            primaryCategory,
            languages,
            experience,
            vedicEducation,
            canArrangeSamagri,
            expectedMonthlyEarnings,
            minPoojaFee,
            certificatePhotos,
            bio,
            isOnline
        });

        return res.status(201).json({
            success: true,
            message: "Pandit created successfully",
            pandit
        });

    } catch (error) {
        console.error("Create Pandit Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


const getAllPandits = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            city,
            profileApprovalStatus,
            isVerified,
            isOnline
        } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        const filter = {};

        // Search
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { city: { $regex: search, $options: "i" } },
                { primaryCategory: { $regex: search, $options: "i" } }
            ];
        }

        if (city) {
            filter.city = { $regex: city, $options: "i" };
        }

        if (profileApprovalStatus) {
            filter.profileApprovalStatus = profileApprovalStatus;
        }

        if (isVerified !== undefined) {
            filter.isVerified = isVerified === "true";
        }

        if (isOnline !== undefined) {
            filter.isOnline = isOnline === "true";
        }

        const total = await Pandit.countDocuments(filter);

        const pandits = await Pandit.find(filter)
            .select("-fcmToken")
            .sort({ createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        return res.status(200).json({
            success: true,
            message: "Pandits fetched successfully",
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
            pandits
        });

    } catch (error) {
        console.error("Get All Pandits Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


// =====================================================
// GET SINGLE PANDIT
// =====================================================
const getPanditById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Pandit ID"
            });
        }

        const pandit = await Pandit.findById(id).select("-fcmToken");

        if (!pandit) {
            return res.status(404).json({
                success: false,
                message: "Pandit not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Pandit fetched successfully",
            pandit
        });

    } catch (error) {
        console.error("Get Pandit Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE PANDIT
// =====================================================
const updatePandit = async (req, res) => {
    try {
        const { id } = req.params;

        const pandit = await Pandit.findById(id);

        if (!pandit) {
            return res.status(404).json({
                success: false,
                message: "Pandit not found",
            });
        }

        const {
            fullName,
            mobile,
            dateOfBirth,
            gender,
            city,
            poojaServiceMode,
            primaryCategory,
            experience,
            vedicEducation,
            canArrangeSamagri,
            expectedMonthlyEarnings,
            minPoojaFee,
            bio,
            isVerified,
            isProfileComplete,
            profileApprovalStatus,
            isOnline,
        } = req.body;


        // Check duplicate mobile number
        if (mobile && mobile !== pandit.mobile) {

            const mobileExists = await Pandit.findOne({
                mobile,
                _id: { $ne: id },
            });

            if (mobileExists) {
                return res.status(400).json({
                    success: false,
                    message: "Mobile number already exists",
                });
            }
        }


        // Update basic fields
        if (fullName) pandit.fullName = fullName;

        if (mobile) pandit.mobile = mobile;

        if (dateOfBirth) pandit.dateOfBirth = dateOfBirth;

        if (gender) pandit.gender = gender;

        if (city) pandit.city = city;

        if (poojaServiceMode) {
            pandit.poojaServiceMode = poojaServiceMode;
        }

        if (primaryCategory) {
            pandit.primaryCategory = primaryCategory;
        }

        if (experience !== undefined) {
            pandit.experience = Number(experience);
        }

        if (vedicEducation) {
            pandit.vedicEducation = vedicEducation;
        }

        if (expectedMonthlyEarnings !== undefined) {
            pandit.expectedMonthlyEarnings =
                Number(expectedMonthlyEarnings);
        }

        if (minPoojaFee !== undefined) {
            pandit.minPoojaFee = Number(minPoojaFee);
        }

        if (bio) {
            pandit.bio = bio;
        }


        // Boolean fields
        if (canArrangeSamagri !== undefined) {
            pandit.canArrangeSamagri =
                canArrangeSamagri === "true";
        }

        if (isVerified !== undefined) {
            pandit.isVerified =
                isVerified === "true";
        }

        if (isProfileComplete !== undefined) {
            pandit.isProfileComplete =
                isProfileComplete === "true";
        }

        if (isOnline !== undefined) {
            pandit.isOnline =
                isOnline === "true";
        }

        if (profileApprovalStatus) {
            pandit.profileApprovalStatus =
                profileApprovalStatus;
        }


        // Array fields
        if (req.body.expertise) {
            pandit.expertise =
                JSON.parse(req.body.expertise);
        }

        if (req.body.languages) {
            pandit.languages =
                JSON.parse(req.body.languages);
        }

        if (req.body.certificatePhotos) {
            pandit.certificatePhotos =
                JSON.parse(req.body.certificatePhotos);
        }


        // Profile picture upload
        if (req.file) {

            const result =
                await cloudinary.uploader.upload(
                    req.file.path,
                    {
                        folder: "pandits/profilePic",
                    }
                );

            pandit.profilePic =
                result.secure_url;

            fs.unlinkSync(req.file.path);
        }


        await pandit.save();


        return res.status(200).json({
            success: true,
            message: "Pandit updated successfully",
            data: pandit,
        });

    } catch (error) {

        console.error("Update Pandit Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// DELETE PANDIT
// =====================================================
const deletePandit = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Pandit ID"
            });
        }

        const deletedPandit = await Pandit.findByIdAndDelete(id);

        if (!deletedPandit) {
            return res.status(404).json({
                success: false,
                message: "Pandit not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Pandit deleted successfully"
        });

    } catch (error) {
        console.error("Delete Pandit Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE APPROVAL STATUS
// =====================================================
const updatePanditApprovalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { profileApprovalStatus } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Pandit ID"
            });
        }

        const allowedStatuses = [
            "Pending",
            "Approved",
            "Rejected"
        ];

        if (!allowedStatuses.includes(profileApprovalStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid approval status"
            });
        }

        const pandit = await Pandit.findByIdAndUpdate(
            id,
            { profileApprovalStatus },
            {
                new: true,
                runValidators: true
            }
        ).select("-fcmToken");

        if (!pandit) {
            return res.status(404).json({
                success: false,
                message: "Pandit not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Pandit ${profileApprovalStatus.toLowerCase()} successfully`,
            pandit
        });

    } catch (error) {
        console.error("Approval Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE VERIFICATION STATUS
// =====================================================
const updatePanditVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerified } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Pandit ID"
            });
        }

        if (typeof isVerified !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isVerified must be boolean"
            });
        }

        const pandit = await Pandit.findByIdAndUpdate(
            id,
            { isVerified },
            {
                new: true,
                runValidators: true
            }
        ).select("-fcmToken");

        if (!pandit) {
            return res.status(404).json({
                success: false,
                message: "Pandit not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Pandit verification status updated successfully",
            pandit
        });

    } catch (error) {
        console.error("Verification Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


module.exports = {
    createPandit,
    getAllPandits,
    getPanditById,
    updatePandit,
    deletePandit,
    updatePanditApprovalStatus,
    updatePanditVerification
};