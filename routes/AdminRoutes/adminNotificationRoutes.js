const express = require("express");
const router = express.Router();
const {
  sendAdminNotification,
  getNotificationHistory,
  deleteNotification,
} = require("../../controllers/admin/adminNotificationController");

const { verifyToken, isAdmin } = require("../../middleware/auth");

router.post("/send", verifyToken, isAdmin, sendAdminNotification);
router.get("/history", verifyToken, isAdmin, getNotificationHistory);
router.delete("/:id", verifyToken, isAdmin, deleteNotification);

module.exports = router;