const express = require("express");

const router = express.Router();

const db = require("../config/database");

const {
    verifyToken,
    requireAdmin
} = require("../middleware/authMiddleware");


// =====================================
// GET ALL FOOD ITEMS
// =====================================

router.get(
    "/",
    verifyToken,
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT
                f.food_id,
                f.category_id,
                c.category_name,
                f.food_name,
                f.description,
                f.price,
                f.image_url,
                f.availability,
                f.created_at
            FROM food_items f
            LEFT JOIN categories c
                ON f.category_id = c.category_id
            ORDER BY f.food_id DESC
        `;


        db.query(sql, (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "Unable to fetch food items"
                });

            }


            res.json(results);

        });

    }
);


// =====================================
// ADD FOOD ITEM
// =====================================

router.post(
    "/",
    verifyToken,
    requireAdmin,
    (req, res) => {

        const {
            category_id,
            food_name,
            description,
            price,
            image_url,
            availability
        } = req.body;


        if (
            !category_id ||
            !food_name ||
            price === undefined
        ) {

            return res.status(400).json({
                message:
                    "Category, food name and price are required"
            });

        }


        const sql = `
            INSERT INTO food_items
            (
                category_id,
                food_name,
                description,
                price,
                image_url,
                availability
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;


        db.query(
            sql,
            [
                category_id,
                food_name,
                description || null,
                price,
                image_url || null,
                availability === undefined
                    ? 1
                    : availability
            ],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to add food item"
                    });

                }


                res.status(201).json({

                    message:
                        "Food item added successfully",

                    food_id:
                        result.insertId

                });

            }
        );

    }
);


// =====================================
// UPDATE FOOD ITEM
// =====================================

router.put(
    "/:food_id",
    verifyToken,
    requireAdmin,
    (req, res) => {

        const foodId =
            req.params.food_id;


        const {
            category_id,
            food_name,
            description,
            price,
            image_url,
            availability
        } = req.body;


        const sql = `
            UPDATE food_items

            SET
                category_id = ?,
                food_name = ?,
                description = ?,
                price = ?,
                image_url = ?,
                availability = ?

            WHERE food_id = ?
        `;


        db.query(
            sql,
            [
                category_id,
                food_name,
                description || null,
                price,
                image_url || null,
                availability,
                foodId
            ],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to update food item"
                    });

                }


                if (result.affectedRows === 0) {

                    return res.status(404).json({
                        message:
                            "Food item not found"
                    });

                }


                res.json({

                    message:
                        "Food item updated successfully"

                });

            }
        );

    }
);


// =====================================
// DELETE FOOD ITEM
// =====================================

router.delete(
    "/:food_id",
    verifyToken,
    requireAdmin,
    (req, res) => {

        const foodId =
            req.params.food_id;


        const sql = `
            DELETE FROM food_items
            WHERE food_id = ?
        `;


        db.query(
            sql,
            [foodId],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to delete food item"
                    });

                }


                if (result.affectedRows === 0) {

                    return res.status(404).json({
                        message:
                            "Food item not found"
                    });

                }


                res.json({

                    message:
                        "Food item deleted successfully"

                });

            }
        );

    }
);


// =====================================
// UPDATE AVAILABILITY
// =====================================

router.put(
    "/:food_id/availability",
    verifyToken,
    requireAdmin,
    (req, res) => {

        const foodId =
            req.params.food_id;

        const {
            availability
        } = req.body;


        const sql = `
            UPDATE food_items

            SET availability = ?

            WHERE food_id = ?
        `;


        db.query(
            sql,
            [
                availability ? 1 : 0,
                foodId
            ],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message:
                            "Unable to update availability"
                    });

                }


                res.json({

                    message:
                        "Availability updated successfully"

                });

            }
        );

    }
);


module.exports = router;