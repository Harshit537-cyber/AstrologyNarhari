const Ritual = require('../../models/Ritual/Ritual');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

exports.addRitual = async (req, res) => {
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


exports.updateRitual =  async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, tagline, price, originalPrice, discount, 
            duration, format, about, category, 
            benefits, whatsIncluded, formConfig 
        } = req.body;

        let ritual = await Ritual.findById(id);
        if (!ritual) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: "Ritual not found" });
        }

        let imageUrl = ritual.image; 

        if (req.file) {
            if (ritual.image) {
                try {
                   
                    const urlParts = ritual.image.split('/');
                    const fileNameWithExtension = urlParts[urlParts.length - 1]; 
                    const publicIdWithoutExtension = fileNameWithExtension.split('.')[0]; 
                    
                    const fullPublicId = `rituals_banners/${publicIdWithoutExtension}`;
                    
                    await cloudinary.uploader.destroy(fullPublicId);
                } catch (delError) {
                    console.error("Cloudinary Delete Error:", delError);
                }
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "rituals_banners",
            });
            imageUrl = result.secure_url;
            
            fs.unlinkSync(req.file.path); 
        }

        const parsedBenefits = typeof benefits === 'string' ? JSON.parse(benefits) : benefits;
        const parsedIncluded = typeof whatsIncluded === 'string' ? JSON.parse(whatsIncluded) : whatsIncluded;
        const parsedFormConfig = typeof formConfig === 'string' ? JSON.parse(formConfig) : formConfig;

        const updatedRitual = await Ritual.findByIdAndUpdate(
            id,
            {
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
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Ritual updated successfully and old image replaced!",
            data: updatedRitual
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error("Update Ritual Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update ritual", 
            error: error.message 
        });
    }
};

exports.getAllRituals = async (req, res) => {
    try {
        const rituals = await Ritual.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: rituals.length,
            data: rituals
        });
    } catch (error) {
        console.error("Get All Rituals Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch rituals", 
            error: error.message 
        });
    }
};


exports.getRitualById = async (req, res) => {
    try {
        const ritual = await Ritual.findById(req.params.id);

        if (!ritual) {
            return res.status(404).json({ 
                success: false, 
                message: "Ritual not found" 
            });
        }

        res.status(200).json({
            success: true,
            data: ritual
        });
    } catch (error) {
        console.error("Get Ritual By ID Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch ritual", 
            error: error.message 
        });
    }
};

exports.deleteRitual = async (req, res) => {
    try {
        const { id } = req.params;

        const ritual = await Ritual.findById(id);

        if (!ritual) {
            return res.status(404).json({ 
                success: false, 
                message: "Ritual not found" 
            });
        }
       if (ritual.image) {
            try {
                const urlParts = ritual.image.split('/');
                const fileNameWithExtension = urlParts[urlParts.length - 1];
                const publicId = fileNameWithExtension.split('.')[0];
                
                const fullPublicId = `rituals_banners/${publicId}`;
                
                await cloudinary.uploader.destroy(fullPublicId);
            } catch (cloudinaryErr) {
                console.error("Cloudinary Delete Error (ignoring):", cloudinaryErr);
            }
        }

        await Ritual.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Ritual and associated image deleted successfully"
        });

    } catch (error) {
        console.error("Delete Ritual Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to delete ritual", 
            error: error.message 
        });
    }
};
