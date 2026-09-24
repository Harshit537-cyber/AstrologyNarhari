const express = require('express');
const router = express.Router();
const { verifyToken, isPartner, isAdmin } = require('../../middleware/auth');
const {
    addBankAccount,
    updateBankAccount,
    getBankAccount,
    getAllPartnersWithBankForAdmin,
    getPartnerWithBankByIdForAdmin
} = require('../../controllers/Patner/partnerBank');

router.post('/', verifyToken, isPartner, addBankAccount);
router.put('/', verifyToken, isPartner, updateBankAccount);
router.get('/', verifyToken, isPartner, getBankAccount);

router.get('/admin/all', verifyToken, isAdmin, getAllPartnersWithBankForAdmin);
router.get('/admin/:partnerId', verifyToken, isAdmin, getPartnerWithBankByIdForAdmin);

module.exports = router;