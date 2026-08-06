const PartnerRating = require('../../models/Partner/PartnerRating'); 

exports.submitRating = async (req, res) => {
    try {
        const { rating, category, feedback } = req.body;

        if (!rating || !category) {
            return res.status(400).json({ message: "Rating and Category are required" });
        }

        const newRating = new PartnerRating({
            partnerId: req.user._id || req.user.id, 
            rating,
            category,
            feedback
        });

        await newRating.save();

        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully",
            data: newRating
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.getAllRatings = async (req, res) => {
    try {
        const ratings = await PartnerRating.find()
            .populate('partnerId', 'fullName mobile')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: ratings.length, data: ratings });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.getRatingStats = async (req, res) => {
    try {
        const stats = await PartnerRating.aggregate([
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalFeedback: { $sum: 1 }
                }
            }
        ]);
        res.status(200).json({ success: true, data: stats[0] || { averageRating: 0, totalFeedback: 0 } });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.checkRatingStatus = async (req, res) => {
    try {
        const partnerId = req.user.id;

        const existingRating = await PartnerRating.findOne({ partnerId });

        res.status(200).json({
            success: true,
            isRated: !!existingRating, 
            message: existingRating ? "Already rated" : "Not rated yet"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.getMyRating = async (req, res) => {
    try {
        const partnerId = req.user.id;

        const ratingData = await PartnerRating.findOne({ partnerId });

        if (!ratingData) {
            return res.status(404).json({
                success: false,
                message: "No rating found for this partner"
            });
        }

        res.status(200).json({
            success: true,
            data: ratingData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};