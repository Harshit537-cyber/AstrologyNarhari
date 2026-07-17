const express = require('express');
const router = express.Router();
const matchController = require('../../controllers/User/kundaliMatchMaking');
const { verifyToken ,isUser} = require('../../middleware/auth'); 

router.post('/check-compatibility', verifyToken, isUser, matchController.checkCompatibility);
router.post("/generate-kundali", verifyToken, isUser, matchController.generateKundli);

module.exports = router;