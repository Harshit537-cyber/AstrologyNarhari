const express = require('express');
const router = express.Router();
const { verifyToken, isPartner } = require('../../middleware/auth');
const {
    scheduleBooking,
    getPartnerBookingRequests,
    respondToBooking,
    getUserBookings,
    getPartnerAcceptedBookings,
    getPartnerRejectedBookings
} = require('../../controllers/bookingController/bookingController');

router.post('/schedule', verifyToken, scheduleBooking);
router.get('/user/my-bookings', verifyToken, getUserBookings);

router.get('/partner/requests', verifyToken, isPartner, getPartnerBookingRequests);
router.get('/partner/accepted', verifyToken, isPartner, getPartnerAcceptedBookings);
router.get('/partner/rejected', verifyToken, isPartner, getPartnerRejectedBookings);
router.post('/partner/respond', verifyToken, isPartner, respondToBooking);

module.exports = router;