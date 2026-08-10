// models/SessionRequest.js
const mongoose = require('mongoose');

const sessionRequestSchema = new mongoose.Schema({
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
    type: { 
        type: String, 
        enum: ['chat', 'call'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected', 'timeout', 'completed', 'failed'], 
        default: 'pending' 
    },
    ratePerMin: { 
        type: Number, 
        required: true 
    },
    chatRoomId: { 
        type: String, 
        default: null 
    },
    exotelCallSid: { 
        type: String, 
        default: null 
    },
    startTime: { type: Date },
    endTime: { type: Date },
    durationInSeconds: { type: Number, default: 0 },
    totalDeductedAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SessionRequest', sessionRequestSchema);