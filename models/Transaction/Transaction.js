const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    razorpay_order_id: { type: String, sparse: true }, 
    razorpay_payment_link_id: { type: String, sparse: true },
    razorpay_payment_id: { type: String },
    pandit: { type: mongoose.Schema.Types.ObjectId, ref: 'Pandit' }, 
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    type: { type: String, enum: ['deposit', 'booking_fee', 'refund', 'payout', 'debit', 'ritual_payment'], default: 'deposit' },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

transactionSchema.index(
    { razorpay_payment_id: 1 },
    {
        unique: true,
        partialFilterExpression: { razorpay_payment_id: { $type: 'string', $gt: '' } }
    }
);

transactionSchema.index(
    { razorpay_payment_link_id: 1 },
    {
        sparse: true
    }
);

module.exports = mongoose.model('Transaction', transactionSchema);