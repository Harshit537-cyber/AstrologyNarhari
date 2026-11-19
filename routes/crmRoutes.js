const express = require('express');
const backendApiAuth = require('../middleware/backendApiAuth');
const {
    lookupUserByPhone,
    getBookingById,
    getBookingsByPhone,
    receiveWebhook
} = require('../controllers/crmIntegrationController');

const router = express.Router();

router.post('/webhooks/events', receiveWebhook);
router.use(backendApiAuth);

router.get('/users/by-phone/:phone', lookupUserByPhone);
router.get('/bookings', getBookingsByPhone);
router.get('/bookings/:id', getBookingById);

module.exports = router;
