const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    url: {
        type: String,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

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
    additionalPhotos: [{
        type: String
    }],
    bio: {
        type: String,
        trim: true
    },
    kycStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    selfie: {
        type: documentSchema,
        default: () => ({})
    },
    nationalId: {
        type: documentSchema,
        default: () => ({})
    },
    astrologyCertificate: {
        type: documentSchema,
        default: () => ({})
    },
    addressProof: {
        type: documentSchema,
        default: () => ({})
    }
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);