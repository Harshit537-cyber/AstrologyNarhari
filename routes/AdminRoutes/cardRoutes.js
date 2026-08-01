const express = require("express");
const router = express.Router();

const {
    addCard,
    getAllCards,
    getCardById,
    updateCard,
    deleteCard,
} = require("../../controllers/admin/cardController");


const {verifyToken,isAdmin} = require('../../middleware/auth')
// Admin CRUD
router.post("/add-card", addCard);
router.get("/get-all-cards", getAllCards);
router.get("/get-card/:id", getCardById);
router.put("/update-card/:id", updateCard);
router.delete("/delete-card/:id", deleteCard);

module.exports = router;