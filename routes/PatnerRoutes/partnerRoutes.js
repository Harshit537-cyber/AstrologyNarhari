const express = require('express');
const router = express.Router();
const { verifyToken, isPartner, isAdmin } = require("../../middleware/auth");

const {
  getServiceAvailability,
  toggleServiceAvailability,
} = require("../../controllers/Patner/partnerAvailabilityController");


router.get(
  "/service-availability",
  verifyToken,
  isPartner,
  getServiceAvailability,
);


router.patch(
  "/toggle-service",
  verifyToken,
  isPartner,
  toggleServiceAvailability,
);


module.exports = router;