const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        default: 'partner'
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
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
        type: String
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
    specialties: [{
        type: String
    }],
    languages: [{
        type: String
    }],
    experience: {
        type: Number
    },
    qualification: {
        type: String,
        trim: true
    },
    expectedSalary: {
        type: Number
    },
    minRate: {
        type: Number,
        default: 25
    },
    additionalPhotos: [{
        type: String
    }],
    bio: {
        type: String,
        trim: true
    },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    kycStatus: {
        type: String,
        enum: ['Not Submitted', 'Pending', 'Approved', 'Rejected'],
        default: 'Not Submitted'
    },
    selfie: {
        url: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        uploadedAt: { type: Date, default: null }
    },
    nationalId: {
        url: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        uploadedAt: { type: Date, default: null }
    },
    astrologyCertificate: {
        url: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        uploadedAt: { type: Date, default: null }
    },
    addressProof: {
        url: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        uploadedAt: { type: Date, default: null }
    },
    isOnline: { type: Boolean, default: false },
    isBusy: { type: Boolean, default: false },


}, { timestamps: true });


module.exports = mongoose.model('Partner', partnerSchema);