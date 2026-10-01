const express = require('express');
const router = express.Router();
const { handleExotelWebhook } = require('../../controllers/callController/callWebhookController'); // apna sahi path check kar lein

// ✅ Ensure express.urlencoded middleware is active right before the controller
router.post(
    '/webhook', 
    express.json(), 
    express.urlencoded({ extended: true }), 
    async (req, res) => {
        try {
            // Safety fallback agar req.body undefined ho toh req.query ya req.body me se data utha lein
            console.log("👉 Webhook Hit Body:", req.body);
            console.log("👉 Webhook Hit Query:", req.query);
            return await handleExotelWebhook(req, res);
        } catch (err) {
            console.error("Webhook Wrapper Error:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;