const express = require("express");
const { verifyToken , isAdmin, isUser} = require("../../middleware/auth");
const { addGift, sendGiftInLive,getActiveGifts ,getGiftDetails } = require("../../controllers/gift/adminGiftController");
const router = express.Router();
const upload = require("../../middleware/upload");

router.post("/admin/add-gift", verifyToken, isAdmin,upload.single("icon"), addGift);
router.post("/send-live-gifts", verifyToken, isUser, sendGiftInLive );
router.get("/get-active-gifts",verifyToken, isUser,getActiveGifts);
router.get("/activeGift-by-id/:id",verifyToken, isUser,getGiftDetails )

module.exports = router;

