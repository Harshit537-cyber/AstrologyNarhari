const mongoose = require("mongoose");

const consultationRatingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    serviceType: {
      type: String,
      enum: ["call", "video_call", "chat", "instant_call", "instant_chat"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

consultationRatingSchema.index({ user: 1, referenceId: 1 }, { unique: true });

module.exports = mongoose.model("ConsultationRating", consultationRatingSchema);