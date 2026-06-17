const express = require("express");
const cors = require("cors");
const path = require("path");

const donorRoutes = require("./routes/donors");
const inventoryRoutes = require("./routes/inventory");
const donationRoutes = require("./routes/donations");
const hospitalRoutes = require("./routes/hospitals");
const requestRoutes = require("./routes/requests");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend (static files)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// API routes
app.use("/api/donors", donorRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Blood Bank Management System API is running",
  });
});

// Fallback to index.html for non-API routes (simple SPA-style serving)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(
    `Blood Bank Management System server running at http://localhost:${PORT}`,
  );
});
