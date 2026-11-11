
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cron = require("node-cron");
const { generateDeadlineReminders } = require("./services/reminderService");

dotenv.config();

const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Home API
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to BugTrack API!"
  });
});

// Bug Routes
app.use("/api/bugs", require("./routes/bugRoutes"));

// Authentication Routes
app.use("/api/auth", require("./routes/authRoutes"));

// Comment Routes
app.use("/api/comments", require("./routes/commentRoutes"));

// Notification Routes
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Analytics Routes
app.use("/api/analytics", require("./routes/analyticsRoutes"));

// Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    generateDeadlineReminders().catch((error) =>
      console.error("Initial deadline reminder generation failed:", error.message)
    );

    cron.schedule("0 * * * *", () => {
      generateDeadlineReminders().catch((error) =>
        console.error("Deadline reminder generation failed:", error.message)
      );
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
