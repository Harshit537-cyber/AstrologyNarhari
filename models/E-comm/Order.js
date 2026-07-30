const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            unique: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        address: {
            name: String,
            mobile: String,
            address: String,
            city: String,
            state: String,
            pincode: String
        },

        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product"
                },

                quantity: Number,

                price: Number,

                subtotal: Number
            }
        ],

        subtotal: Number,

        discount: {
            type: Number,
            default: 0
        },

        shippingCharge: {
            type: Number,
            default: 0
        },

        totalAmount: Number,

        paymentMethod: {
            type: String,
            enum: ["COD", "ONLINE"]
        },

        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed"],
            default: "Pending"
        },

        orderStatus: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Packed",
                "Shipped",
                "Out For Delivery",
                "Delivered",
                "Cancelled"
            ],
            default: "Pending"
        },
        coupon: {
            code: String,
            title: String,
            discount: {
                type: Number,
                default: 0
            }
        },

        gst: {
            type: Number,
            default: 0
        },


        paymentDetails: {
            transactionId: String,
            paymentGateway: String,
            paymentDate: Date
        },



        notes: String

    },
    { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);