const mongoose = require('mongoose');
const Partner = require('../../models/Partner/Partner');

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true }
}, { timestamps: true });

reviewSchema.statics.calculateAverageRating = async function(partnerId) {
    try {
        const stats = await this.aggregate([
            {
                $match: { partner: new mongoose.Types.ObjectId(partnerId) }
            },
            {
                $group: {
                    _id: '$partner',
                    nRating: { $sum: 1 },
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        console.log("Aggregation Result:", stats); 

        if (stats.length > 0) {
            await Partner.findByIdAndUpdate(partnerId, {
                averageRating: Number(stats[0].avgRating.toFixed(1)),
                totalReviews: stats[0].nRating
            });
            console.log("Partner updated with:", stats[0].avgRating);
        } else {
            await Partner.findByIdAndUpdate(partnerId, {
                averageRating: 0,
                totalReviews: 0
            });
        }
    } catch (err) {
        console.error("Aggregation Error:", err);
    }
};

reviewSchema.post('save', function() {
    this.constructor.calculateAverageRating(this.partner);
});

module.exports = mongoose.model('Review', reviewSchema);