require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

// MySQL connection
require("./config/database");

// Food API
const foodRoutes = require("./routes/foodRoutes");
app.use("/api/foods", foodRoutes);

// Authentication API
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Cart API
const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

// Order API
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// Admin user registration API
const adminUserRoutes = require("./routes/adminUserRoutes");
app.use("/api/admin/users", adminUserRoutes);

const staffRoutes = require("./routes/staffRoutes");
app.use("/api/admin/staff", staffRoutes);

// Admin Food API
const foodAdminRoutes =
    require("./routes/foodAdminRoutes");

app.use(
    "/api/admin/foods",
    foodAdminRoutes
);

// Category API
const categoryRoutes =
    require("./routes/categoryRoutes");

app.use(
    "/api/categories",
    categoryRoutes
);

const feedbackRoutes = require("./routes/feedbackRoutes");
app.use("/api/feedback", feedbackRoutes);

// Exact frontend folder
const frontendPath = path.resolve(__dirname, "../frontend");

console.log("Frontend folder:", frontendPath);

// Serve CSS, JS, images, etc.
app.use(express.static(frontendPath));

// Explicit frontend pages
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/menu.html", (req, res) => {
    res.sendFile(path.join(frontendPath, "menu.html"));
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(frontendPath, "login.html"));
});

app.get("/register.html", (req, res) => {
    res.sendFile(path.join(frontendPath, "register.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});