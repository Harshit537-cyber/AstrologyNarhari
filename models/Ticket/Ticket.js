const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'raisedByModel'
    },
    raisedByModel: {
        type: String,
        required: true,
        enum: ['User', 'Partner']
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['Payment Issue', 'Consultation Issue', 'Profile Issue', 'Technical Issue', 'Other'],
        default: 'Other'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
        default: 'Pending'
    },
    attachments: [{
        type: String
    }],
    adminResponse: {
        type: String,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);