const Ritual = require('../../models/Ritual/Ritual');
const mongoose = require('mongoose');
const RitualSlot = require('../../models/Ritual/RitualSlot');
const RitualBooking = require('../../models/Ritual/RitualBooking');

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

exports.getSlotsByPartner = async (req, res) => {
    try {
        const { partnerId, ritualId } = req.params;
        const { date } = req.query; 
        let query = {
            partnerId: partnerId,
            ritualId: ritualId,
            status: 'Claimed' 
        };

        if (date) {
            query.date = new Date(date);
        }

        const slots = await RitualSlot.find(query)
            .sort({ date: 1, startTime: 1 }); 

        res.status(200).json({
            success: true,
            partnerId: partnerId,
            ritualId: ritualId,
            count: slots.length,
            data: slots
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Error fetching slots", 
            error: error.message 
        });
    }
};

exports.createRitualBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            ritualId,
            partnerId,
            slotId,
            sankalp,
            personalDetails,
            shippingDetails,
            paymentDetails,
            schedule
        } = req.body;

        const userId = req.user._id;

        const slot = await RitualSlot.findById(slotId).session(session);

        if (!slot) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Slot not found" });
        }

        if (slot.status === 'Booked') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "This slot is already booked" });
        }

        if (slot.status === 'Open') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "This slot is not yet claimed by a partner" });
        }

        const bookingId = `RIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newBooking = new RitualBooking({
            bookingId,
            userId,
            ritualId,
            partnerId,
            slotId,
            sankalp,
            personalDetails,
            schedule,
            shippingDetails,
            paymentDetails,
            zoomLink: "Pending"
        });

        const savedBooking = await newBooking.save({ session });

        await RitualSlot.findByIdAndUpdate(
            slotId,
            { status: 'Booked', isBooked: true },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Booking confirmed successfully",
            data: savedBooking
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: "Booking failed",
            error: error.message
        });
    }
};