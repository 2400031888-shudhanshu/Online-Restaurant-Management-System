const express = require("express");

const router = express.Router();
const db = require("../config/database");
const QRCode = require("qrcode");

const {
    verifyToken,
    requireAdmin,
    requireStaff
} = require("../middleware/authMiddleware");
const { sendOrderAlert } = require("../config/orderNotification");

function attachOrderItems(orders, callback) {
    if (orders.length === 0) {
        return callback(null, orders);
    }

    const orderIds = orders.map(order => order.order_id);
    const sql = `
        SELECT
            oi.order_id,
            oi.food_id,
            COALESCE(f.food_name, 'Unavailable item') AS food_name,
            oi.quantity,
            oi.price
        FROM order_items oi
        LEFT JOIN food_items f ON f.food_id = oi.food_id
        WHERE oi.order_id IN (?)
        ORDER BY oi.order_id, oi.order_item_id
    `;

    db.query(sql, [orderIds], (error, items) => {
        if (error) {
            return callback(error);
        }

        const itemsByOrder = new Map(orderIds.map(orderId => [orderId, []]));
        items.forEach(item => {
            item.subtotal = Number(item.price) * Number(item.quantity);
            itemsByOrder.get(item.order_id).push(item);
        });

        orders.forEach(order => {
            order.items = itemsByOrder.get(order.order_id);
        });

        return callback(null, orders);
    });
}

// =====================================
// PLACE ORDER
// =====================================

router.post("/place", verifyToken, (req, res) => {

    const user_id = req.user.userId;
    const delivery_address = String(req.body.delivery_address || "").trim();
    const payment_method = String(req.body.payment_method || "").trim().toUpperCase();
    const transaction_id = String(req.body.transaction_id || "").trim();

    if (!delivery_address) {
        return res.status(400).json({
            message: "Delivery address is required"
        });
    }

    if (!["COD", "UPI"].includes(payment_method)) {
        return res.status(400).json({ message: "Choose COD or UPI payment." });
    }

    if (transaction_id.length > 100) {
        return res.status(400).json({ message: "UPI reference must be 100 characters or fewer." });
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


                    db.query(
                        `INSERT INTO payments (order_id, payment_method, payment_status, transaction_id)
                         VALUES (?, ?, 'PENDING', ?)`,
                        [orderId, payment_method, transaction_id || null],
                        paymentError => {
                            if (paymentError) {
                                console.error(paymentError);
                                db.query("DELETE FROM orders WHERE order_id = ?", [orderId], () => {});
                                return res.status(500).json({ message: "Unable to save payment details" });
                            }

                            const orderItems = items.map(item => [
                                orderId,
                                item.food_id,
                                item.quantity,
                                item.price
                            ]);

                            db.query(
                                `INSERT INTO order_items (order_id, food_id, quantity, price) VALUES ?`,
                                [orderItems],
                                itemsError => {
                                    if (itemsError) {
                                        console.error(itemsError);
                                        db.query("DELETE FROM orders WHERE order_id = ?", [orderId], () => {});
                                        return res.status(500).json({ message: "Unable to save order items" });
                                    }

                                    db.query(
                                        "DELETE FROM cart_items WHERE cart_id = ?",
                                        [cartId],
                                        clearError => {
                                            if (clearError) {
                                                console.error(clearError);
                                                return res.status(500).json({
                                                    message: "Order created but cart could not be cleared"
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

                                            return res.status(201).json({
                                                message: "Order placed successfully",
                                                order_id: orderId,
                                                total_amount: totalAmount,
                                                payment_method,
                                                payment_status: "PENDING"
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});


// =====================================
// GET USER ORDERS
// =====================================

router.get("/payment-options", (req, res) => {
    return res.json({ upi_vpa: process.env.UPI_VPA || "8809273370@upi" });
});

router.get("/upi-qr", async (req, res) => {
    const amount = Number(req.query.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
        return res.status(400).json({ message: "A valid payment amount is required." });
    }

    const paymentUri = new URL("upi://pay");
    paymentUri.searchParams.set("pa", process.env.UPI_VPA || "8809273370@upi");
    paymentUri.searchParams.set("pn", "Online Restaurant");
    paymentUri.searchParams.set("am", amount.toFixed(2));
    paymentUri.searchParams.set("cu", "INR");
    paymentUri.searchParams.set("tn", "Restaurant order payment");

    try {
        const image = await QRCode.toBuffer(paymentUri.toString(), {
            type: "png",
            errorCorrectionLevel: "M",
            margin: 2,
            width: 320
        });
        res.set("Cache-Control", "no-store");
        res.type("png").send(image);
    } catch (error) {
        console.error("Unable to create UPI QR code:", error);
        return res.status(500).json({ message: "Unable to create UPI payment QR." });
    }
});

router.get(
    "/user/:user_id",
    verifyToken,
    requireAdmin,
    (req, res) => {

    const userId = req.params.user_id;

    const sql = `
        SELECT
            o.order_id,
            o.total_amount,
            o.order_status,
            o.delivery_address,
            o.order_date,
            p.payment_method,
            p.payment_status,
            p.transaction_id
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.order_id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Unable to fetch orders"
            });
        }

        attachOrderItems(results, (itemsError, orders) => {
            if (itemsError) {
                console.error(itemsError);
                return res.status(500).json({ message: "Unable to fetch order items" });
            }

            return res.json(orders);
        });
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
                o.order_id,
                o.total_amount,
                o.order_status,
                o.delivery_address,
                o.order_date,
                p.payment_method,
                p.payment_status,
                p.transaction_id
            FROM orders o
            LEFT JOIN payments p ON p.order_id = o.order_id
            WHERE o.user_id = ?
            ORDER BY o.order_date DESC
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

                attachOrderItems(results, (itemsError, orders) => {
                    if (itemsError) {
                        console.error("My Order Items Error:", itemsError);
                        return res.status(500).json({ message: "Unable to fetch order items" });
                    }

                    return res.json(orders);
                });
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
            o.order_id,
            o.user_id,
            u.name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone,
            o.total_amount,
            o.order_status,
            o.delivery_address,
            o.order_date,
            p.payment_method,
            p.payment_status,
            p.transaction_id
        FROM orders o
        JOIN users u ON u.user_id = o.user_id
        LEFT JOIN payments p ON p.order_id = o.order_id
        ORDER BY o.order_date DESC
    `;


    db.query(sql, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                message: "Unable to fetch all orders"
            });

        }


        attachOrderItems(results, (itemsError, orders) => {
            if (itemsError) {
                console.error(itemsError);
                return res.status(500).json({ message: "Unable to fetch order items" });
            }

            return res.json(orders);
        });

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

router.put("/:order_id/payment/confirm", verifyToken, requireStaff, (req, res) => {
    const orderId = Number(req.params.order_id);
    if (!Number.isInteger(orderId) || orderId < 1) {
        return res.status(400).json({ message: "Invalid order ID." });
    }

    const isDelivery = req.user.role === "DELIVERY";
    const sql = isDelivery
        ? `UPDATE payments p
           JOIN orders o ON o.order_id = p.order_id
           SET p.payment_status = 'PAID', p.payment_date = CURRENT_TIMESTAMP
           WHERE p.order_id = ? AND p.payment_status = 'PENDING'
             AND p.payment_method = 'COD' AND o.order_status = 'DELIVERED'`
        : `UPDATE payments
           SET payment_status = 'PAID', payment_date = CURRENT_TIMESTAMP
           WHERE order_id = ? AND payment_status = 'PENDING'`;

    db.query(sql, [orderId], (error, result) => {
        if (error) {
            console.error("Unable to confirm payment:", error);
            return res.status(500).json({ message: "Unable to confirm payment." });
        }

        if (result.affectedRows === 0) {
            return res.status(409).json({
                message: isDelivery
                    ? "Delivery accounts can confirm cash only after the order is marked delivered."
                    : "No pending payment was found for this order."
            });
        }

        return res.json({ message: "Payment marked as paid." });
    });
});

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

    const isDelivery = req.user.role === "DELIVERY";
    if (isDelivery && !["OUT_FOR_DELIVERY", "DELIVERED"].includes(order_status)) {
        return res.status(403).json({ message: "Delivery accounts can only update delivery progress." });
    }


    const sql = isDelivery
        ? `UPDATE orders
           SET order_status = ?
           WHERE order_id = ?
             AND ((order_status = 'READY' AND ? = 'OUT_FOR_DELIVERY')
               OR (order_status = 'OUT_FOR_DELIVERY' AND ? = 'DELIVERED'))`
        : `UPDATE orders SET order_status = ? WHERE order_id = ?`;


    db.query(
        sql,
        isDelivery
            ? [order_status, orderId, order_status, order_status]
            : [order_status, orderId],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    message:
                        "Unable to update order status"

                });

            }


            if (result.affectedRows === 0) {

                return res.status(isDelivery ? 409 : 404).json({

                    message:
                        isDelivery
                            ? "Order must be READY before pickup or OUT_FOR_DELIVERY before delivery completion."
                            : "Order not found"

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