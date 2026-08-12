const mongoose = require('mongoose');

const giftTransactionSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift', required: true },
    amount: { type: Number, required: true }, 
    partnerEarning: { type: Number, required: true },
    userBalanceBefore: { type: Number, required: true },
    userBalanceAfter: { type: Number, required: true },
    partnerBalanceBefore: { type: Number, required: true },
    partnerBalanceAfter: { type: Number, required: true }

}, { timestamps: true });

module.exports = mongoose.model('GiftTransaction', giftTransactionSchema);