const mongoose = require('mongoose');

const ritualSchema = new mongoose.Schema({
    title: { type: String, required: true }, 
    tagline: String, 
    image: String, 
    price: { type: Number, required: true },
    originalPrice: Number, 
    discount: String, 
    duration: String, 
    format: { type: String }, 
    about: String,
    benefits: [{
        icon: String, 
        title: String,
        description: String
    }],
    whatsIncluded: [String], 
  category: { 
        type: String, 
        enum: ['Wealth', 'Health', 'Relationship', 'Career', 'Protection', 'Others'],
        required: true 
    },
    formConfig: {
        askSankalp: { type: Boolean, default: true },
        askBirthDetails: { type: Boolean, default: true },
        askPrasadAddress: { type: Boolean, default: true }
    },
    isLive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Ritual', ritualSchema);