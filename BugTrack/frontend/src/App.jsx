
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./App.css";

const API_URL = "http://localhost:5000/api/bugs";
const AUTH_URL = "http://localhost:5000/api/auth";
const COMMENT_URL = "http://localhost:5000/api/comments";
const NOTIFICATION_URL = "http://localhost:5000/api/notifications";
const ANALYTICS_URL = "http://localhost:5000/api/analytics";
const authHeaders = (extraHeaders = {}) => ({
  ...extraHeaders,
  Authorization: `Bearer ${localStorage.getItem("bugtrack_token")}`
});

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("bugtrack_user");
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("bugtrack_user");
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login");
  const [loginData, setLoginData] = useState({ name: "", email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [developerFilter, setDeveloperFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [draggingId, setDraggingId] = useState("");
  const [boardNotice, setBoardNotice] = useState("");
  const [activeCommentBug, setActiveCommentBug] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsRange, setAnalyticsRange] = useState("all");
  const [analyticsPriority, setAnalyticsPriority] = useState("All");
  const [analyticsStatus, setAnalyticsStatus] = useState("All");
  const [analyticsSeverity, setAnalyticsSeverity] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    severity: "Medium",
    assigned: "",
    dueDate: "",
    screenshot: null
  });

  const readScreenshot = (file) => {
    if (!file?.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Screenshot must be smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
        ...current,
        screenshot: {
          data: reader.result,
          name: file.name,
          type: file.type
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const captureScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("Screen capture is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      const data = canvas.toDataURL("image/png");
      setFormData((current) => ({
        ...current,
        screenshot: {
          data,
          name: `screenshot-${Date.now()}.png`,
          type: "image/png"
        }
      }));

      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        alert("Could not capture the screen.");
      }
    }
  };

  // Get all bugs from MongoDB
  const fetchBugs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Could not load bugs");

      const data = await response.json();
      setBugs(data.bugs || []);
    } catch {
      setError("Backend se connection nahi ho raha. Check karo backend running hai ya nahi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return undefined;

    const loadTimer = window.setTimeout(fetchBugs, 0);
    return () => window.clearTimeout(loadTimer);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(NOTIFICATION_URL, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    const notificationTimer = window.setTimeout(fetchNotifications, 0);
    const interval = window.setInterval(fetchNotifications, 60000);
    return () => {
      window.clearTimeout(notificationTimer);
      window.clearInterval(interval);
    };
  }, [user]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      const query = new URLSearchParams({
        range: analyticsRange,
        priority: analyticsPriority,
        status: analyticsStatus,
        severity: analyticsSeverity
      });
      const response = await fetch(`${ANALYTICS_URL}?${query}`, {
        headers: authHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load analytics");
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsRange, analyticsPriority, analyticsStatus, analyticsSeverity]);

  useEffect(() => {
    if (!user || activeView !== "analytics") return undefined;
    const timer = window.setTimeout(fetchAnalytics, 0);
    return () => window.clearTimeout(timer);
  }, [user, activeView, fetchAnalytics]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch(`${AUTH_URL}/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("bugtrack_token", data.token);
      localStorage.setItem("bugtrack_user", JSON.stringify(data.user));
      setUser(data.user);
      setLoginData({ name: "", email: "", password: "" });
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bugtrack_token");
    localStorage.removeItem("bugtrack_user");
    setUser(null);
  };

  // Add new bug
  const handleSubmit = async (e) => {
    e.preventDefault();
    setDuplicateError("");

    const normalize = (value) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");

    const duplicate = bugs.find((bug) => {
      const sameTitle =
        normalize(bug.title) === normalize(formData.title.trim());
      return sameTitle;
    });

    if (duplicate) {
      const message = `Bug Title "${duplicate.title}" already exists. Please use a different bug title.`;
      setDuplicateError(message);
      window.alert(message);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          ...formData,
          assigned: formData.assigned.trim() || "Unassigned"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Bug could not be created");

      setFormData({
        title: "",
        description: "",
        priority: "Medium",
        severity: "Medium",
        assigned: "",
        dueDate: "",
        screenshot: null
      });
      setDuplicateError("");
      setShowForm(false);
      setActiveView("all");
      setFilter("All");
      await fetchBugs();
    } catch (err) {
      if (err.message.toLower?.().includes("bug title")) {
        setDuplicateError(err.message);
        window.alert(err.message);
      } else {
        alert(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Update bug status
  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error("Status update failed");
      await fetchBugs();
      setBoardNotice(`Bug moved to ${status} successfully.`);
      window.setTimeout(() => setBoardNotice(""), 3000);
    } catch (err) {
      setBoardNotice("Could not update the bug status. Please try again.");
      window.setTimeout(() => setBoardNotice(""), 4000);
      alert(err.message);
    }
  };

  // Delete bug
  const deleteBug = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bug?")) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) throw new Error("Bug could not be deleted");
      await fetchBugs();
    } catch (err) {
      alert(err.message);
    }
  };

  const openComments = async (bug) => {
    setActiveCommentBug(bug);
    setCommentText("");
    setEditingCommentId("");
    setComments([]);
    setCommentsError("");
    setCommentsLoading(true);

    try {
      const response = await fetch(`${COMMENT_URL}/bug/${bug._id}`, {
        headers: authHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load comments");
      setComments(data.comments || []);
    } catch (err) {
      setCommentsError(err.message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeComments = () => {
    setActiveCommentBug(null);
    setComments([]);
    setCommentText("");
    setEditingCommentId("");
    setCommentsError("");
  };

  const saveComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCommentBug) return;

    try {
      const editing = Boolean(editingCommentId);
      const response = await fetch(
        editing ? `${COMMENT_URL}/${editingCommentId}` : `${COMMENT_URL}/bug/${activeCommentBug._id}`,
        {
          method: editing ? "PUT" : "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ text: commentText.trim() })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save comment");

      if (editing) {
        setComments((current) =>
          current.map((item) => (item._id === editingCommentId ? data.comment : item))
        );
      } else {
        setComments((current) => [...current, data.comment]);
      }
      setCommentText("");
      setEditingCommentId("");
      setCommentsError("");
    } catch (err) {
      setCommentsError(err.message);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(`${COMMENT_URL}/${commentId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete comment");
      setComments((current) => current.filter((item) => item._id !== commentId));
      if (editingCommentId === commentId) {
        setEditingCommentId("");
        setCommentText("");
      }
    } catch (err) {
      setCommentsError(err.message);
    }
  };

  const handleDrop = async (event, status) => {
    event.preventDefault();
    const bugId = event.dataTransfer.getData("text/plain") || draggingId;
    if (!bugId) return;

    const bug = bugs.find((item) => item._id === bugId);
    if (!bug || bug.status === status) {
      setDraggingId("");
      return;
    }

    await updateStatus(bugId, status);
    setDraggingId("");
  };

  const developers = [...new Set(
    bugs.map((bug) => bug.assigned || "Unassigned").filter(Boolean)
  )].sort();

  const boardBugs = bugs
    .filter((bug) => priorityFilter === "All" || bug.priority === priorityFilter)
    .filter((bug) =>
      developerFilter === "All" ||
      (bug.assigned || "Unassigned") === developerFilter
    )
    .filter((bug) => bug.title.toLowerCase().includes(search.toLowerCase()))
    .sort((first, second) => {
      const firstDate = new Date(first.createdAt || 0).getTime();
      const secondDate = new Date(second.createdAt || 0).getTime();
      return sortOrder === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });

  const liveDuplicateBug = bugs.find((bug) => {
    const normalize = (value) =>
      String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const sameTitle =
      normalize(bug.title) === normalize(formData.title.trim()) &&
      formData.title.trim().length > 0;
    return sameTitle;
  });

  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch =
      bug.title.toLowerCase().includes(search.toLowerCase()) ||
      bug.description.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || bug.status === filter;
    const matchesSeverity =
      severityFilter === "All" || (bug.severity || "Medium") === severityFilter;
    const matchesView =
      activeView === "all"
        ? bug.status !== "Resolved"
        : activeView === "resolved"
          ? bug.status === "Resolved"
          : true;

    return matchesSearch && matchesFilter && matchesSeverity && matchesView;
  });

  const getTodayInput = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    return new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10);
  };

  const getDeadlineInfo = (bug) => {
    if (!bug.dueDate) return { label: "No deadline", className: "deadline-none" };
    if (bug.status === "Resolved") return { label: "Resolved", className: "deadline-resolved" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(bug.dueDate);
    due.setHours(0, 0, 0, 0);
    const days = Math.round((due - today) / 86400000);

    if (days < 0) return { label: `${Math.abs(days)} day(s) overdue`, className: "deadline-overdue" };
    if (days === 0) return { label: "Due today", className: "deadline-overdue" };
    if (days <= 2) return { label: `${days} day(s) remaining`, className: "deadline-upcoming" };
    return { label: `${days} day(s) remaining`, className: "deadline-normal" };
  };

  const updateDueDate = async (id, dueDate) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dueDate })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update due date");
      await fetchBugs();
    } catch (err) {
      alert(err.message);
    }
  };

  const updateSeverity = async (id, severity) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ severity })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update severity");
      await fetchBugs();
    } catch (err) {
      alert(err.message);
    }
  };

  const markNotificationRead = async (notification) => {
    try {
      await fetch(`${NOTIFICATION_URL}/${notification._id}/read`, {
        method: "PUT",
        headers: authHeaders()
      });
      await fetchNotifications();
      setNotificationOpen(false);
      const bugId = notification.bug?._id || notification.bug;
      const bug = bugs.find((item) => item._id === bugId);
      if (bug) {
        if (bug.status === "Resolved") setActiveView("resolved");
        else setActiveView("all");
        window.scrollTo({ top: 0, behavior: "smooth" });
        await openComments(bug);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${NOTIFICATION_URL}/read-all`, {
        method: "PUT",
        headers: authHeaders()
      });
      await fetchNotifications();
    } catch (err) {
      alert(err.message);
    }
  };

  const openCount = bugs.filter((bug) => bug.status === "Open").length;
  const progressCount = bugs.filter((bug) => bug.status === "In Progress").length;
  const resolvedCount = bugs.filter((bug) => bug.status === "Resolved").length;
  const severityCounts = {
    Critical: bugs.filter((bug) => (bug.severity || "Medium") === "Critical").length,
    High: bugs.filter((bug) => (bug.severity || "Medium") === "High").length,
    Medium: bugs.filter((bug) => (bug.severity || "Medium") === "Medium").length,
    Low: bugs.filter((bug) => (bug.severity || "Medium") === "Low").length
  };

  if (!user) {
    return (
      <div className="login-page">
        <section className="login-brand">
          <div className="login-brand-content">
            <div className="login-logo">🐞</div>
            <h1>BugTrack</h1>
            <p>Track issues, assign work, and keep every fix moving.</p>
          </div>
        </section>

        <main className="login-panel">
          <form className="login-card" onSubmit={handleAuth}>
            <div className="login-heading">
              <span className="login-icon">🔐</span>
              <h2>{authMode === "login" ? "Welcome back" : "Create account"}</h2>
              <p>
                {authMode === "login"
                  ? "Sign in to your BugTrack account."
                  : "Register your BugTrack account."}
              </p>
            </div>

            {loginError && <div className="login-error">{loginError}</div>}

            {authMode === "register" && (
              <>
                <label>Full name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={loginData.name}
                  onChange={(e) => setLoginData({ ...loginData, name: e.target.value })}
                  autoComplete="name"
                  required
                />
              </>
            )}

            <label>Email address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              autoComplete="email"
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              autoComplete="current-password"
              minLength={authMode === "register" ? 6 : undefined}
              required
            />

            <button className="login-button" type="submit" disabled={loggingIn}>
              {loggingIn
                ? (authMode === "login" ? "Signing in..." : "Creating account...")
                : (authMode === "login" ? "Sign in" : "Create account")}
            </button>

            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setLoginError("");
                setAuthMode(authMode === "login" ? "register" : "login");
              }}
            >
              {authMode === "login"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">🐞 BugTrack</h2>
        <p className="side-label">WORKSPACE</p>
        <button
          type="button"
          className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
          onClick={() => { setActiveView("dashboard"); setFilter("All"); }}
        >
          <span>▦</span> Dashboard
        </button>
        <button
          type="button"
          className={`nav-item ${activeView === "all" ? "active" : ""}`}
          onClick={() => { setActiveView("all"); setFilter("All"); }}
        >
          <span>◉</span> All Issues
        </button>
        <button
          type="button"
          className={`nav-item ${activeView === "resolved" ? "active" : ""}`}
          onClick={() => { setActiveView("resolved"); setFilter("All"); }}
        >
          <span>✓</span> Resolved Issues
        </button>
        <button
          type="button"
          className={`nav-item ${activeView === "kanban" ? "active" : ""}`}
          onClick={() => { setActiveView("kanban"); setFilter("All"); }}
        >
          <span>▥</span> Kanban Board
        </button>
        <button
          type="button"
          className={`nav-item ${activeView === "analytics" ? "active" : ""}`}
          onClick={() => { setActiveView("analytics"); setFilter("All"); }}
        >
          <span>◔</span> Analytics
        </button>
        <div className="sidebar-bottom">
          <strong>{user.name}</strong>
          <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="welcome">Welcome back, {user.name}!</p>
            <h1>
              {activeView === "dashboard"
                ? "Bug Dashboard"
                : activeView === "all"
                  ? "All Issues"
                  : activeView === "resolved"
                    ? "Resolved Issues"
                      : activeView === "kanban"
                        ? "Kanban Board"
                        : "Bug Analytics"}
            </h1>
          </div>
          <div className="topbar-actions">
            <div className="notification-wrapper">
              <button
                type="button"
                className="notification-bell"
                aria-label="Notifications"
                onClick={() => setNotificationOpen((current) => !current)}
              >
                🔔
                {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
              </button>
              {notificationOpen && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllNotificationsRead}>Mark all as read</button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No deadline notifications.</p>
                    ) : notifications.map((notification) => (
                      <button
                        type="button"
                        className={`notification-item ${notification.isRead ? "" : "unread"}`}
                        key={notification._id}
                        onClick={() => markNotificationRead(notification)}
                      >
                        <span className={`reminder-dot ${notification.reminderType}`} />
                        <span>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                          <time>{new Date(notification.createdAt).toLocaleString()}</time>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="primary-btn" onClick={() => {
              setDuplicateError("");
              setShowForm(!showForm);
            }}>
              + Create New Bug
            </button>
          </div>
        </header>

        {activeView === "analytics" && (
          <section className="analytics-section">
            <div className="analytics-toolbar">
              <div>
                <span className="analytics-kicker">REAL-TIME PROJECT INSIGHTS</span>
                <h2>Bug Analytics Dashboard</h2>
              </div>
              <div className="analytics-filters">
                <select value={analyticsRange} onChange={(e) => setAnalyticsRange(e.target.value)}>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
                <select value={analyticsPriority} onChange={(e) => setAnalyticsPriority(e.target.value)}>
                  <option>All</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
                <select value={analyticsStatus} onChange={(e) => setAnalyticsStatus(e.target.value)}>
                  <option>All</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>In Review</option>
                  <option>Resolved</option>
                </select>
                <select value={analyticsSeverity} onChange={(e) => setAnalyticsSeverity(e.target.value)}>
                  <option>All</option>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            {analyticsLoading ? (
              <p className="message">Loading analytics...</p>
            ) : analyticsError ? (
              <div className="message error">{analyticsError}</div>
            ) : analytics ? (
              <>
                <div className="analytics-cards">
                  {[
                    ["Total Bugs", analytics.statistics.totalBugs],
                    ["Open Bugs", analytics.statistics.openBugs],
                    ["In Progress", analytics.statistics.inProgressBugs],
                    ["Resolved Bugs", analytics.statistics.resolvedBugs],
                    ["Critical Bugs", analytics.statistics.criticalBugs],
                    ["Resolution Rate", `${analytics.statistics.resolutionRate}%`]
                  ].map(([label, value]) => (
                    <article className="analytics-card" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>

                <div className="analytics-grid">
                  <article className="chart-card">
                    <div className="chart-heading"><h3>Status Distribution</h3><span>Doughnut</span></div>
                    <div className="chart-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={analytics.statusDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>
                            {analytics.statusDistribution.map((item, index) => (
                              <Cell key={item.name} fill={["#5755d9", "#f59e0b", "#8b5cf6", "#22c55e"][index]} />
                            ))}
                          </Pie>
                          <Tooltip /><Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="chart-card">
                    <div className="chart-heading"><h3>Bugs by Priority</h3><span>Bar chart</span></div>
                    <div className="chart-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics.priorityDistribution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                          <Bar dataKey="count" name="Bugs" fill="#5755d9" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="chart-card chart-wide">
                    <div className="chart-heading"><h3>Creation Trend</h3><span>Last selected range</span></div>
                    <div className="chart-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={analytics.creationTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" minTickGap={28} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                          <Line type="monotone" dataKey="count" name="Created bugs" stroke="#5755d9" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="chart-card chart-wide">
                    <div className="chart-heading"><h3>Resolution Trend</h3><span>Actual resolved dates</span></div>
                    <div className="chart-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={analytics.resolutionTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" minTickGap={28} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                          <Line type="monotone" dataKey="count" name="Resolved bugs" stroke="#22a06b" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="chart-card">
                    <div className="chart-heading"><h3>Bug Severity Overview</h3><span>Priority-derived</span></div>
                    <div className="chart-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics.severityDistribution} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={58} /><Tooltip />
                          <Bar dataKey="count" name="Bugs" fill="#ef4444" radius={[0, 5, 5, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="chart-card advanced-card">
                    <div className="chart-heading"><h3>Team & Performance</h3><span>Advanced analytics</span></div>
                    <div className="advanced-stats">
                      <div><span>Average resolution</span><strong>{analytics.statistics.averageResolutionHours} hours</strong></div>
                      <div><span>Pending bugs</span><strong>{analytics.statistics.pendingBugs}</strong></div>
                      <div><span>Overdue bugs</span><strong>{analytics.statistics.overdueBugs}</strong></div>
                      <div><span>Most common priority</span><strong>{analytics.statistics.mostCommonPriority}</strong></div>
                    </div>
                    <div className="assigned-list">
                      {analytics.assignedDistribution.length === 0 ? (
                        <p>No assignments found.</p>
                      ) : analytics.assignedDistribution.map((item) => (
                        <div key={item.name}><span>{item.name}</span><strong>{item.count}</strong></div>
                      ))}
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <p className="message">No analytics data available.</p>
            )}
          </section>
        )}

        {activeView === "dashboard" && (
          <>
          <section className="stats">
            <div className="stat-card">
              <p>Total Bugs</p>
              <h2>{bugs.length}</h2>
            </div>
            <div className="stat-card">
              <p>Open Bugs</p>
              <h2>{openCount}</h2>
            </div>
            <div className="stat-card">
              <p>In Progress</p>
              <h2>{progressCount}</h2>
            </div>
            <div className="stat-card">
              <p>Resolved</p>
              <h2>{resolvedCount}</h2>
            </div>
          </section>
          <section className="severity-stats" aria-label="Severity statistics">
            {["Critical", "High", "Medium", "Low"].map((severity) => (
              <div className="severity-stat" key={severity}>
                <span className={`severity-badge ${severity.toLowerCase()}`}>{severity}</span>
                <strong>{severityCounts[severity]}</strong>
              </div>
            ))}
          </section>
          </>
        )}

        {showForm && (
          <section className="form-card">
            <h2>Create New Bug</h2>
            <form onSubmit={handleSubmit}>
              {(duplicateError || liveDuplicateBug) && (
                <div className="duplicate-warning">
                  {duplicateError ||
                    `Bug Title "${liveDuplicateBug.title}" already exists. Please use a different bug title.`}
                </div>
              )}

              <label>Bug Title</label>
              <input
                type="text"
                placeholder="Enter bug title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onBlur={() => {
                  if (liveDuplicateBug) {
                    const message = `Bug Title "${liveDuplicateBug.title}" already exists. Please use a different bug title.`;
                    setDuplicateError(message);
                    window.alert(message);
                  }
                }}
                required
              />

              <label>Description</label>
              <textarea
                placeholder="Describe the bug..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />

              <label>Screenshot</label>
              <div className="screenshot-area">
                <button type="button" className="capture-btn" onClick={captureScreen}>
                  Capture Screen
                </button>
                <label className="upload-btn" htmlFor="bug-screenshot">
                  Upload Image
                </label>
                <input
                  id="bug-screenshot"
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => readScreenshot(e.target.files?.[0])}
                />
              </div>

              {formData.screenshot?.data && (
                <div className="screenshot-preview">
                  <img src={formData.screenshot.data} alt="Bug screenshot preview" />
                  <button
                    type="button"
                    className="remove-screenshot"
                    onClick={() => setFormData({ ...formData, screenshot: null })}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="form-row">
                <div>
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>

                <div>
                  <label>Assigned To</label>
                  <input
                    type="text"
                    placeholder="Employee name"
                    value={formData.assigned}
                    onChange={(e) => setFormData({ ...formData, assigned: e.target.value })}
                  />
                </div>
              </div>

              <label>Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                title="Critical: major failure; High: important function broken; Medium: workaround exists; Low: cosmetic issue"
              >
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <label>Due Date</label>
              <input
                type="date"
                min={getTodayInput()}
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => {
                  setDuplicateError("");
                  setShowForm(false);
                }}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving || Boolean(liveDuplicateBug)}>
                  {saving ? "Saving..." : "Create Bug"}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeView === "kanban" ? (
          <section className="kanban-section">
            <div className="kanban-toolbar">
              <div className="kanban-search">
                <input
                  type="text"
                  placeholder="Search bugs by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <select value={developerFilter} onChange={(e) => setDeveloperFilter(e.target.value)}>
                <option value="All">All Developers</option>
                {developers.map((developer) => (
                  <option key={developer} value={developer}>{developer}</option>
                ))}
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {boardNotice && <div className="board-notice">{boardNotice}</div>}

            {loading ? (
              <p className="message">Loading Kanban board...</p>
            ) : error ? (
              <div className="message error">
                {error}
                <button className="retry-btn" onClick={fetchBugs}>Retry</button>
              </div>
            ) : (
              <div className="kanban-board">
                {["Open", "In Progress", "In Review", "Resolved"].map((status) => {
                  const columnBugs = boardBugs.filter((bug) => bug.status === status);
                  return (
                    <div
                      className="kanban-column"
                      key={status}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(event, status)}
                    >
                      <div className="kanban-column-header">
                        <div>
                          <span className={`column-dot ${status.toLowerCase().replaceAll(" ", "-")}`} />
                          <h3>{status}</h3>
                        </div>
                        <span className="column-count">{columnBugs.length}</span>
                      </div>

                      <div className="kanban-cards">
                        {columnBugs.map((bug) => (
                          <article
                            className={`kanban-card ${draggingId === bug._id ? "dragging" : ""}`}
                            key={bug._id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", bug._id);
                              event.dataTransfer.effectAllowed = "move";
                              setDraggingId(bug._id);
                            }}
                            onDragEnd={() => setDraggingId("")}
                          >
                            <div className="kanban-card-top">
                              <span className={`priority ${String(bug.priority || "Medium").toLowerCase()}`}>
                                {bug.priority || "Medium"}
                              </span>
                              <span className={`severity-badge ${(bug.severity || "Medium").toLowerCase()}`}>
                                {bug.severity || "Medium"}
                              </span>
                              <span className="bug-id">#{String(bug._id).slice(-6).toUpperCase()}</span>
                            </div>
                            <h4>{bug.title}</h4>
                            <p>{bug.description}</p>
                            <div className="kanban-card-footer">
                              <span className="developer">{bug.assigned || "Unassigned"}</span>
                              <span>{bug.createdAt ? new Date(bug.createdAt).toLocaleDateString() : "-"}</span>
                            </div>
                            <div className={`deadline-label ${getDeadlineInfo(bug).className}`}>
                              {bug.dueDate
                                ? `Due ${new Date(bug.dueDate).toLocaleDateString()} · ${getDeadlineInfo(bug).label}`
                                : getDeadlineInfo(bug).label}
                            </div>
                            <button
                              type="button"
                              className="comment-btn"
                              onClick={() => openComments(bug)}
                            >
                              Comments
                            </button>
                          </article>
                        ))}
                        {columnBugs.length === 0 && (
                          <div className="kanban-empty">No bugs in {status}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="issues-section">
          <div className="section-heading">
            <div>
              <h2>
                {activeView === "dashboard"
                  ? "Recent Issues"
                  : activeView === "all"
                    ? "All Issues"
                    : "Resolved Issues"}
              </h2>
              <p>
                {activeView === "resolved"
                  ? "Review and reopen bugs that need more work"
                  : "Manage and track your reported bugs"}
              </p>
            </div>
          </div>

          <div className="toolbar">
            <input
              className="search-input"
              type="text"
              placeholder="Search bugs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All</option>
              {activeView !== "resolved" && <option>Open</option>}
              {activeView !== "resolved" && <option>In Progress</option>}
              {activeView !== "resolved" && <option>In Review</option>}
              {(activeView === "dashboard" || activeView === "resolved") && (
                <option>Resolved</option>
              )}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option>All</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>

          {loading ? (
            <p className="message">Loading bugs...</p>
          ) : error ? (
            <div className="message error">
              {error}
              <button className="retry-btn" onClick={fetchBugs}>Retry</button>
            </div>
          ) : filteredBugs.length === 0 ? (
            <p className="message">
              {activeView === "resolved"
                ? "No resolved bugs yet."
                : activeView === "all"
                  ? "No open issues found."
                  : "No bugs found. Create your first bug!"}
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>BUG TITLE</th>
                    <th>PRIORITY</th>
                    <th>SEVERITY</th>
                    <th>STATUS</th>
                    <th>ASSIGNED TO</th>
                    <th>DATE</th>
                    <th>DUE DATE</th>
                    <th>SCREENSHOT</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBugs.map((bug) => (
                    <tr key={bug._id}>
                      <td>
                        <strong>{bug.title}</strong>
                        <small>{bug.description}</small>
                      </td>
                      <td>
                        <span className={`priority ${bug.priority.toLowerCase()}`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          className={`severity-select severity-${(bug.severity || "Medium").toLowerCase()}`}
                          value={bug.severity || "Medium"}
                          onChange={(e) => updateSeverity(bug._id, e.target.value)}
                          aria-label={`Severity for ${bug.title}`}
                        >
                          <option>Critical</option>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={bug.status}
                          onChange={(e) => updateStatus(bug._id, e.target.value)}
                        >
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>In Review</option>
                          <option>Resolved</option>
                        </select>
                      </td>
                      <td>{bug.assigned || "Unassigned"}</td>
                      <td>{bug.createdAt ? new Date(bug.createdAt).toLocaleDateString() : "-"}</td>
                      <td>
                        <input
                          className="due-date-input"
                          type="date"
                          min={bug.status === "Resolved" ? undefined : getTodayInput()}
                          value={bug.dueDate ? new Date(bug.dueDate).toISOString().slice(0, 10) : ""}
                          onChange={(e) => updateDueDate(bug._id, e.target.value)}
                          aria-label={`Due date for ${bug.title}`}
                        />
                        <span className={`deadline-label ${getDeadlineInfo(bug).className}`}>
                          {getDeadlineInfo(bug).label}
                        </span>
                      </td>
                      <td>
                        {bug.screenshot?.data ? (
                          <a
                            className="screenshot-link"
                            href={bug.screenshot.data}
                            target="_blank"
                            rel="noreferrer"
                            title="Open screenshot"
                          >
                            <img src={bug.screenshot.data} alt={bug.screenshot.name || "Bug screenshot"} />
                          </a>
                        ) : (
                          <span className="no-screenshot">-</span>
                        )}
                      </td>
                      <td>
                        <div className="issue-actions">
                          <button
                            className="delete-btn"
                            type="button"
                            onClick={() => deleteBug(bug._id)}
                          >
                            Delete
                          </button>
                          <button
                            className="comment-btn"
                            type="button"
                            onClick={() => openComments(bug)}
                          >
                            Comments
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </section>
        )}
        {activeCommentBug && (
          <div className="comments-overlay" role="dialog" aria-modal="true" aria-label="Bug comments">
            <section className="comments-panel">
              <div className="comments-header">
                <div>
                  <span className="comments-label">BUG DISCUSSION</span>
                  <h2>{activeCommentBug.title}</h2>
                  <p>#{String(activeCommentBug._id).slice(-6).toUpperCase()}</p>
                </div>
                <button type="button" className="comments-close" onClick={closeComments} aria-label="Close comments">×</button>
              </div>

              <div className="comments-list">
                {commentsLoading ? (
                  <p className="comments-empty">Loading comments...</p>
                ) : commentsError ? (
                  <p className="comments-error">{commentsError}</p>
                ) : comments.length === 0 ? (
                  <p className="comments-empty">No comments yet. Start the discussion.</p>
                ) : (
                  comments.map((comment) => {
                    const canManage =
                      String(comment.author) === String(user.id) || user.role === "Admin";
                    const initials = String(comment.authorName || "?")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <article className="comment-item" key={comment._id}>
                        <div className="comment-avatar">{initials}</div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <div>
                              <strong>{comment.authorName}</strong>
                              <span>{comment.authorRole}</span>
                            </div>
                            <time dateTime={comment.createdAt}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </time>
                          </div>
                          <p>{comment.text}</p>
                          {canManage && (
                            <div className="comment-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment._id);
                                  setCommentText(comment.text);
                                }}
                              >
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteComment(comment._id)}>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <form className="comment-compose" onSubmit={saveComment}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={2000}
                  placeholder={editingCommentId ? "Edit your comment..." : "Write a comment..."}
                  rows={3}
                />
                <div className="comment-compose-footer">
                  {editingCommentId && (
                    <button
                      type="button"
                      className="comment-cancel"
                      onClick={() => {
                        setEditingCommentId("");
                        setCommentText("");
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                  <button type="submit" className="primary-btn" disabled={!commentText.trim()}>
                    {editingCommentId ? "Save changes" : "Post Comment"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
