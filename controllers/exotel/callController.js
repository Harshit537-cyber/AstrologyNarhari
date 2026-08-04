const Booking = require('../../models/Booking/Booking');
const Partner = require('../../models/Partner/Partner');
const User = require('../../models/User');
const { triggerExotelCall } = require('../../services/exotelService');
const mongoose = require("mongoose")

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
        const booking = await Booking.findById(bookingId).populate('partner');
        
        if (!booking || !booking.callSid) {
            return res.status(404).json({ message: "No active call found for this booking" });
        }

        const bookingUserId = booking.user.toString();
        const bookingPartnerId = booking.partner._id.toString();

        const isAuthorized = userId === bookingUserId || userId === bookingPartnerId;

        if (!isAuthorized) {
            return res.status(403).json({ message: "You are not authorized to end this call" });
        }

        if (booking.partner) {
            booking.partner.isBusy = false;
            await booking.partner.save();
            console.log("Partner marked as free (isBusy: false)");
        }

        const { terminateExotelCall } = require('../../services/exotelService');
        const result = await terminateExotelCall(booking.callSid);

        if (result.success) {
            res.status(200).json({ message: "Call termination initiated. Partner is now free." });
        } else {
            res.status(500).json({ message: "Exotel Error", error: result.error });
        }
    } catch (error) {
        console.error("End Call Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.getCallHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query = {};
        if (role === 'user') {
            query = { "user.id": userId };
        } else if (role === 'partner') {
            query = { "partner.id": userId };
        } else {
            return res.status(403).json({ success: false, message: "Unauthorized role" });
        }

        const logs = await CallLog.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            success: true,
            totalCalls: logs.length,
            data: logs
        });
    } catch (error) {
        console.error("GET_CALL_LOGS_ERROR:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



exports.getCallHistoryByUid = async (req, res) => {
    try {
        const { uid } = req.params; 

        const logs = await CallLog.find({ "user.id": uid })
            .sort({ createdAt: -1 }) 
            .populate('bookingId');  

        if (!logs || logs.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No call history found for this user."
            });
        }

        return res.status(200).json({
            success: true,
            totalCalls: logs.length,
            data: logs
        });
    } catch (error) {
        console.error("GET_HISTORY_BY_UID_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};