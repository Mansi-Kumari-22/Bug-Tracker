const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    bug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bug",
      required: true,
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    authorRole: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      minlength: 1,
      maxlength: 2000
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
