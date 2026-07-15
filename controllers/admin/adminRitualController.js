const Ritual = require('../../models/Ritual/Ritual');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const RitualSlot = require('../../models/Ritual/RitualSlot');

exports.addRitual = async (req, res) => {
    try {
        const { 
            title, tagline, price, originalPrice, discount, 
            duration, format, about, category, label, 
            benefits, whatsIncluded, formConfig 
        } = req.body;

        let imageUrl = "";
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "rituals_banners",
            });
            imageUrl = result.secure_url;
            fs.unlinkSync(req.file.path); 
        }

        const parsedBenefits = typeof benefits === 'string' ? JSON.parse(benefits) : benefits;
        const parsedIncluded = typeof whatsIncluded === 'string' ? JSON.parse(whatsIncluded) : whatsIncluded;
        const parsedFormConfig = typeof formConfig === 'string' ? JSON.parse(formConfig) : formConfig;

        const newRitual = new Ritual({
            title,
            tagline,
            price,
            originalPrice,
            discount,
            duration,
            format,
            about,
            category,
            label: label || 'Certified Acharya', 
            image: imageUrl,
            benefits: parsedBenefits,
            whatsIncluded: parsedIncluded,
            formConfig: parsedFormConfig 
        });

        await newRitual.save();

        res.status(201).json({
            success: true,
            message: "Ritual added successfully by Admin with Category!",
            data: newRitual
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error("Add Ritual Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to add ritual", 
            error: error.message 
        });
    }
};


exports.addRitualSlots = async (req, res) => {
    try {
        const { ritualId, date, slotsArray } = req.body;
        if (!slotsArray || slotsArray.length === 0) {
            return res.status(400).json({ message: "Fill at least one slot" });
        }

        const slotsToCreate = slotsArray.map(slot => ({
            ritualId,
            date: new Date(date),
            startTime: slot.startTime,
            slotName: slot.slotName,
            isBooked: false
        }));

        const createdSlots = await RitualSlot.insertMany(slotsToCreate, { ordered: false });

        res.status(201).json({
            success: true,
            message: `${createdSlots.length} Slots added by Admin successfully!`,
            data: createdSlots
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Some slots already exist (Duplicate Time)." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

