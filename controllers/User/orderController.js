const Cart = require("../../models/E-comm/Cart");
const Product = require("../../models/E-comm/Product");
const Coupon = require("../../models/E-comm/Coupon");
const Order = require("../../models/E-comm/Order");
const PDFDocument = require("pdfkit");

exports.createOrder = async (req, res) => {
    try {

        const userId = req.user.id;

        const {
            paymentMethod,
            couponCode,
            notes,
            address,
            paymentDetails
        } = req.body;

        // Validate Payment Method
        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required."
            });
        }

        // Validate Address
        if (
            !address ||
            !address.name ||
            !address.mobile ||
            !address.address ||
            !address.city ||
            !address.state ||
            !address.pincode
        ) {
            return res.status(400).json({
                success: false,
                message: "Complete delivery address is required."
            });
        }

        // Fetch Cart
        const cart = await Cart.findOne({ user: userId })
            .populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty."
            });
        }

        let subtotal = 0;
        let orderItems = [];

        // Validate Products & Calculate Total
        for (const item of cart.items) {

            const product = item.product;

            if (!product || !product.isActive) {
                return res.status(400).json({
                    success: false,
                    message: "One or more products are unavailable."
                });
            }

            if (product.stock <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is out of stock.`
                });
            }

            if (item.quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${product.stock} quantity available for ${product.name}.`
                });
            }

            const price =
                product.salePrice && product.salePrice > 0
                    ? product.salePrice
                    : product.price;

            const itemSubtotal = price * item.quantity;

            subtotal += itemSubtotal;

            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price,
                subtotal: itemSubtotal
            });
        }

        // Coupon
        let coupon = null;
        let discount = 0;

        if (couponCode) {

            coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true
            });

            if (!coupon) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid coupon."
                });
            }

            const today = new Date();

            if (
                today < coupon.startDate ||
                today > coupon.endDate
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon expired."
                });
            }

            if (
                coupon.usageLimit > 0 &&
                coupon.usedCount >= coupon.usageLimit
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon usage limit exceeded."
                });
            }

            if (subtotal < coupon.minimumOrderAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum order amount should be ₹${coupon.minimumOrderAmount}.`
                });
            }

            if (coupon.discountType === "PERCENTAGE") {

                discount =
                    (subtotal * coupon.discountValue) / 100;

                if (
                    coupon.maximumDiscount > 0 &&
                    discount > coupon.maximumDiscount
                ) {
                    discount = coupon.maximumDiscount;
                }

            } else {
                discount = coupon.discountValue;
            }
        }

        // Charges
        const shippingCharge = 0;
        const gst = 0;

        const totalAmount = Math.max(
            subtotal - discount + shippingCharge + gst,
            0
        );

        // Generate Order Number
        const orderNumber =
            "ORD" +
            Date.now() +
            Math.floor(Math.random() * 1000);

        // Create Order
        const order = await Order.create({

            orderNumber,

            user: userId,

            address,

            items: orderItems,

            subtotal,

            discount,

            shippingCharge,

            gst,

            totalAmount,

            paymentMethod,

            paymentStatus:
                paymentMethod === "COD"
                    ? "Pending"
                    : "Paid",

            orderStatus:
                paymentMethod === "COD"
                    ? "Pending"
                    : "Confirmed",

            coupon: coupon
                ? {
                    code: coupon.code,
                    title: coupon.title,
                    discount
                }
                : undefined,

            paymentDetails:
                paymentMethod === "ONLINE"
                    ? {
                        transactionId: paymentDetails?.transactionId || "",
                        paymentGateway: "Razorpay",
                        paymentDate: new Date()
                    }
                    : {},

            notes

        });

        // Reduce Stock
        for (const item of cart.items) {

            await Product.findByIdAndUpdate(
                item.product._id,
                {
                    $inc: {
                        stock: -item.quantity
                    }
                }
            );

        }

        // Update Coupon Usage
        if (coupon) {

            coupon.usedCount += 1;
            await coupon.save();

        }

        // Clear Cart
        cart.items = [];
        await cart.save();

        return res.status(201).json({
            success: true,
            message: "Order placed successfully.",
            data: order
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};
// My Orders

exports.getMyOrders = async (req, res) => {
    try {

        const userId = req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ user: userId })
            .populate("items.product", "name images price salePrice")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments({
            user: userId
        });

        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully.",
            data: orders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                limit
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// Order Details
exports.getOrderDetails = async (req, res) => {
    try {

        const userId = req.user.id;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user: userId
        })
            .populate("items.product")
            .populate("user", "fullName mobile email");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order details fetched successfully.",
            data: order
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
    try {

        const userId = req.user.id;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user: userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        // Already Cancelled
        if (order.orderStatus === "Cancelled") {
            return res.status(400).json({
                success: false,
                message: "Order is already cancelled."
            });
        }

        // Can't cancel after packing
        if (
            ["Packed", "Shipped", "Out For Delivery", "Delivered"].includes(
                order.orderStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled once it is ${order.orderStatus}.`
            });
        }

        // Update Order Status
        order.orderStatus = "Cancelled";

        // If Online Payment
        if (order.paymentStatus === "Paid") {
            // Refund logic will be added later
        }

        await order.save();

        // Restore Product Stock
        for (const item of order.items) {

            await Product.findByIdAndUpdate(
                item.product,
                {
                    $inc: {
                        stock: item.quantity
                    }
                }
            );

        }

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully.",
            data: order
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



exports.downloadInvoice = async (req, res) => {
    try {

        const userId = req.user.id;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user: userId
        }).populate("items.product");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice-${order.orderNumber}.pdf`
        );

        const doc = new PDFDocument({
            margin: 40
        });

        doc.pipe(res);

        // Heading
        doc.fontSize(20).text("INVOICE", {
            align: "center"
        });

        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Order Number : ${order.orderNumber}`);
        doc.text(`Order Date : ${order.createdAt.toDateString()}`);
        doc.text(`Payment Method : ${order.paymentMethod}`);
        doc.text(`Payment Status : ${order.paymentStatus}`);
        doc.text(`Order Status : ${order.orderStatus}`);

        doc.moveDown();

        doc.text("Customer Details");
        doc.text(`Name : ${order.address.name}`);
        doc.text(`Mobile : ${order.address.mobile}`);
        doc.text(
            `Address : ${order.address.address}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`
        );

        doc.moveDown();

        doc.text("Products");

        order.items.forEach((item, index) => {

            doc.text(
                `${index + 1}. ${item.product.name}`
            );

            doc.text(
                `Qty : ${item.quantity} | Price : ₹${item.price} | Total : ₹${item.subtotal}`
            );

            doc.moveDown(0.5);

        });

        doc.moveDown();

        doc.text(`Subtotal : ₹${order.subtotal}`);
        doc.text(`Discount : ₹${order.discount}`);
        doc.text(`Shipping : ₹${order.shippingCharge}`);
        doc.text(`GST : ₹${order.gst}`);

        doc.fontSize(14).text(
            `Grand Total : ₹${order.totalAmount}`,
            {
                align: "right"
            }
        );

        doc.end();

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};