const express = require('express');
const router = express.Router();
const { submitMessage, getAllMessages,getMessageById ,deleteMessage} = require('../../controllers/contact/contactController');
const {verifyToken, isAdmin} = require("../../middleware/auth");
router.post('/submit', submitMessage);

router.get('/messages',verifyToken, isAdmin, getAllMessages);

router.get("/message/:id", verifyToken, isAdmin,getMessageById);

router.delete("/delete/:id", verifyToken, isAdmin, deleteMessage)

module.exports = router;