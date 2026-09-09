const mongoose = require('mongoose');

const KundliSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: String,
    gender: String,
    dob: Date,
    tob: String,
    lat: Number,
    lon: Number,
    timezone: Number,
    pdf_link: String,
    data: {
        user_profile: {
            fullName: String,
            gender: String
        },
        panchang: mongoose.Schema.Types.Mixed,
        astrological_details: mongoose.Schema.Types.Mixed,
        planetary_positions: [mongoose.Schema.Types.Mixed],
        dasha: [mongoose.Schema.Types.Mixed],
        doshas: {
            manglik: mongoose.Schema.Types.Mixed
        }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Kundli', KundliSchema);