const express = require("express");
const router = express.Router();
const { verifyToken, isPartner } = require("../../middleware/auth");
const {
  getPartnerEarningsSummary,
  getPartnerEarningsGraph,
  getCallWiseEarnings,
  getCallEarningById,
} = require("../../controllers/Patner/partnerEarningsController");

router.use(verifyToken, isPartner);

router.get("/summary", getPartnerEarningsSummary);
router.get("/analytics", getPartnerEarningsGraph);
router.get("/calls", getCallWiseEarnings);
router.get("/calls/:sessionId", getCallEarningById);

module.exports = router;