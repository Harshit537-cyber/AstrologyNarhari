const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const exotelConfig = require('../../config/exotel');
const admin = require('../../config/firebase');

const handleExotelWebhook = async (req, res) => {
    try {
        const { requestId, auth } = req.query;
        const { CallStatus, DialWhomAnswered, CallDuration } = req.body;

        // Security check
        if (auth !== exotelConfig.INTERNAL_KEY) {
            return res.status(403).json({ success: false, message: "Unauthorized webhook access" });
        }

        if (!requestId) {
            return res.status(400).json({ success: false, message: "RequestId missing in webhook" });
        }

        const sessionReq = await SessionRequest.findById(requestId);
        if (!sessionReq || sessionReq.status === 'completed') {
            return res.status(200).json({ success: true, message: "Session already completed or not found" });
        }

        // Jab call cut ho jaye (Exotel status: completed, failed, busy, no-answer)
        if (['completed', 'failed', 'busy', 'no-answer'].includes(CallStatus)) {
            const durationInSeconds = Number(CallDuration) || 0;
            const durationMinutes = Math.max(1, Math.ceil(durationInSeconds / 60));
            const totalDeductedAmount = durationMinutes * (sessionReq.ratePerMin || 10);

            sessionReq.status = 'completed';
            sessionReq.endTime = new Date();
            sessionReq.durationInSeconds = durationInSeconds;
            sessionReq.totalDeductedAmount = totalDeductedAmount;
            await sessionReq.save();

            // Wallet Deductions
            await User.findByIdAndUpdate(sessionReq.user, {
                $inc: { walletBalance: -totalDeductedAmount }
            });

            await Partner.findByIdAndUpdate(sessionReq.partner, {
                $inc: { walletBalance: totalDeductedAmount }
            });

            console.log(`>>> Call Ended via Exotel Webhook. RequestId: ${requestId}, Duration: ${durationInSeconds}s, Deducted: ₹${totalDeductedAmount} <<<`);
        }

        return res.status(200).json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Exotel Webhook Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { handleExotelWebhook };