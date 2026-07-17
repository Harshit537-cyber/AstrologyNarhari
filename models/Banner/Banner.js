const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true
    },

    image: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["home", "offer", "category", "popup"],
      default: "home"
    },

    redirectType: {
      type: String,
      enum: ["none", "product", "category", "url"],
      default: "none"
    },

    redirectId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    redirectUrl: {
      type: String,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Banner", bannerSchema);