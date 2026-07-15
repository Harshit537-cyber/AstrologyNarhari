const mongoose = require('mongoose');

const ritualBookingSchema = new mongoose.Schema({
    bookingId: { type: String, unique: true }, 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ritualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'RitualSlot', required: true },
    
    sankalp: String,
    personalDetails: {
        poojaFor: String,
        gotra: String,
        dob: Date,
        tob: String,
        pob: String
    },
    schedule: {
        date: Date,
        slot: String 
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
    zoomLink: String
}, { timestamps: true });

module.exports = mongoose.model('RitualBooking', ritualBookingSchema);