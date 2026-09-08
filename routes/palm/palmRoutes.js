const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
const { uploadPalmAndScan, getReading } = require('../../controllers/palm/palmistryController');
const {verifyToken, isUser} = require("../../middleware/auth");


router.post("/upload-palm", verifyToken, isUser, upload.single("image"), uploadPalmAndScan);

router.get("/palmistry/reading/:category", verifyToken, isUser, getReading);

module.exports = router;


