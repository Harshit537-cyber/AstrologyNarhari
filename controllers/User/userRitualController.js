const Ritual = require('../../models/Ritual/Ritual');
const mongoose = require('mongoose');
const RitualBooking = require('../../models/Ritual/RitualBooking');
const Partner = require('../../models/Partner/Partner'); 


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

        const userId = req.user._id;

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

// partner side api's

exports.getPartnerRitualRequests = async (req, res) => {
    try {
        const partnerId = req.user._id; 
        const { status } = req.query; 

        let query = { partnerId: partnerId };

        if (status) {
            query.status = status;
        }

        const requests = await RitualBooking.find(query)
            .populate('userId', 'fullName profilePic mobile') 
            .populate('ritualId', 'title image price duration') 
            .sort({ createdAt: -1 }); 

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

exports.getPartnerRitualRequestById = async (req, res) => {
    try {
        const { id } = req.params; 
        const partnerId = req.user._id; 

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
        const partnerId = req.user._id;

        const partner = await Partner.findById(partnerId);
        
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
        const partnerId = req.user._id;

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