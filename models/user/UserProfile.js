const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    zodiac: {
        type: String,
        default: "Auto-calculated"
    },

    profilePic: {
        type: String,
    },

    dateOfBirth: {
        type: Date,
        required: true
    },
    timeOfBirth: {
        type: String,
        required: true
    },
    placeOfBirth: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);