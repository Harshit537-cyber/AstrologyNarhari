const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');

const handleExotelWebhook = async (req, res) => {
    try {
        const query = req.query || {};
        const body = req.body || {};
        const payload = { ...query, ...body };

        console.log("📥 Exotel Webhook Payload Received:", payload);

        // RequestId ko alag-alag key formats se dhundne ki koshish karein (Exotel CustomField ya query/body)
        const requestId = payload.requestId || payload.CustomField || payload.custom_field;

        if (!requestId) {
            console.log("❌ RequestId missing in webhook payload");
            return res.status(400).json({ success: false, message: "RequestId missing in webhook" });
        }

        const sessionReq = await SessionRequest.findById(requestId);
        if (!sessionReq) {
            console.log("⚠️ Session request not found for ID:", requestId);
            return res.status(200).json({ success: true, message: "Session request not found" });
        }

        // Agar pehle se processed hai toh dobara mat chalao
        if (sessionReq.status === 'completed' || sessionReq.status === 'failed' || sessionReq.status === 'rejected') {
            return res.status(200).json({ success: true, message: "Session already processed" });
        }

        const callStatus = (payload.Status || payload.CallStatus || 'completed').toLowerCase();
        
        // Exotel ke alag-alag duration parameters check karo
        let rawSec = parseInt(
            payload.ConversationDuration || 
            payload.RecordingDuration ||  
            payload.DialCallDuration || 
            payload.Duration || 
            payload.CallDuration || 
            0, 
            10
        );

        let durationInSeconds = isNaN(rawSec) ? 0 : Math.max(0, rawSec);

        // 🔥 MAIN FIX: Agar Exotel duration 0 bhej raha hai, toh hum khud startTime aur current time ka difference nikalenge
        if (durationInSeconds <= 1 && sessionReq.startTime) {
            const start = new Date(sessionReq.startTime).getTime();
            const end = new Date().getTime();
            durationInSeconds = Math.max(1, Math.floor((end - start) / 1000));
        }

        // Agar call bilkul hi nahi uthi ya failed thi
        if (durationInSeconds <= 3 || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'failed') {
            sessionReq.status = 'failed';
            sessionReq.endTime = new Date();
            sessionReq.durationInSeconds = 0;
            sessionReq.durationMinutes = 0;
            sessionReq.totalDeductedAmount = 0;
            await sessionReq.save();
            return res.status(200).json({ success: true, message: "Call was not answered or too short" });
        }

        // 🧮 EXACT PER-MINUTE CALCULATION (Jaise 65 sec = 2 min, 130 sec = 3 min)
        let durationMinutes = Math.ceil(durationInSeconds / 60);
        const ratePerMin = Number(sessionReq.ratePerMin || 10);
        let totalDeductedAmount = durationMinutes * ratePerMin;

        sessionReq.status = 'completed';
        sessionReq.endTime = new Date();
        sessionReq.durationInSeconds = durationInSeconds;
        sessionReq.durationMinutes = durationMinutes; 
        sessionReq.totalDeductedAmount = totalDeductedAmount;
        await sessionReq.save();

        // 💰 EXACT WALLET DEDUCTION
        if (totalDeductedAmount > 0) {
            await User.findByIdAndUpdate(sessionReq.user, {
                $inc: { walletBalance: -totalDeductedAmount }
            });

            await Partner.findByIdAndUpdate(sessionReq.partner, {
                $inc: { walletBalance: totalDeductedAmount }
            });
        }

        console.log(`>>> REVENUE CAPTURED! RequestId: ${requestId}, Exact Duration: ${durationInSeconds}s (${durationMinutes} mins), Deducted: ₹${totalDeductedAmount} <<<`);

        return res.status(200).json({ success: true, message: "Revenue and Duration processed successfully" });
    } catch (error) {
        console.error("Exotel Webhook Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { handleExotelWebhook };