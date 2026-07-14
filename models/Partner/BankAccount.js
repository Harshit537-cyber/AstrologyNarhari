const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true,
        unique: true
    },
    accountHolderName: {
        type: String,
        required: true,
        trim: true
    },
    bankName: {
        type: String,
        required: true,
        trim: true
    },
    accountNumber: {
        type: String,
        required: true,
        trim: true
    },
    ifscCode: {
        type: String,
        required: true,
        trim: true
    },
    branchName: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);