const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    // Yahan se enum: [15, 30, 45] hata diya gaya hai taaki actual billed minutes (jaise 2, 3 min) save ho sake
    duration: {
        type: Number,
        required: true,
        default: 0
    },
    mode: {
        type: String,
        required: true,
        enum: ['Chat', 'Voice Call', 'Video Call']
    },
    ratePerMinute: {
        type: Number,
        required: true
    },
    totalFee: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'missed'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'refunded'],
        default: 'pending'
    },
    actualDuration: { 
        type: Number, 
        default: 0 
    }, // Call kitne seconds baat hui
    recordingUrl: { 
        type: String, 
        default: null 
    },
    startTime: { type: Date }, 
    endTime: { type: Date },
    cancellationReason: { type: String, default: null },
    callSid: { type: String, default: null },
    commissionPercentage: { type: Number, default: 0 },
    adminCommission: { type: Number, default: 0 },
    partnerEarning: { type: Number, default: 0 },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    review: {
        type: String,
        trim: true,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);