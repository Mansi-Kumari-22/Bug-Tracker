const express = require("express");
const router = express.Router();
const Bug = require("../models/Bug");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

const emptyCounts = (labels) =>
  Object.fromEntries(labels.map((label) => [label, 0]));

router.get("/", async (req, res) => {
  try {
    const range = Number.parseInt(req.query.range || "all", 10);
    const days = Number.isFinite(range) && range > 0 ? range : null;
    const match = {};

    if (days) {
      match.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }
    if (req.query.status && req.query.status !== "All") {
      match.status = req.query.status;
    }
    if (req.query.priority && req.query.priority !== "All") {
      match.priority = req.query.priority;
    }
    if (req.query.severity && req.query.severity !== "All") {
      match.severity = req.query.severity;
    }

    const bugs = await Bug.find(match).lean();
    const totalBugs = bugs.length;
    const statusCounts = emptyCounts(["Open", "In Progress", "In Review", "Resolved"]);
    const priorityCounts = emptyCounts(["Low", "Medium", "High", "Critical"]);
    const severityCounts = emptyCounts(["Critical", "High", "Medium", "Low"]);
    const assignedCounts = {};
    let resolutionHours = [];

    bugs.forEach((bug) => {
      if (Object.prototype.hasOwnProperty.call(statusCounts, bug.status)) statusCounts[bug.status]++;
      if (Object.prototype.hasOwnProperty.call(priorityCounts, bug.priority)) priorityCounts[bug.priority]++;

      const severity = bug.severity || "Medium";
      if (!severityCounts[severity]) severityCounts[severity] = 0;
      severityCounts[severity]++;

      const assignee = bug.assigned || "Unassigned";
      assignedCounts[assignee] = (assignedCounts[assignee] || 0) + 1;

      if (bug.status === "Resolved" && bug.createdAt) {
        const resolvedDate = bug.resolvedAt || bug.updatedAt;
        if (resolvedDate) {
          const hours = (new Date(resolvedDate) - new Date(bug.createdAt)) / 3600000;
          if (Number.isFinite(hours) && hours >= 0) resolutionHours.push(hours);
        }
      }
    });

    const resolvedBugs = statusCounts.Resolved;
    const openBugs = statusCounts.Open;
    const inProgressBugs = statusCounts["In Progress"];
    const criticalBugs = priorityCounts.Critical;
    const resolutionRate = totalBugs ? Number(((resolvedBugs / totalBugs) * 100).toFixed(1)) : 0;
    const averageResolutionHours = resolutionHours.length
      ? Number((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length).toFixed(1))
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pendingBugs = bugs.filter((bug) => bug.status !== "Resolved").length;
    const overdueBugs = bugs.filter((bug) =>
      bug.status !== "Resolved" &&
      bug.dueDate &&
      new Date(bug.dueDate) < today
    ).length;

    const mostCommonPriority = Object.entries(priorityCounts)
      .sort((first, second) => second[1] - first[1])[0]?.[0] || "None";

    const trendDays = days || 30;
    const creationTrend = [];
    const resolutionTrend = [];
    for (let offset = trendDays - 1; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const dateKey = date.toISOString().slice(0, 10);
      const createdCount = bugs.filter((bug) => bug.createdAt && new Date(bug.createdAt).toISOString().slice(0, 10) === dateKey).length;
      const resolvedCount = bugs.filter((bug) => {
        if (bug.status !== "Resolved") return false;
        const resolvedDate = bug.resolvedAt || bug.updatedAt;
        return resolvedDate && new Date(resolvedDate).toISOString().slice(0, 10) === dateKey;
      }).length;

      creationTrend.push({ date: dateKey, count: createdCount });
      resolutionTrend.push({ date: dateKey, count: resolvedCount });
    }

    res.json({
      success: true,
      statistics: {
        totalBugs,
        openBugs,
        inProgressBugs,
        resolvedBugs,
        criticalBugs,
        resolutionRate,
        averageResolutionHours,
        pendingBugs,
        overdueBugs,
        mostCommonPriority
      },
      statusDistribution: [
        { name: "Open", value: statusCounts.Open },
        { name: "In Progress", value: inProgressBugs },
        { name: "In Review", value: statusCounts["In Review"] },
        { name: "Resolved", value: resolvedBugs }
      ],
      priorityDistribution: Object.entries(priorityCounts).map(([name, count]) => ({ name, count })),
      severityDistribution: Object.entries(severityCounts).map(([name, count]) => ({ name, count })),
      creationTrend,
      resolutionTrend,
      assignedDistribution: Object.entries(assignedCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((first, second) => second.count - first.count)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
