const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    },
    bankDetails: {
        accountHolderName: String,
        bankName: String,
        accountNumber: String,
        ifscCode: String
    },
    adminTransactionId: { type: String }, 
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);