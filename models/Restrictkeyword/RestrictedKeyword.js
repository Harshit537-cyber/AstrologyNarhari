const mongoose = require('mongoose');

const restrictedKeywordSchema = new mongoose.Schema({
    keyword: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    action: { 
        type: String, 
        enum: ['block', 'mask'], 
        default: 'block' 
    }, 
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('RestrictedKeyword', restrictedKeywordSchema);