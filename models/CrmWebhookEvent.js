const mongoose = require('mongoose');

const crmWebhookEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('CrmWebhookEvent', crmWebhookEventSchema);
