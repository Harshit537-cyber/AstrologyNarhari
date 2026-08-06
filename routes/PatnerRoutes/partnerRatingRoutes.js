const express = require('express');
const router = express.Router();
const {verifyToken, isPartner, isAdmin} = require("../../middleware/auth")
const partnerRatingController = require("../../controllers/Patner/partnerRatingController"); 

router.post("/submit-rating", verifyToken, isPartner, partnerRatingController.submitRating);

router.get('/all', verifyToken, isAdmin, partnerRatingController.getAllRatings);
router.get('/stats', verifyToken, isAdmin, partnerRatingController.getRatingStats);
router.get('/check-status', verifyToken, isPartner, partnerRatingController.checkRatingStatus);
router.get('/my-rating', verifyToken, isPartner, partnerRatingController.getMyRating);


module.exports = router;