const express = require('express');
const router = express.Router();
const matchController = require('../../controllers/User/kundaliMatchMaking');
const { verifyToken ,isUser} = require('../../middleware/auth'); 

router.post('/check-compatibility', verifyToken, isUser, matchController.checkCompatibility);
router.post("/generate-kundali", verifyToken, isUser, matchController.generateKundli);
router.post("/festivals", verifyToken, isUser, matchController.getFestivalCalendar);
router.get("/get-daily-horoscope", verifyToken, isUser, matchController.getDailyBasisDashboardHoroscope);
router.get(
    "/detailed-horoscope/:type",
    verifyToken,
    isUser,
    matchController.getDetailedHoroscope
);router.post('/horoscope/weekly',verifyToken, isUser, matchController.getWeeklyHoroscope);
router.post('/horoscope/monthly', verifyToken, isUser, matchController.getMonthlyHoroscope);
router.get(
  "/get-kundli/:userId",
  
  matchController.getUserKundli
);

module.exports = router;