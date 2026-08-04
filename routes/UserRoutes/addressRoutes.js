const express = require("express");
const router = express.Router();

const {verifyToken, isUser} = require("../../middleware/auth");

const {
  addAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../../controllers/User/addressController");

// Add Address
router.post("/add", verifyToken, isUser, addAddress);

// Get All Addresses
router.get("/get-my-adddresses", verifyToken, isUser, getMyAddresses);

// Get Address By ID
router.get("/:id", verifyToken, isUser, getAddressById);

// Update Address
router.put("/:id", verifyToken, isUser, updateAddress);

// Delete Address
router.delete("/:id", verifyToken, isUser, deleteAddress);

// Set Default Address
router.patch("/default/:id", verifyToken, isUser, setDefaultAddress);

module.exports = router;