const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const exotelConfig = require('../../config/exotel');

const handleExotelWebhook = async (req, res) => {
    try {
        const query = req.query || {};
        const body = req.body || {};
        const payload = { ...query, ...body };

        console.log("🔥 EXACT EXOTEL WEBHOOK PAYLOAD:", JSON.stringify(payload));

        const requestId = payload.requestId;
        const auth = payload.auth;

        const internalKey = process.env.MY_INTERNAL_API_KEY || exotelConfig.INTERNAL_KEY;
        if (auth !== internalKey) {
            return res.status(403).json({ success: false, message: "Unauthorized webhook access" });
        }

        if (!requestId) {
            return res.status(400).json({ success: false, message: "RequestId missing in webhook" });
        }

        const sessionReq = await SessionRequest.findById(requestId);
        if (!sessionReq) {
            return res.status(200).json({ success: true, message: "Session request not found" });
        }

        if (sessionReq.status === 'completed' || sessionReq.status === 'failed' || sessionReq.status === 'rejected') {
            return res.status(200).json({ success: true, message: "Session already processed" });
        }

        const callStatus = (payload.Status || payload.CallStatus || 'completed').toLowerCase();
        
        // 🔍 EXOTEL ke saare duration parameters check karo
        let rawSec = parseInt(
            payload.ConversationDuration || 
            payload.RecordingDuration ||  // <--- Yeh recording ka exact time deta hai
            payload.DialCallDuration || 
            payload.Duration || 
            payload.CallDuration || 
            0, 
            10
        );

        let durationInSeconds = isNaN(rawSec) ? 0 : Math.max(0, rawSec);

        // 🛡️ Agar fir bhi 0 hai, lekin SessionRequest ke andar startTime pehle se save hai, 
        // toh abhi ka waqt (new Date) aur startTime ka diff nikal lo (Exact Call Duration)
        if (durationInSeconds === 0 && sessionReq.startTime) {
            const start = new Date(sessionReq.startTime).getTime();
            const end = new Date().getTime();
            durationInSeconds = Math.floor((end - start) / 1000);
        }

        // Agar duration fir bhi 0 se kam ya barabar hai (matlab call connect hi nahi hui)
        if (durationInSeconds <= 0 || callStatus === 'busy' || callStatus === 'no-answer') {
            sessionReq.status = 'failed';
            sessionReq.endTime = new Date();
            sessionReq.durationInSeconds = 0;
            sessionReq.durationMinutes = 0;
            sessionReq.totalDeductedAmount = 0;
            await sessionReq.save();
            return res.status(200).json({ success: true, message: "Call was not answered or duration 0" });
        }

        // 🧮 EXACT PER-MINUTE CALCULATION (Jaise 65 sec = 2 min)
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