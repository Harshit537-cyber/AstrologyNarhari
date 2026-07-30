const express = require("express");
const router = express.Router();

const orderController = require("../../controllers/User/orderController");
const {verifyToken, isUser} = require("../../middleware/auth");

// ================= USER ORDER ROUTES ================= //

// Create Order
router.post(
    "/orders",
    verifyToken,
    isUser,
    orderController.createOrder
);

// My Orders
router.get(
    "/orders",
    verifyToken,isUser,
    orderController.getMyOrders
);

// Order Details
router.get(
    "/orders/:id",
    verifyToken,isUser,
    orderController.getOrderDetails
);

// Cancel Order
router.patch(
    "/orders/:id/cancel",
    verifyToken,isUser,
    orderController.cancelOrder
);

// Download Invoice
router.get(
    "/orders/:id/invoice",
    verifyToken,isUser,
    orderController.downloadInvoice
);

module.exports = router;