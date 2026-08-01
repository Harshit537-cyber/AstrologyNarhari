const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    
    user: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        mobile: String,
        balanceBefore: Number,
        balanceAfter: Number
    },

    partner: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
        name: String,
        mobile: String,
        balanceBefore: Number,
        balanceAfter: Number
    },

    callSid: { type: String, unique: true }, 
    status: { type: String, enum: ['completed', 'missed', 'failed', 'busy', 'no-answer'] },
    durationSeconds: { type: Number, default: 0 },
    billedMinutes: { type: Number, default: 0 },
    ratePerMinute: { type: Number },
    totalCost: { type: Number, default: 0 },
    recordingUrl: { type: String },

    startTime: { type: Date },
    endTime: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);