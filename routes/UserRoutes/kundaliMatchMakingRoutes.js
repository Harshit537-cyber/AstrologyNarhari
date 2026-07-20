const express = require('express');
const router = express.Router();
const matchController = require('../../controllers/User/kundaliMatchMaking');
const { verifyToken ,isUser} = require('../../middleware/auth'); 

router.post('/check-compatibility', verifyToken, isUser, matchController.checkCompatibility);
router.post("/generate-kundali", verifyToken, isUser, matchController.generateKundli);
router.post("/festivals", verifyToken, isUser, matchController.getFestivalCalendar);
router.get("/get-daily-horoscope", verifyToken, isUser, matchController.getDailyBasisDashboardHoroscope);
router.get("/get-detailed-horoscope", verifyToken, isUser, matchController.getDetailedHoroscope);

module.exports = router;