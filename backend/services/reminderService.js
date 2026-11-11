const Bug = require("../models/Bug");
const User = require("../models/User");
const Notification = require("../models/Notification");

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const generateDeadlineReminders = async () => {
  const users = await User.find({ isActive: true }).select("_id");
  const bugs = await Bug.find({
    dueDate: { $ne: null },
    status: { $ne: "Resolved" }
  });

  const today = startOfDay(new Date());
  const created = [];

  for (const bug of bugs) {
    const due = startOfDay(bug.dueDate);
    const daysBefore = Math.round((due - today) / 86400000);

    let reminderType = null;
    let message = null;

    if (daysBefore < 0) {
      reminderType = "overdue";
      message = `"${bug.title}" is overdue by ${Math.abs(daysBefore)} day(s).`;
    } else if (daysBefore === 0) {
      reminderType = "due_today";
      message = `"${bug.title}" is due today.`;
    } else if (daysBefore <= 2) {
      reminderType = "upcoming";
      message = `"${bug.title}" is due in ${daysBefore} day(s).`;
    }

    if (!reminderType) continue;

    for (const user of users) {
      try {
        await Notification.updateOne(
          { recipient: user._id, bug: bug._id, reminderType },
          {
            $setOnInsert: {
              recipient: user._id,
              bug: bug._id,
              reminderType,
              title: bug.title,
              message
            }
          },
          { upsert: true }
        );
        created.push({ bug: bug._id, reminderType, recipient: user._id });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
  }

  return { checked: bugs.length, reminderWrites: created.length };
};

module.exports = { generateDeadlineReminders };
