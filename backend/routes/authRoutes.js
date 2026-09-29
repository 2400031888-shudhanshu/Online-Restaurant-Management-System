const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();
const db = require("../config/database");

router.get("/me", verifyToken, (req, res) => {
    res.json({
        user_id: req.user.userId,
        role: req.user.role
    });
});

// =============================
// REGISTER
// =============================
router.post("/register", async (req, res) => {

    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required"
        });
    }

    try {

        // Check whether email already exists
        const checkSql = `
            SELECT user_id
            FROM users
            WHERE email = ?
        `;

        db.query(checkSql, [email], async (err, results) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length > 0) {
                return res.status(400).json({
                    message: "Email already registered"
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert customer
            const insertSql = `
                INSERT INTO users
                (name, email, password, phone, role)
                VALUES (?, ?, ?, ?, 'CUSTOMER')
            `;

            db.query(
                insertSql,
                [name, email, hashedPassword, phone || null],
                (err, result) => {

                    if (err) {
                        console.error("Registration error:", err);

                        return res.status(500).json({
                            message: "Registration failed"
                        });
                    }

                    res.status(201).json({
                        message: "Registration successful",
                        user_id: result.insertId
                    });
                }
            );
        });

    } catch (error) {

        console.error("Server error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// =============================
// LOGIN
// =============================
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
          AND is_active = 1
    `;

    db.query(sql, [email], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];
        bcrypt.compare(password, user.password).then(passwordMatches => {
            if (!passwordMatches) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            db.query(
                "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                [user.user_id],
                updateError => {
                    if (updateError) {
                        console.error("Unable to record login time:", updateError);
                    }

                    const token = jwt.sign(
                        {
                            userId: user.user_id,
                            email: user.email,
                            role: user.role
                        },
                        process.env.JWT_SECRET || "restaurant_secret",
                        { expiresIn: "1d" }
                    );

                    return res.json({
                        message: "Login successful",
                        token,
                        user: {
                            user_id: user.user_id,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            role: user.role
                        }
                    });
                }
            );
        }).catch(compareError => {
            console.error("Password verification failed:", compareError);
            return res.status(500).json({ message: "Unable to verify login." });
        });
    });
});


module.exports = router;