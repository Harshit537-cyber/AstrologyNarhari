const RitualSlot = require('../models/RitualSlot'); 

const getOpenSlots = async (req, res) => {
    try {
        const { ritualId, date } = req.query;

        let query = { status: 'Open' }; 

        if (ritualId) query.ritualId = ritualId;
        if (date) query.date = new Date(date);

        const slots = await RitualSlot.find(query)
            .populate('ritualId', 'title price')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json({
            success: true,
            count: slots.length,
            data: slots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const claimSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const partnerId = req.user._id; 

        const slot = await RitualSlot.findById(slotId);

        if (!slot) {
            return res.status(404).json({ success: false, message: "Slot not found" });
        }

        if (slot.status !== 'Open') {
            return res.status(400).json({ 
                success: false, 
                message: "This slot is already claimed or booked" 
            });
        }

        slot.partnerId = partnerId;
        slot.status = 'Claimed';
        
        await slot.save();

        res.status(200).json({
            success: true,
            message: "Slot added to your schedule successfully",
            data: slot
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};




