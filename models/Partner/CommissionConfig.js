const mongoose = require('mongoose');

const commissionConfigSchema = new mongoose.Schema({
    partnerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Partner', 
        unique: true,
        required: true 
    },
    commissionPercentage: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

module.exports = mongoose.model('CommissionConfig', commissionConfigSchema);