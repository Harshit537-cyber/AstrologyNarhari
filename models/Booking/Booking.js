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
    duration: {
        type: Number,
        required: true,
        enum: [15, 30, 45]
    },
    mode: {
        type: String,
        required: true,
        enum: ['Chat', 'Voice Call']
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
        enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', "missed"],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'refunded'],
        default: 'pending'
    },
    actualDuration: { type: Number, default: 0 },
    startTime: { type: Date }, 
    endTime: { type: Date },
    cancellationReason: { type: String, default: null },
    callSid: { type: String, default: null },
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