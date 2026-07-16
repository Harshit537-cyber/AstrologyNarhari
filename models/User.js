const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, default: null },
    email: { type: String, unique: true, sparse: true, default: null },
    password: { type: String, default: null },
    role: { type: String, enum: ['user', 'partner', 'admin'], default: 'user' },
    mobile: { type: String, required: true, unique: true },
    otp: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deactivatedBy: { type: String, enum: ['self', 'admin', null], default: null },
    deactivatedAt: { type: Date, default: null },
    reactivateAt: { type: Date, default: null },
    deactivationReason: { type: String, default: null },
    deactivationReasonNote: { type: String, default: null },
    deactivationDuration: { type: Number, default: null },
    fullName: { type: String, trim: true, default: null },
    gender: { type: String, enum: ['Male', 'Female', 'Other', null], default: null },
    zodiac: { type: String, default: "Auto-calculated" },
    profilePic: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    timeOfBirth: { type: String, default: null },
    placeOfBirth: { type: String, default: null },
    walletBalance: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);