const mongoose = require("mongoose");

const topBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      required: true,
    },

    buttonText: {
      type: String,
      trim: true,
      default: "Shop Now",
    },

    redirectType: {
      type: String,
      enum: ["product", "category", "url", "none"],
      default: "none",
    },

    redirectValue: {
      type: String,
      trim: true,
      default: "",
    },

    displayOrder: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model("TopBanner", topBannerSchema);