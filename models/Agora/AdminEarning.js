const mongoose = require('mongoose');

const adminEarningSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmountPaid: { type: Number, required: true },
    commissionPercentage: { type: Number, required: true },
    adminAmount: { type: Number, required: true },
    partnerAmount: { type: Number, required: true },
    mode: { type: String, default: 'Video Call' }
}, { timestamps: true });

module.exports = mongoose.model('AdminEarning', adminEarningSchema);