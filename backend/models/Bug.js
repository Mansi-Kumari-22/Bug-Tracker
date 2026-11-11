
const mongoose = require("mongoose");

const bugSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium"
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "In Review", "Resolved"],
      default: "Open"
    },
    assigned: {
      type: String,
      default: "Unassigned",
      trim: true
    },
    dueDate: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    screenshot: {
      type: new mongoose.Schema({
      data: String,
      name: String,
      type: String
      }, { _id: false }),
      default: undefined
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bug", bugSchema);
