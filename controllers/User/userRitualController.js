const Ritual = require('../../models/Ritual/Ritual');
const mongoose = require('mongoose');
const RitualBooking = require('../../models/Ritual/RitualBooking');
const Partner = require('../../models/Partner/Partner'); 
const RitualTransaction = require('../../models/Ritual/RitualTransaction');
const razorpayInstance = require('../../config/razorpay');
const crypto = require('crypto')
// user side api's

exports.getRituals = async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = { isLive: true };

        if (category && category !== 'All Rituals') {
            query.category = category;
        }
        const rituals = await Ritual.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: rituals.length,
            data: rituals
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};

exports.searchRituals = async (req, res) => {
    try {
        const { q } = req.query; 

        if (!q) {
            return res.status(400).json({ 
                success: false, 
                message: "Please enter something to search." 
            });
        }

        const results = await Ritual.find({
            isLive: true,
            $or: [
                { title: { $regex: q, $options: 'i' } },   
                { tagline: { $regex: q, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Search failed", 
            error: error.message 
        });
    }
};

exports.getRitualById = async (req, res) => {
    try {
        const { id } = req.params;

        const ritual = await Ritual.findById(id);

        if (!ritual) {
            return res.status(404).json({ 
                success: false, 
                message: "Ritual not found!" 
            });
        }

        res.status(200).json({
            success: true,
            data: ritual
        });

    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: "Invalid Ritual ID" });
        }
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};


exports.createRitualBooking = async (req, res) => {
   
    try {
        const {
            ritualId,
            partnerId,      
            sankalp,
            personalDetails,
            shippingDetails,
            paymentDetails,
            schedule        
        } = req.body;

        const userId = req.user._id || req.user.id;

        const partner = await Partner.findById(partnerId);
        if (!partner || !partner.isOnline || partner.isBusy) {
            return res.status(400).json({ 
                success: false, 
                message: "Selected partner is not available." 
            });
        }

        const bookingId = `RIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newBooking = new RitualBooking({
            bookingId,
            userId,
            ritualId,
            partnerId,
            status: 'Pending',
            sankalp,
            personalDetails,
            schedule,
            shippingDetails,
            paymentDetails: {
                ...paymentDetails,
                status: 'Success' 
            },
            zoomLink: "Pending"
        });

        const savedBooking = await newBooking.save();


        res.status(201).json({
            success: true,
            message: "Booking requested send to Partner!",
            data: savedBooking
        });

    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({
            success: false,
            message: "error creating ritual booking",
            error: error.message
        });
    }
};

exports.getAvailablePartners =  async (req, res) => {
    try {
        let query = {
            isOnline: true,
            isBusy: false,
            profileApprovalStatus: 'Approved',
        };


        const partners = await Partner.find(query)
            .select('fullName profilePic averageRating totalReviews experience specialties languages bio city')
            .sort({ averageRating: -1 }); 

        res.status(200).json({
            success: true,
            count: partners.length,
            data: partners
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching available partners",
            error: error.message
        });
    }
};


exports.createRitualOrder = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await RitualBooking.findById(bookingId);
        
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        if (booking.status !== 'Accepted') {
            return res.status(400).json({ 
                success: false, 
                message: "Payment can only be made once the Partner accepts your request." 
            });
        }

        const options = {
            amount: Math.round(booking.paymentDetails.totalAmount * 100), 
            currency: "INR",
            receipt: booking.bookingId,
        };

        const order = await razorpayInstance.orders.create(options);

        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.verifyRitualPayment = async (req, res) => {
    const session = await mongoose.startSession(); 
    session.startTransaction();

    try {
        const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Invalid payment signature." });
        }

        
// if (false) { // <--- expectedSignature !== razorpay_signature ki jagah false likh do
//     await session.abortTransaction();
//     return res.status(400).json({ success: false, message: "Invalid payment signature." });
// }
        const booking = await RitualBooking.findById(bookingId)
            .populate('userId', 'fullName')
            .populate('ritualId', 'title')
            .session(session);

        if (!booking) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        booking.paymentDetails.status = 'Success';
        booking.paymentDetails.transactionId = razorpay_payment_id;
        booking.status = 'Confirmed'; 
        await booking.save({ session });

        const totalPaid = booking.paymentDetails.totalAmount;
        const transactionRecord = new RitualTransaction({
            bookingId: booking._id,
            userId: booking.userId._id,
            userName: booking.userId.fullName, 
            partnerId: booking.partnerId,
            orderId: razorpay_order_id,
            transactionId: razorpay_payment_id,
            ritualName: booking.ritualId.title,
            ritualPrice: booking.paymentDetails.ritualPrice,
            logisticsFee: booking.paymentDetails.logisticsFee || 0,
            taxAmount: booking.paymentDetails.tax || 0,
            totalAmountPaid: totalPaid,
            partnerEarning: totalPaid,
            adminCommission: 0,
            status: 'Success'
        });
        await transactionRecord.save({ session });

        await Partner.findByIdAndUpdate(booking.partnerId, {
            $inc: { walletBalance: totalPaid },
            $push: {
                ritualEarningsHistory: {
                    userId: booking.userId._id ,
                    userName: booking.userId.fullName,
                    bookingId: booking._id,
                    amount: totalPaid,
                    ritualName: booking.ritualId.title,
                    paymentDate: new Date()
                }
            }
        }, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Payment verified, Records updated & Partner wallet credited.",
            transactionId: razorpay_payment_id
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


// partner side api's

exports.getPartnerRitualRequests = async (req, res) => {
    try {
        const partnerIdFromToken = req.user._id || req.user.id;
        const { status } = req.query; 

        let query = { 
            partnerId: new mongoose.Types.ObjectId(partnerIdFromToken) 
        };

        if (status) {
            query.status = status;
        }
        const requests = await RitualBooking.find(query)
            .populate('userId', 'fullName profilePic mobile') 
            .populate('ritualId', 'title image price duration') 
            .sort({ createdAt: -1 }); 

        res.status(200).json({
            success: true,
            partnerLoggedIn: partnerIdFromToken, 
            count: requests.length,
            data: requests
        });

    } catch (error) {
        console.error("Match Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching matched requests",
            error: error.message
        });
    }
};

exports.getPartnerRitualRequestById = async (req, res) => {
    try {
        const { id } = req.params; 
        const partnerId = req.user._id || req.user.id; 

        const booking = await RitualBooking.findOne({ _id: id, partnerId: partnerId })
            .populate('userId', 'fullName profilePic mobile dateOfBirth timeOfBirth placeOfBirth gender zodiac')
            .populate('ritualId', 'title tagline image price duration about benefits whatsIncluded');

        if (!booking) {
            return res.status(404).json({ 
                success: false, 
                message: "Request not found or you are not the owner." 
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error("Fetch Detail Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};


exports.acceptRitualRequest = async (req, res) => {
    try {
        const { id } = req.params; 
        const partnerId = req.user._id || req.user.id;

        const partner = await Partner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ 
                success: false, 
                message: "Partner record not found in database. Please check your token." 
            });
        }

        if (partner.isBusy) {
            return res.status(400).json({ 
                success: false, 
                message: "You cannot accept this ritual while you are busy on a call or chat." 
            });
        }


        const booking = await RitualBooking.findOne({ _id: id, partnerId: partnerId });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking request not found." });
        }

        if (booking.status !== 'Pending') {
            return res.status(400).json({ success: false, message: "This request is no longer pending." });
        }

        booking.status = 'Accepted';
        await booking.save();
res.status(200).json({
            success: true,
            message: "Ritual request accepted successfully.",
            data: booking
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.rejectRitualRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const partnerId = req.user._id || req.user.id;

        const booking = await RitualBooking.findOne({ _id: id, partnerId: partnerId });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking request not found." });
        }

        booking.status = 'Rejected';
        await booking.save();

        res.status(200).json({
            success: true,
            message: "Ritual request has been rejected."
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }};