const express = require('express');
const router = express.Router();

const ritualController = require('../../controllers/User/userRitualController');
const { verifyToken, isAdmin, isPandit } = require('../../middleware/auth');
const adminRitualController = require("../../controllers/admin/adminRitualController");
const upload = require("../../middleware/upload");

router.post(
    '/admin/ritual/add', 
    verifyToken, 
    isAdmin,
    upload.single('image'), 
    adminRitualController.addRitual
);

router.put('/:id', verifyToken,isAdmin,upload.single('image'),  adminRitualController.updateRitual);


router.get('/rituals', verifyToken, ritualController.getRituals);



router.get('/rituals/search', verifyToken, ritualController.searchRituals);

router.get('/rituals/detail/:id', verifyToken, ritualController.getRitualById);

router.get('/rituals/available-pandits', verifyToken, ritualController.getAvailablePandits);

router.post('/rituals/book', verifyToken, ritualController.createRitualBooking);

router.get('/rituals/my-bookings', verifyToken, ritualController.getUserRitualBookings);

router.get('/pandit/requests', verifyToken, isPandit, ritualController.getPanditRitualRequests);

router.get('/pandit/request/:id', verifyToken, isPandit, ritualController.getPanditRitualRequestById);

router.patch('/pandit/request/accept/:id', verifyToken, isPandit, ritualController.acceptRitualRequestByPandit);

router.patch('/pandit/request/reject/:id', verifyToken, isPandit, ritualController.rejectRitualRequestByPandit);

router.post('/rituals/payment/create-order', verifyToken, ritualController.createRitualOrder);

router.post('/rituals/payment/verify', verifyToken, ritualController.verifyRitualPayment);

module.exports = router;