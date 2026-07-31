const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    razorpay_order_id: { type: String, required: true, unique: true },
    razorpay_payment_id: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    type: { type: String, enum: ['deposit', 'booking_fee', 'refund', 'payout'], default: 'deposit' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);