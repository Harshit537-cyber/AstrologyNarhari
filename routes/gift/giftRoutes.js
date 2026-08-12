const express = require("express");
const { verifyToken , isAdmin, isUser, isPartner} = require("../../middleware/auth");
const { addGift, sendGiftInLive,getActiveGifts ,getGiftDetails ,getReceivedGifts,getSessionEarnings,getPartnerGiftSummary} = require("../../controllers/gift/adminGiftController");
const router = express.Router();
const upload = require("../../middleware/upload");

//admin routes
router.post("/admin/add-gift", verifyToken, isAdmin,upload.single("icon"), addGift);

//user routes
router.post("/send-live-gifts", verifyToken, isUser, sendGiftInLive );
router.get("/get-active-gifts",verifyToken, isUser,getActiveGifts);
router.get("/activeGift-by-id/:id",verifyToken, isUser,getGiftDetails )

// partner routes
router.get('/partner/received-gifts', verifyToken, isPartner,getReceivedGifts);

router.get('/partner/session-earnings/:sessionId',  verifyToken, isPartner, getSessionEarnings);

router.get('/partner/gift-summary',   verifyToken, isPartner,getPartnerGiftSummary);


module.exports = router;

