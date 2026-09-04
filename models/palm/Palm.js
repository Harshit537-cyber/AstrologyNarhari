const mongoose = require('mongoose');

const palmSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    imageUrl: {
        type: String,
        required: true
    },

    hand: {
        type: String,
        enum: ['left', 'right'],
        required: true
    },

    palmId: {
        type: String,
         default: null,
        index: true
    },

    status: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
        default: 'pending'
    },

    failureReason: {
        type: String,
        default: null
    },

    readings: {
        love: {
            data: { type: mongoose.Schema.Types.Mixed, default: null },
            fetchedAt: { type: Date, default: null }
        },
        career: {
            data: { type: mongoose.Schema.Types.Mixed, default: null },
            fetchedAt: { type: Date, default: null }
        },
        health: {
            data: { type: mongoose.Schema.Types.Mixed, default: null },
            fetchedAt: { type: Date, default: null }
        },
        luck: {
            data: { type: mongoose.Schema.Types.Mixed, default: null },
            fetchedAt: { type: Date, default: null }
        }
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

palmSchema.index({ user: 1, hand: 1, isActive: 1 });

module.exports = mongoose.model('Palm', palmSchema);