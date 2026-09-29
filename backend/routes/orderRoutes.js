const express = require("express");

const router = express.Router();
const db = require("../config/database");

const {
    verifyToken,
    requireAdmin,
    requireStaff
} = require("../middleware/authMiddleware");
const { sendOrderAlert } = require("../config/orderNotification");


// =====================================
// PLACE ORDER
// =====================================

router.post("/place", verifyToken, (req, res) => {

    const user_id = req.user.userId;
    const delivery_address = String(req.body.delivery_address || "").trim();

    if (!delivery_address) {
        return res.status(400).json({
            message: "Delivery address is required"
        });
    }


    // Get user's cart
    const cartSql = `
        SELECT cart_id
        FROM cart
        WHERE user_id = ?
    `;

    db.query(cartSql, [user_id], (err, cartResults) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (cartResults.length === 0) {

            return res.status(400).json({
                message: "Cart not found"
            });
        }

        const cartId = cartResults[0].cart_id;


        // Get cart items and current food prices
        const itemsSql = `
            SELECT
                ci.food_id,
                ci.quantity,
                f.food_name,
                f.price
            FROM cart_items ci
            JOIN food_items f
                ON ci.food_id = f.food_id
            WHERE ci.cart_id = ?
        `;

        db.query(itemsSql, [cartId], (err, items) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Unable to fetch cart items"
                });
            }

            if (items.length === 0) {

                return res.status(400).json({
                    message: "Your cart is empty"
                });
            }


            // Calculate total
            let totalAmount = 0;

            items.forEach(item => {

                totalAmount +=
                    Number(item.price) * Number(item.quantity);

            });


            // Create order
            const orderSql = `
                INSERT INTO orders
                (user_id, total_amount, delivery_address)
                VALUES (?, ?, ?)
            `;

            db.query(
                orderSql,
                [
                    user_id,
                    totalAmount,
                    delivery_address
                ],
                (err, orderResult) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            message: "Unable to create order"
                        });
                    }


                    const orderId = orderResult.insertId;


                    // Insert order items
                    let completed = 0;
                    let failed = false;

                    items.forEach(item => {

                        const itemSql = `
                            INSERT INTO order_items
                            (order_id, food_id, quantity, price)
                            VALUES (?, ?, ?, ?)
                        `;

                        db.query(
                            itemSql,
                            [
                                orderId,
                                item.food_id,
                                item.quantity,
                                item.price
                            ],
                            (err) => {

                                if (failed) {
                                    return;
                                }

                                if (err) {

                                    failed = true;

                                    console.error(err);

                                    return res.status(500).json({
                                        message:
                                            "Unable to save order items"
                                    });
                                }


                                completed++;

                                // All items inserted
                                if (completed === items.length) {

                                    // Clear cart
                                    const clearCartSql = `
                                        DELETE FROM cart_items
                                        WHERE cart_id = ?
                                    `;

                                    db.query(
                                        clearCartSql,
                                        [cartId],
                                        (err) => {

                                            if (err) {
                                                console.error(err);

                                                return res.status(500).json({
                                                    message:
                                                        "Order created but cart could not be cleared"
                                                });
                                            }

                                            sendOrderAlert({
                                                orderId,
                                                customerEmail: req.user.email,
                                                deliveryAddress: delivery_address,
                                                items,
                                                totalAmount
                                            }).catch(emailError => {
                                                console.error("Order email alert failed:", emailError.message);
                                            });

                                            res.status(201).json({

                                                message:
                                                    "Order placed successfully",

                                                order_id:
                                                    orderId,

                                                total_amount:
                                                    totalAmount
                                            });
                                        }
                                    );
                                }
                            }
                        );
                    });
                }
            );
        });
    });
});


// =====================================
// GET USER ORDERS
// =====================================

router.get(
    "/user/:user_id",
    verifyToken,
    requireAdmin,
    (req, res) => {

    const userId = req.params.user_id;

    const sql = `
        SELECT
            order_id,
            total_amount,
            order_status,
            delivery_address,
            order_date
        FROM orders
        WHERE user_id = ?
        ORDER BY order_date DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Unable to fetch orders"
            });
        }

        res.json(results);
    });
});

// =====================================
// GET LOGGED-IN USER ORDERS
// =====================================

router.get(
    "/my-orders",
    verifyToken,
    (req, res) => {

        const userId = req.user.userId;

        const sql = `
            SELECT
                order_id,
                total_amount,
                order_status,
                delivery_address,
                order_date
            FROM orders
            WHERE user_id = ?
            ORDER BY order_date DESC
        `;

        db.query(
            sql,
            [userId],
            (err, results) => {

                if (err) {

                    console.error(
                        "My Orders Error:",
                        err
                    );

                    return res.status(500).json({
                        message:
                            "Unable to fetch your orders"
                    });
                }

                res.json(results);
            }
        );
    }
);


// =====================================
// ADMIN - GET ALL ORDERS
// =====================================

router.get("/admin/all", verifyToken, requireStaff, (req, res) => {

    const sql = `
        SELECT
            order_id,
            user_id,
            total_amount,
            order_status,
            delivery_address,
            order_date
        FROM orders
        ORDER BY order_date DESC
    `;


    db.query(sql, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                message: "Unable to fetch all orders"
            });

        }


        res.json(results);

    });

});


// =====================================
// ADMIN - UPDATE ORDER STATUS
// =====================================

router.put(
    "/:order_id/status",
    verifyToken,
    requireStaff,
    (req, res) => {

    const orderId =
        req.params.order_id;

    const { order_status } =
        req.body;


    const allowedStatuses = [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED"
    ];


    if (!allowedStatuses.includes(order_status)) {

        return res.status(400).json({

            message:
                "Invalid order status"

        });

    }


    const sql = `
        UPDATE orders
        SET order_status = ?
        WHERE order_id = ?
    `;


    db.query(
        sql,
        [order_status, orderId],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    message:
                        "Unable to update order status"

                });

            }


            if (result.affectedRows === 0) {

                return res.status(404).json({

                    message:
                        "Order not found"

                });

            }


            res.json({

                message:
                    "Order status updated successfully"

            });

        }
    );

});

module.exports = router;