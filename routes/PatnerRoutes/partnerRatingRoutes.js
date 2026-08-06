const express = require('express');
const router = express.Router();
const {verifyToken, isPartner, isAdmin} = require("../../middleware/auth")
const partnerRatingController = require("../../controllers/Patner/partnerRatingController"); 

router.post("/submit-rating", verifyToken, isPartner, partnerRatingController.submitRating);

router.get('/all', verifyToken, isAdmin, partnerRatingController.getAllRatings);
router.get('/stats', verifyToken, isAdmin, partnerRatingController.getRatingStats);


module.exports = router;