const Booking = require('../../models/Booking/Booking');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const { triggerExotelCall } = require('../../services/exotelService');

exports.initiateCall = async (req, res) => {
    const { bookingId } = req.body;
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated - Payload mismatch" });
    }

    const userId = req.user.id;

    try {
        const booking = await Booking.findById(bookingId).populate('partner user');
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (!booking.user || !booking.partner) {
            return res.status(400).json({ message: "User or Partner details missing in DB" });
        }

        if (booking.user._id.toString() !== userId.toString() && 
    booking.partner._id.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Access Denied: You are not authorized for this booking" });
}

        if (booking.status !== 'accepted' || booking.mode !== 'Voice Call') {
            return res.status(400).json({ message: "Invalid booking status or mode" });
        }

        const user = booking.user;
        const partner = booking.partner;

        const maxTalkTimeFromWallet = Math.floor(user.walletBalance / booking.ratePerMinute) * 60;
        const bookingDurationSec = booking.duration * 60;
        const finalTimeLimit = Math.min(maxTalkTimeFromWallet, bookingDurationSec);

        if (finalTimeLimit <= 0) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        if (partner.isBusy) {
            return res.status(400).json({ message: "Partner is busy" });
        }

        partner.isBusy = true;
        await partner.save();

        const result = await triggerExotelCall(partner.mobile, user.mobile, finalTimeLimit, bookingId);

        if (result.success) {
            booking.callSid = result.callSid;
            await booking.save();
            res.status(200).json({ message: "Connecting your call...", callSid: result.callSid });
        } else {
            partner.isBusy = false;
            await partner.save();
            res.status(500).json({ message: "Failed to connect via Exotel" });
        }

    } catch (error) {
        console.error("Call Init Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.endCallManually = async (req, res) => {
    const { bookingId } = req.body;
    const userId = req.user.id; 

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking || !booking.callSid) {
            return res.status(404).json({ message: "No active call found for this booking" });
        }

         if (booking.user.toString() !== userId.toString() && 
            booking.partner.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You are not authorized to end this call" });
        }

        const result = await require('../../services/exotelService').terminateExotelCall(booking.callSid);

        if (result.success) {
            res.status(200).json({ message: "Call termination initiated successfully" });
        } else {
            res.status(500).json({ message: "Could not end call via telephony server" });
        }
    } catch (error) {
        console.error("End Call Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};