const mongoose = require('mongoose');

const panditSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        default: 'pandit'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    profileApprovalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    fullName: {
        type: String,
        trim: true
    },
    profilePic: {
        type: String,
        default: null
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    city: {
        type: String,
        trim: true
    },
    poojaServiceMode: {
        type: String,
        enum: ['Online Pooja', 'Offline / Home Visit', 'Both']
    },
    expertise: [{
        type: String
    }],
    primaryCategory: {
        type: String
    },
    languages: [{
        type: String
    }],
    experience: {
        type: Number
    },
    vedicEducation: {
        type: String,
        trim: true
    },
    canArrangeSamagri: {
        type: Boolean,
        default: false
    },
    expectedMonthlyEarnings: {
        type: Number
    },
    minPoojaFee: {
        type: Number
    },
    certificatePhotos: [{
        type: String
    }],
    bio: {
        type: String,
        trim: true
    },
    averageRating: { 
        type: Number, 
        default: 0 
    },
    totalReviews: { 
        type: Number, 
        default: 0 
    },
    isOnline: { 
        type: Boolean, 
        default: false 
    },
    fcmToken: { 
        type: String, 
        default: null 
    },
    walletBalance: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

module.exports = mongoose.model('Pandit', panditSchema);