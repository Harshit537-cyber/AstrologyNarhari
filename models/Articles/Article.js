const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    slug: { type: String, unique: true, required: true },
    category: { type: String, required: true }, 
    
    author: {
        name: { type: String, required: true },
        designation: { type: String, required: true },
        profilePic: { type: String }
    },
    publishedDate: { type: Date, default: Date.now },
    readTime: { type: String, required: true }, 
    thumbnail: { type: String, required: true }, 
    bannerImage: { type: String },

    summary: { type: String, required: true }, 
    quote: { type: String },
    mainContent: { type: String, required: true },

    keyTakeaways: [{
        point: { type: String }
    }],

    ritual: {
        title: { type: String }, 
        steps: [{
            stepNumber: { type: String },
            stepTitle: { type: String },
            stepDescription: { type: String }
        }]
    },

    tags: [{ type: String }], 
     createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    isPublished: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Article', articleSchema);