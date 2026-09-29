const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const db = require("../config/database");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

router.post("/", verifyToken, requireAdmin, async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email, and password are required"
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            message: "Enter a valid email address"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `
            INSERT INTO users (name, email, password, phone, role)
            VALUES (?, ?, ?, ?, 'ADMIN')
        `;

        db.query(sql, [name, email, hashedPassword, phone || null], (error, result) => {
            if (error) {
                if (error.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "An account with this email already exists"
                    });
                }

                console.error("Admin registration error:", error);
                return res.status(500).json({
                    message: "Unable to create admin account"
                });
            }

            return res.status(201).json({
                message: "Admin account created successfully",
                user_id: result.insertId
            });
        });
    } catch (error) {
        console.error("Admin registration error:", error);
        return res.status(500).json({
            message: "Unable to create admin account"
        });
    }
});

module.exports = router;