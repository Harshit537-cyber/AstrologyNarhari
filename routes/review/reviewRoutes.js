const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middleware/auth");
const {addReview} = require("../../controllers/review/reviewController");

router.post("/submit-review", verifyToken, addReview);

module.exports = router;

