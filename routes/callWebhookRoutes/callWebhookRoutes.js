const express = require('express');
const router = express.Router();
const { handleExotelWebhook } = require('../../controllers/callController/callWebhookController');

// Exotel post request bhejta hai webhook par, isliye express.urlencoded use karna zaroori hai
router.post('/webhook', express.urlencoded({ extended: true }), handleExotelWebhook);

module.exports = router;