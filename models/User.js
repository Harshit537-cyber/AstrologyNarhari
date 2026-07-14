const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'partner', 'admin'], default: 'user' },
    mobile: { type: String },
    otp: { type: String },

    // --- Deactivation fields ---
    isActive: { type: Boolean, default: true },
    deactivatedBy: { type: String, enum: ['self', 'admin', null], default: null },
    deactivatedAt: { type: Date, default: null },
    reactivateAt: { type: Date, default: null },          // null = indefinite (self-deactivation, no duration chosen)
    deactivationReason: { type: String, default: null },  // dropdown value
    deactivationReasonNote: { type: String, default: null }, // optional free text
    deactivationDuration: { type: Number, default: null }  // 7 / 15 / 30 / null
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);