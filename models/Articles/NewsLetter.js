const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: [true, "Email is required"], 
        unique: true, 
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    status: { 
        type: String, 
        enum: ['active', 'unsubscribed'], 
        default: 'active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);