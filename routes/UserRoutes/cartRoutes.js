const express = require("express");
const router = express.Router();

const cartController = require("../../controllers/User/cartController");
;

const {verifyToken} = require("../../middleware/auth"); // apna auth middleware

// Add To Cart
router.post("/add", verifyToken, cartController.addToCart);

// Get My Cart
router.get("/", verifyToken, cartController.getCart);

// Update Quantity
router.put("/update", verifyToken, cartController.updateCartQuantity);

// Remove Item
router.delete("/remove/:productId", verifyToken, cartController.removeCartItem);

// Clear Cart
router.delete("/clear", verifyToken, cartController.clearCart);



router.post(
    "/checkout",
    verifyToken,
    cartController.checkout
);

module.exports = router;