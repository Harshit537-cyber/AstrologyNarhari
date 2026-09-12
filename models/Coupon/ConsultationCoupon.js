const mongoose = require('mongoose');

const consultationCouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    amount: { type: Number, required: true, enum: [51, 101, 151, 201] }, // Restricted values
    isActive: { type: Boolean, default: true },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: 1 }, 
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
}, { timestamps: true });

const ConsultationCoupon = mongoose.models.ConsultationCoupon || mongoose.model('ConsultationCoupon', consultationCouponSchema);

module.exports = ConsultationCoupon;