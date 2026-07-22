const Cart = require("../../models/E-comm/Cart");
const Product = require("../../models/E-comm/Product");

// ==============================
// Add To Cart
// ==============================
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required.",
            });
        }

        const product = await Product.findOne({
            _id: productId,
            isActive: true,
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock.",
            });
        }

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [],
            });
        }

        const index = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );

        if (index > -1) {
            cart.items[index].quantity += Number(quantity);

            if (cart.items[index].quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity exceeds available stock.",
                });
            }

            cart.items[index].price =
                product.salePrice > 0 ? product.salePrice : product.price;
        } else {
            cart.items.push({
                product: product._id,
                quantity: Number(quantity),
                price: product.salePrice > 0
                    ? product.salePrice
                    : product.price,
            });
        }

        cart.totalItems = cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        cart.totalAmount = cart.items.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
        );

        await cart.save();

        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Product added to cart successfully.",
            data: cart,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// api

// ==============================
// Get Cart
// ==============================
exports.getCart = async (req, res) => {
    try {

        const cart = await Cart.findOne({
            user: req.user.id,
        }).populate("items.product");

        if (!cart) {
            return res.status(200).json({
                success: true,
                data: {
                    items: [],
                    totalItems: 0,
                    totalAmount: 0,
                },
            });
        }

        return res.status(200).json({
            success: true,
            data: cart,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ==============================
// Update Cart Quantity
// ==============================
exports.updateCartQuantity = async (req, res) => {
    try {

        const { productId, quantity } = req.body;

        if (!productId || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid request.",
            });
        }

        const cart = await Cart.findOne({
            user: req.user.id,
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: "Quantity exceeds stock.",
            });
        }

        const item = cart.items.find(
            (i) => i.product.toString() === productId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart.",
            });
        }

        item.quantity = Number(quantity);

        cart.totalItems = cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        cart.totalAmount = cart.items.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
        );

        await cart.save();

        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Cart updated successfully.",
            data: cart,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ==============================
// Remove Cart Item
// ==============================
exports.removeCartItem = async (req, res) => {
    try {

        const { productId } = req.params;

        const cart = await Cart.findOne({
            user: req.user.id,
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        cart.items = cart.items.filter(
            (item) => item.product.toString() !== productId
        );

        cart.totalItems = cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        cart.totalAmount = cart.items.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
        );

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item removed successfully.",
            data: cart,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ==============================
// Clear Cart
// ==============================
exports.clearCart = async (req, res) => {
    try {

        const cart = await Cart.findOne({
            user: req.user.id,
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        cart.items = [];
        cart.totalItems = 0;
        cart.totalAmount = 0;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully.",
            data: cart,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};





exports.checkout = async (req, res) => {
    try {

        const userId = req.user.id;
        const { couponCode } = req.body;

        const cart = await Cart.findOne({ user: userId })
            .populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty.",
            });
        }

        let subtotal = 0;

        for (const item of cart.items) {

            if (!item.product || !item.product.isActive) {
                return res.status(400).json({
                    success: false,
                    message: "One or more products are unavailable.",
                });
            }

            if (item.quantity > item.product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `${item.product.name} is out of stock.`,
                });
            }

            subtotal += item.price * item.quantity;
        }

        let discount = 0;
        let coupon = null;

        if (couponCode) {

            coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true,
            });

            if (!coupon) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid coupon.",
                });
            }

            const today = new Date();

            if (today < coupon.startDate || today > coupon.endDate) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon expired.",
                });
            }

            if (
                coupon.usageLimit > 0 &&
                coupon.usedCount >= coupon.usageLimit
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon usage limit exceeded.",
                });
            }

            if (subtotal < coupon.minimumOrderAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum order amount is ₹${coupon.minimumOrderAmount}`,
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

        // Change these according to your business rules
        const shippingCharge = 0;
        const gst = 0;

        const total = subtotal - discount + shippingCharge + gst;

        return res.status(200).json({
            success: true,
            message: "Checkout calculated successfully.",
            data: {
                products: cart.items,
                subtotal,
                discount,
                shippingCharge,
                gst,
                total,
                appliedCoupon: coupon
                    ? {
                        _id: coupon._id,
                        code: coupon.code,
                        title: coupon.title,
                    }
                    : null,
            },
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};