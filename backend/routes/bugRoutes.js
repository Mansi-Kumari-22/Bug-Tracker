
const express = require("express");
const router = express.Router();
const Bug = require("../models/Bug");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

// GET all bugs - Login required
router.get("/", protect, async (req, res) => {
  try {
    const bugs = await Bug.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bugs.length,
      bugs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single bug - Login required
router.get("/:id", protect, async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found"
      });
    }

    res.json({ success: true, bug });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid bug ID" });
  }
});

// CREATE bug - Login required
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, priority, severity, assigned, screenshot, dueDate } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required"
      });
    }

    const normalize = (value) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");

    const existingBugs = await Bug.find({}, { title: 1 });

    const normalizedTitle = normalize(title.trim());
    const duplicate = existingBugs.find((bug) => {
      const sameTitle = normalize(bug.title) === normalizedTitle;
      return sameTitle;
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Bug Title "${duplicate.title}" already exists. Please use a different bug title.`
      });
    }

    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(`${dueDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(parsedDueDate.getTime()) || parsedDueDate < today) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be in the past"
        });
      }
    }

    const bug = await Bug.create({
      title,
      description,
      priority,
      severity: severity || "Medium",
      assigned: assigned?.trim() || "Unassigned",
      dueDate: parsedDueDate,
      screenshot: screenshot?.data && typeof screenshot.data === "string"
        ? {
            data: screenshot.data,
            name: typeof screenshot.name === "string" ? screenshot.name : "",
            type: typeof screenshot.type === "string" ? screenshot.type : ""
          }
        : undefined
    });

    res.status(201).json({
      success: true,
      message: "Bug created successfully",
      bug
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// UPDATE bug - Login required
router.put("/:id", protect, async (req, res) => {
  try {
    if (req.body.dueDate !== undefined && req.body.dueDate !== null && req.body.dueDate !== "") {
      const parsedDueDate = new Date(`${req.body.dueDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(parsedDueDate.getTime()) || parsedDueDate < today) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be in the past"
        });
      }
      req.body.dueDate = parsedDueDate;
    } else if (req.body.dueDate === "") {
      req.body.dueDate = null;
    }

    if (req.body.status === "Resolved") {
      req.body.resolvedAt = new Date();
    } else if (req.body.status && req.body.status !== "Resolved") {
      req.body.resolvedAt = null;
    }

    const bug = await Bug.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found"
      });
    }

    res.json({
      success: true,
      message: "Bug updated successfully",
      bug
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE bug - Login required
router.delete("/:id", protect, async (req, res) => {
  try {
    const bug = await Bug.findByIdAndDelete(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found"
      });
    }

    await Comment.deleteMany({ bug: bug._id });
    await Notification.deleteMany({ bug: bug._id });

    res.json({
      success: true,
      message: "Bug deleted successfully"
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
