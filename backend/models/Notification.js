const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    bug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bug",
      required: true,
      index: true
    },
    reminderType: {
      type: String,
      enum: ["upcoming", "due_today", "overdue"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

notificationSchema.index(
  { recipient: 1, bug: 1, reminderType: 1 },
  { unique: true, name: "unique_bug_reminder" }
);

module.exports = mongoose.model("Notification", notificationSchema);
