const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        shortDescription: {
            type: String,
            trim: true,
        },

        description: {
            type: String,
            required: true,
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        images: {
            type: [String],
            default: [],
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        salePrice: {
            type: Number,
            default: 0,
            min: 0,
        },

        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
       


        benefits: [
            {
                type: String,
            },
        ],

        howToUse: {
            type: String,
        },

        careInstructions: {
            type: String,
        },

        isFeatured: {
            type: Boolean,
            default: false,
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

module.exports = mongoose.model("Product", productSchema);