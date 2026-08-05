const mongoose = require('mongoose');

const ritualTransactionSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'RitualBooking', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    
    orderId: { type: String, required: true },      
    transactionId: { type: String, required: true }, 
    
    ritualName: { type: String }, 
    paymentMode: { type: String },
    
    ritualPrice: { type: Number, required: true },   
    logisticsFee: { type: Number, default: 0 },     
    taxAmount: { type: Number, default: 0 },         
    
    totalAmountPaid: { type: Number, required: true }, 
    partnerEarning: { type: Number, required: true },  
    adminCommission: { type: Number, default: 0 },     
    
    status: { 
        type: String, 
        enum: ['Success', 'Failed', 'Refunded'], 
        default: 'Success' 
    }
}, { timestamps: true });

module.exports = mongoose.model('RitualTransaction', ritualTransactionSchema, 'ritual_transactions');