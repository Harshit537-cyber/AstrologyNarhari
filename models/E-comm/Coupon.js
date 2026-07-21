const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
        },

        discountType: {
            type: String,
            enum: ["PERCENTAGE", "FIXED"],
            required: true,
        },

        discountValue: {
            type: Number,
            required: true,
        },

        minimumOrderAmount: {
            type: Number,
            default: 0,
        },

        maximumDiscount: {
            type: Number,
            default: 0,
        },

        usageLimit: {
            type: Number,
            default: 0,
        },

        usedCount: {
            type: Number,
            default: 0,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Coupon", couponSchema);