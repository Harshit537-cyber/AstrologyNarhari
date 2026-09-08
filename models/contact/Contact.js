const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email address is required"],
        lowercase: true,
        trim: true,
    },
    message: {
        type: String,
        required: [true, "Message content is required"]
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contact', contactSchema);