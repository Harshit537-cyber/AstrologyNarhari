const SessionRequest = require('../../models/SessionRequest/SessionRequest');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const exotelConfig = require('../../config/exotel');
const admin = require('../../config/firebase');

const handleExotelWebhook = async (req, res) => {
    try {
        // ✅ 1. Safe parsing taaki undefined hone par crash na ho
        const query = req.query || {};
        const body = req.body || {};
        const payload = { ...query, ...body };

        const requestId = payload.requestId;
        const auth = payload.auth;

        // Security check (env variable ya config se match karein)
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

        // ✅ 2. Exotel status aur duration ke sahi fields uthayein
        const callStatus = (payload.Status || payload.CallStatus || 'completed').toLowerCase();
        
        let rawSec = parseInt(
            payload.ConversationDuration || 
            payload.DialCallDuration || 
            payload.Duration || 
            payload.CallDuration || 
            0, 
            10
        );

        let durationInSeconds = isNaN(rawSec) ? 0 : Math.max(0, rawSec);

        // 🛡️ Fallback: Agar Exotel ne duration 0 bheji hai, lekin call successfully connect hui thi,
        // toh hum StartTime aur EndTime ka difference nikal kar seconds calculate kar lenge.
        if (durationInSeconds === 0 && payload.StartTime && payload.EndTime) {
            const start = new Date(payload.StartTime).getTime();
            const end = new Date(payload.EndTime).getTime();
            if (!isNaN(start) && !isNaN(end) && end > start) {
                durationInSeconds = Math.floor((end - start) / 1000);
            }
        }

        // Jab call cut ho jaye
        if (['completed', 'failed', 'busy', 'no-answer'].includes(callStatus)) {
            
            let durationMinutes = 0;
            let totalDeductedAmount = 0;

            // Agar actual baat hui hai (duration > 0) tabhi minute aur paise calculate honge
            if (durationInSeconds > 0 && callStatus === 'completed') {
                durationMinutes = Math.ceil(durationInSeconds / 60);
                const ratePerMin = Number(sessionReq.ratePerMin || 10);
                totalDeductedAmount = durationMinutes * ratePerMin;
            }

            sessionReq.status = (durationInSeconds > 0 && callStatus === 'completed') ? 'completed' : 'failed';
            sessionReq.endTime = payload.EndTime ? new Date(payload.EndTime) : new Date();
            sessionReq.durationInSeconds = durationInSeconds;
            sessionReq.durationMinutes = durationMinutes; 
            sessionReq.totalDeductedAmount = totalDeductedAmount;
            await sessionReq.save();

            // Wallet Deductions (Agar paise kate hain tabhi)
            if (totalDeductedAmount > 0) {
                await User.findByIdAndUpdate(sessionReq.user, {
                    $inc: { walletBalance: -totalDeductedAmount }
                });

                await Partner.findByIdAndUpdate(sessionReq.partner, {
                    $inc: { walletBalance: totalDeductedAmount }
                });
            }

            console.log(`>>> Call Ended via Exotel Webhook. RequestId: ${requestId}, Status: ${sessionReq.status}, Duration: ${durationInSeconds}s (${durationMinutes} mins), Deducted: ₹${totalDeductedAmount} <<<`);
        }

        return res.status(200).json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Exotel Webhook Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { handleExotelWebhook };