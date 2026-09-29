const express = require("express");

const router = express.Router();

const db = require("../config/database");

const {
    verifyToken
} = require("../middleware/authMiddleware");


// =====================================
// GET USER CART
// =====================================

router.get(
    "/",
    verifyToken,
    (req, res) => {

        const userId = req.user.userId;

        const sql = `
            SELECT
                ci.cart_item_id,
                ci.cart_id,
                ci.food_id,
                ci.quantity,
                f.food_name,
                f.description,
                f.price,
                f.image_url,
                f.availability,

                (f.price * ci.quantity) AS subtotal

            FROM cart_items ci

            INNER JOIN cart c
                ON ci.cart_id = c.cart_id

            INNER JOIN food_items f
                ON ci.food_id = f.food_id

            WHERE c.user_id = ?

            ORDER BY ci.cart_item_id DESC
        `;


        db.query(
            sql,
            [userId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Cart error:",
                        err
                    );

                    return res.status(500).json({
                        message:
                            "Unable to load cart"
                    });

                }


                let total = 0;

                results.forEach(item => {

                    total +=
                        Number(item.subtotal);

                });


                res.json({

                    items: results,

                    total: total.toFixed(2)

                });

            }
        );

    }
);


// =====================================
// ADD FOOD TO CART
// =====================================

router.post(
    "/",
    verifyToken,
    (req, res) => {

        const userId =
           req.user.userId;

        const {
            food_id,
            quantity
        } = req.body;


        const qty =
            Number(quantity) || 1;


        if (!food_id) {

            return res.status(400).json({

                message:
                    "Food ID is required"

            });

        }


        // Find user's cart
        const findCartSql = `
            SELECT cart_id
            FROM cart
            WHERE user_id = ?
        `;


        db.query(
            findCartSql,
            [userId],
            (err, cartResults) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to find cart"
                    });

                }


                // =================================
                // CART DOES NOT EXIST
                // =================================

                if (cartResults.length === 0) {

                    const createCartSql = `
                        INSERT INTO cart
                        (user_id)
                        VALUES (?)
                    `;


                    db.query(
                        createCartSql,
                        [userId],
                        (err, cartResult) => {

                            if (err) {

                                console.error(err);

                                return res.status(500).json({
                                    message:
                                        "Unable to create cart"
                                });

                            }


                            addItemToCart(
                                cartResult.insertId,
                                food_id,
                                qty,
                                res
                            );

                        }
                    );


                    return;
                }


                // =================================
                // CART ALREADY EXISTS
                // =================================

                const cartId =
                    cartResults[0].cart_id;


                addItemToCart(
                    cartId,
                    food_id,
                    qty,
                    res
                );

            }
        );

    }
);


// =====================================
// ADD / INCREASE CART ITEM
// =====================================

function addItemToCart(
    cartId,
    foodId,
    quantity,
    res
) {

    const checkSql = `
        SELECT
            cart_item_id,
            quantity

        FROM cart_items

        WHERE cart_id = ?
        AND food_id = ?
    `;


    db.query(
        checkSql,
        [cartId, foodId],
        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "Unable to check cart item"
                });

            }


            // ===============================
            // ITEM ALREADY EXISTS
            // ===============================

            if (results.length > 0) {

                const newQuantity =
                    results[0].quantity +
                    quantity;


                const updateSql = `
                    UPDATE cart_items

                    SET quantity = ?

                    WHERE cart_item_id = ?
                `;


                db.query(
                    updateSql,
                    [
                        newQuantity,
                        results[0].cart_item_id
                    ],
                    (err) => {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({
                                message:
                                    "Unable to update cart"
                            });

                        }


                        res.json({

                            message:
                                "Cart quantity updated",

                            quantity:
                                newQuantity

                        });

                    }
                );


                return;
            }


            // ===============================
            // NEW ITEM
            // ===============================

            const insertSql = `
                INSERT INTO cart_items
                (
                    cart_id,
                    food_id,
                    quantity
                )

                VALUES (?, ?, ?)
            `;


            db.query(
                insertSql,
                [
                    cartId,
                    foodId,
                    quantity
                ],
                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            message:
                                "Unable to add item to cart"
                        });

                    }


                    res.status(201).json({

                        message:
                            "Food added to cart",

                        quantity:
                            quantity

                    });

                }
            );

        }
    );

}


// =====================================
// UPDATE CART ITEM QUANTITY
// =====================================

router.put(
    "/:food_id",
    verifyToken,
    (req, res) => {

        const userId =
            req.user.userId;

        const foodId =
            req.params.food_id;

        const quantity =
            Number(req.body.quantity);


        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {

            return res.status(400).json({

                message:
                    "Quantity must be at least 1"

            });

        }


        const sql = `
            UPDATE cart_items ci

            INNER JOIN cart c
                ON ci.cart_id = c.cart_id

            SET ci.quantity = ?

            WHERE c.user_id = ?
            AND ci.food_id = ?
        `;


        db.query(
            sql,
            [
                quantity,
                userId,
                foodId
            ],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to update cart"
                    });

                }


                if (
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({
                        message:
                            "Cart item not found"
                    });

                }


                res.json({

                    message:
                        "Cart updated successfully"

                });

            }
        );

    }
);


// =====================================
// REMOVE FOOD FROM CART
// =====================================

router.delete(
    "/:food_id",
    verifyToken,
    (req, res) => {

        const userId =
           req.user.userId;

        const foodId =
            req.params.food_id;


        const sql = `
            DELETE ci

            FROM cart_items ci

            INNER JOIN cart c
                ON ci.cart_id = c.cart_id

            WHERE c.user_id = ?
            AND ci.food_id = ?
        `;


        db.query(
            sql,
            [
                userId,
                foodId
            ],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to remove cart item"
                    });

                }


                if (
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({
                        message:
                            "Cart item not found"
                    });

                }


                res.json({

                    message:
                        "Item removed from cart"

                });

            }
        );

    }
);


module.exports = router;