const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
    giftName: { type: String, required: true },
    price: { type: Number, required: true },
    iconUrl: { type: String, required: true }, 
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Gift', giftSchema);