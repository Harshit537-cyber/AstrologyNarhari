const Ritual = require('../../models/Ritual/Ritual');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

exports.addRitual =  async (req, res) => {
    try {
        const { 
            title, tagline, price, originalPrice, discount, 
            duration, format, about, category, 
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
            image: imageUrl, 
            price,
            originalPrice,
            discount,
            duration,
            format,
            about,
            benefits: parsedBenefits, 
            whatsIncluded: parsedIncluded,
            category, 
            formConfig: parsedFormConfig 
        });

        await newRitual.save();

        res.status(201).json({
            success: true,
            message: "Ritual added successfully according to Model Schema!",
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