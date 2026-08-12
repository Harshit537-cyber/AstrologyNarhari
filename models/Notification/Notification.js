const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    targetType: {
      type: String,
      enum: ["all", "users", "partners", "pandits", "specific"],
      required: true,
    },
    
    targetUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "targetModel",
      },
    ],
    targetModel: {
      type: String,
      enum: ["User", "Partner", "Pandit"],
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);