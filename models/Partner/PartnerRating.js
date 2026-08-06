const mongoose = require('mongoose');

const partnerRatingSchema = new mongoose.Schema({
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    category: {
        type: String,
        required: true,
        enum: [
            'General Experience',
            'Call & Chat Quality',
            'Payout & Earnings',
            'Feature Request',
            'Report a Bug'
        ]
    },
    feedback: {
        type: String,
        trim: true,
        maxlength: 1000
    },
  
}, { timestamps: true });

module.exports = mongoose.model('PartnerRating', partnerRatingSchema);