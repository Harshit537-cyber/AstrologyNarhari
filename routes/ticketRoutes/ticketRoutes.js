const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
const { verifyToken, isAdmin } = require('../../middleware/auth');
const {
    createTicket,
    getMyTickets,
    getTicketById,
    getAllTicketsAdmin,
    updateTicketStatusAdmin
} = require('../../controllers/ticketController/ticketController');

router.post(
    '/create',
    verifyToken,
    upload.array('attachments', 5),
    createTicket
);

router.get(
    '/my-tickets',
    verifyToken,
    getMyTickets
);

router.get(
    '/:id',
    verifyToken,
    getTicketById
);

router.get(
    '/admin/all',
    verifyToken,
    isAdmin,
    getAllTicketsAdmin
);

router.put(
    '/admin/update/:id',
    verifyToken,
    isAdmin,
    updateTicketStatusAdmin
);

module.exports = router;