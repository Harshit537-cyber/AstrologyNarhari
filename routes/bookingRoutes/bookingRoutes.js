const express = require('express');
const router = express.Router();
const { verifyToken, isPartner } = require('../../middleware/auth');
const {
    scheduleBooking,
    getPartnerBookingRequests,
    respondToBooking,
    getUserBookings
} = require('../../controllers/bookingController/bookingController');

router.post('/schedule', verifyToken, scheduleBooking);
router.get('/user/my-bookings', verifyToken, getUserBookings);

router.get('/partner/requests', verifyToken, isPartner, getPartnerBookingRequests);
router.post('/partner/respond', verifyToken, isPartner, respondToBooking);

module.exports = router;