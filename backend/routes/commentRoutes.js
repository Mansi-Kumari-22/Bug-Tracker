const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Bug = require("../models/Bug");
const Comment = require("../models/Comment");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// Fetch every comment for one bug
router.get("/bug/:bugId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bugId)) {
      return res.status(400).json({ success: false, message: "Invalid bug ID" });
    }

    const bugExists = await Bug.exists({ _id: req.params.bugId });
    if (!bugExists) {
      return res.status(404).json({ success: false, message: "Bug not found" });
    }

    const comments = await Comment.find({ bug: req.params.bugId }).sort({ createdAt: 1 });
    res.json({ success: true, count: comments.length, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a comment to one bug
router.post("/bug/:bugId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bugId)) {
      return res.status(400).json({ success: false, message: "Invalid bug ID" });
    }

    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ success: false, message: "Comment cannot exceed 2000 characters" });
    }

    const bugExists = await Bug.exists({ _id: req.params.bugId });
    if (!bugExists) {
      return res.status(404).json({ success: false, message: "Bug not found" });
    }

    const comment = await Comment.create({
      bug: req.params.bugId,
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      text
    });

    res.status(201).json({ success: true, message: "Comment posted", comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

const canManageComment = (comment, user) =>
  comment.author.toString() === user._id.toString() || user.role === "Admin";

// Edit a comment: author or Admin
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid comment ID" });
    }

    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ success: false, message: "Comment cannot exceed 2000 characters" });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }
    if (!canManageComment(comment, req.user)) {
      return res.status(403).json({ success: false, message: "You can only edit your own comments" });
    }

    comment.text = text;
    await comment.save();
    res.json({ success: true, message: "Comment updated", comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a comment: author or Admin
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid comment ID" });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }
    if (!canManageComment(comment, req.user)) {
      return res.status(403).json({ success: false, message: "You can only delete your own comments" });
    }

    await comment.deleteOne();
    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
