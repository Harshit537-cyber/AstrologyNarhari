const mongoose = require('mongoose');

const ritualSlotSchema = new mongoose.Schema({
    ritualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    slotName: { type: String },
    isBooked: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['Open', 'Claimed', 'Booked'], 
        default: 'Open' 
    }
}, { timestamps: true });

ritualSlotSchema.index({ ritualId: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('RitualSlot', ritualSlotSchema);