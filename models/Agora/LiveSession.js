const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    channelName: { type: String, required: true},
    topic: { type: String, required: true },
    category: { type: String, required: true }, // e.g., 'Love', 'Career'
    status: { type: String, enum: ['Scheduled', 'Active', 'Ended'], default: 'Scheduled' },
    scheduledTime: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    viewerCount: { type: Number, default: 0 },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalEarnings: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
likedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);