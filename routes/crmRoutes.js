const express = require('express');
const backendApiAuth = require('../middleware/backendApiAuth');
const {
    lookupUserByPhone,
    getBookingById,
    getBookingsByPhone,
    receiveWebhook,
    createPaymentLink,
    receiveRazorpayWebhook
} = require('../controllers/crmIntegrationController');

const router = express.Router();

router.post('/webhooks/events', receiveWebhook);
router.post('/webhooks/razorpay', receiveRazorpayWebhook);

router.use(backendApiAuth);

router.get('/users/by-phone/:phone', lookupUserByPhone);
router.get('/bookings', getBookingsByPhone);
router.get('/bookings/:id', getBookingById);
router.post('/payment-links', createPaymentLink);

module.exports = router;
