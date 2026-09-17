const express = require("express");
const router = express.Router();
const { verifyToken, isUser, isPartner, isAdmin } = require("../../middleware/auth");
const {
  createConsultationRating,
  getPartnerRatingHistory,
  getAdminAllConsultationRatings,
  getAdminAstrologersRatingList,
} = require("../../controllers/ConsultationRating/consultationRatingController");

router.post("/submit", verifyToken, isUser, createConsultationRating);
router.get("/partner/my-ratings", verifyToken, isPartner, getPartnerRatingHistory);
router.get("/admin/all-ratings", verifyToken, isAdmin, getAdminAllConsultationRatings);
router.get("/admin/astrologer-summary", verifyToken, isAdmin, getAdminAstrologersRatingList);

module.exports = router;