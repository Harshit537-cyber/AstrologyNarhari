const express = require('express');
const router = express.Router();

const ritualController = require('../../controllers/User/userRitualController');
const { verifyToken, isAdmin ,isPartner} = require('../../middleware/auth');
const adminRitualController = require("../../controllers/admin/adminRitualController")
const upload = require("../../middleware/upload");

router.post(
    '/admin/ritual/add', 
    verifyToken, isAdmin,
    upload.single('image'), 
    adminRitualController.addRitual
);

router.get('/rituals',verifyToken,ritualController.getRituals);

router.get('/rituals/search',verifyToken, ritualController.searchRituals);

router.get('/rituals/detail/:id',verifyToken, ritualController.getRitualById);

router.get('/rituals/available-partners', verifyToken,ritualController.getAvailablePartners);

router.post('/rituals/book', verifyToken,ritualController.createRitualBooking);

router.get('/partner/requests',  verifyToken,isPartner,ritualController.getPartnerRitualRequests);

router.get('/partner/request/:id', verifyToken,ritualController.getPartnerRitualRequestById);

router.patch('/partner/request/accept/:id',  verifyToken,ritualController.acceptRitualRequest);

router.patch('/partner/request/reject/:id',  verifyToken,ritualController.rejectRitualRequest);



module.exports = router;