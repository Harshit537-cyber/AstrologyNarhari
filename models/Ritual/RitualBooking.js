const mongoose = require('mongoose');

const ritualBookingSchema = new mongoose.Schema({
    bookingId: { type: String, unique: true }, 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ritualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual', required: true },
partnerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Partner', 
        default: null 
    },    
     status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Completed', 'Cancelled', "Rejected"], 
        default: 'Pending' 
    },
    sankalp: String,
    personalDetails: {
        poojaFor: String,
        gotra: String,
        dob: Date,
        tob: String,
        pob: String
    },
   schedule: {
        date: { type: Date, required: true }, 
        time: { type: String, required: true }, 
        isoDateTime: { type: Date } 
    },
    shippingDetails: {
        recipientName: String,
        phoneNumber: String,
        address: String,
        city: String,
        pincode: String
    },
    paymentDetails: {
        ritualPrice: Number,
        logisticsFee: Number,
        tax: Number,
        totalAmount: Number,
        status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
        transactionId: String
    },
    zoomLink: { type: String, default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model('RitualBooking', ritualBookingSchema);