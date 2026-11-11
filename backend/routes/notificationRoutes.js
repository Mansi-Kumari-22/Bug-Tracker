const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("bug", "title status dueDate")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id/read", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/read-all", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { generateDeadlineReminders } = require("../services/reminderService");
    const result = await generateDeadlineReminders();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
