const Review = require('../../models/rating/Review');

exports.addReview = async (req, res) => {
    try {
        const { partnerId, rating, comment } = req.body;
        const userId = req.user.id;

        const review = await Review.findOneAndUpdate(
            { user: userId, partner: partnerId },
            { rating, comment },
            { new: true, upsert: true }
        );

        await Review.calculateAverageRating(partnerId);

        res.status(201).json({
            success: true,
            message: "Review saved and Partner updated!",
            data: review
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};
