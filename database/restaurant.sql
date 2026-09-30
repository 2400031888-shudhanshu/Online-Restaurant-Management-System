CREATE DATABASE IF NOT EXISTS restaurant_db
	CHARACTER SET utf8mb4
	COLLATE utf8mb4_unicode_ci;

USE restaurant_db;

CREATE TABLE IF NOT EXISTS users (
	user_id INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(100) NOT NULL,
	password VARCHAR(255) NOT NULL,
	phone VARCHAR(15) DEFAULT NULL,
	role ENUM('CUSTOMER', 'ADMIN', 'STAFF', 'DELIVERY') DEFAULT 'CUSTOMER',
	is_active TINYINT(1) NOT NULL DEFAULT 1,
	last_login_at TIMESTAMP NULL DEFAULT NULL,
	created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (user_id),
	UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

ALTER TABLE users
	MODIFY role ENUM('CUSTOMER', 'ADMIN', 'STAFF', 'DELIVERY') DEFAULT 'CUSTOMER';

SET @add_active_column = IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
	 WHERE TABLE_SCHEMA = DATABASE()
	   AND TABLE_NAME = 'users'
	   AND COLUMN_NAME = 'is_active') = 0,
	'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
	'SELECT 1'
);
PREPARE add_active_column_stmt FROM @add_active_column;
EXECUTE add_active_column_stmt;
DEALLOCATE PREPARE add_active_column_stmt;

SET @add_last_login_column = IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
	 WHERE TABLE_SCHEMA = DATABASE()
	   AND TABLE_NAME = 'users'
	   AND COLUMN_NAME = 'last_login_at') = 0,
	'ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL',
	'SELECT 1'
);
PREPARE add_last_login_column_stmt FROM @add_last_login_column;
EXECUTE add_last_login_column_stmt;
DEALLOCATE PREPARE add_last_login_column_stmt;

CREATE TABLE IF NOT EXISTS categories (
	category_id INT NOT NULL AUTO_INCREMENT,
	category_name VARCHAR(100) NOT NULL,
	description VARCHAR(255) DEFAULT NULL,
	created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (category_id),
	UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS food_items (
	food_id INT NOT NULL AUTO_INCREMENT,
	category_id INT NOT NULL,
	food_name VARCHAR(150) NOT NULL,
	description TEXT DEFAULT NULL,
	price DECIMAL(10,2) NOT NULL,
	image_url VARCHAR(500) DEFAULT NULL,
	availability TINYINT(1) DEFAULT 1,
	created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (food_id),
	KEY idx_food_items_category (category_id),
	CONSTRAINT fk_food_items_category
		FOREIGN KEY (category_id) REFERENCES categories (category_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart (
	cart_id INT NOT NULL AUTO_INCREMENT,
	user_id INT NOT NULL,
	created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (cart_id),
	UNIQUE KEY uq_cart_user (user_id),
	CONSTRAINT fk_cart_user
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
	cart_item_id INT NOT NULL AUTO_INCREMENT,
	cart_id INT NOT NULL,
	food_id INT NOT NULL,
	quantity INT NOT NULL DEFAULT 1,
	PRIMARY KEY (cart_item_id),
	KEY idx_cart_items_cart (cart_id),
	KEY idx_cart_items_food (food_id),
	CONSTRAINT fk_cart_items_cart
		FOREIGN KEY (cart_id) REFERENCES cart (cart_id)
		ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_cart_items_food
		FOREIGN KEY (food_id) REFERENCES food_items (food_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
	order_id INT NOT NULL AUTO_INCREMENT,
	user_id INT NOT NULL,
	total_amount DECIMAL(10,2) NOT NULL,
	order_status ENUM(
		'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
		'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
	) DEFAULT 'PENDING',
	delivery_address TEXT NOT NULL,
	order_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (order_id),
	KEY idx_orders_user (user_id),
	CONSTRAINT fk_orders_user
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
	order_item_id INT NOT NULL AUTO_INCREMENT,
	order_id INT NOT NULL,
	food_id INT NOT NULL,
	quantity INT NOT NULL,
	price DECIMAL(10,2) NOT NULL,
	PRIMARY KEY (order_item_id),
	KEY idx_order_items_order (order_id),
	KEY idx_order_items_food (food_id),
	CONSTRAINT fk_order_items_order
		FOREIGN KEY (order_id) REFERENCES orders (order_id)
		ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_order_items_food
		FOREIGN KEY (food_id) REFERENCES food_items (food_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
	payment_id INT NOT NULL AUTO_INCREMENT,
	order_id INT NOT NULL,
	payment_method ENUM('COD', 'UPI', 'CARD') NOT NULL,
	payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
	transaction_id VARCHAR(100) DEFAULT NULL,
	payment_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (payment_id),
	UNIQUE KEY uq_payments_order (order_id),
	CONSTRAINT fk_payments_order
		FOREIGN KEY (order_id) REFERENCES orders (order_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_feedback (
	feedback_id INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(100) NOT NULL,
	message TEXT NOT NULL,
	created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (feedback_id),
	KEY idx_customer_feedback_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
	review_id INT NOT NULL AUTO_INCREMENT,
	user_id INT NOT NULL,
	food_id INT NOT NULL,
	rating INT NOT NULL,
	comment TEXT DEFAULT NULL,
	created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (review_id),
	KEY idx_reviews_user (user_id),
	KEY idx_reviews_food (food_id),
	CONSTRAINT fk_reviews_user
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_reviews_food
		FOREIGN KEY (food_id) REFERENCES food_items (food_id)
		ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO categories (category_name, description)
VALUES
	('Starters', 'Delicious appetizers and starters'),
	('Main Course', 'Main meals and special dishes'),
	('Pizza', 'Freshly prepared pizzas'),
	('Burgers', 'Tasty burgers and sandwiches'),
	('Desserts', 'Sweet dishes and desserts'),
	('Beverages', 'Hot and cold beverages')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO food_items (category_id, food_name, description, price, image_url, availability)
SELECT c.category_id, seed.food_name, seed.description, seed.price, seed.image_url, 1
FROM (
	SELECT 'Starters' AS category_name, 'Paneer Tikka' AS food_name,
		'Grilled Indian cottage cheese with spices' AS description,
		180.00 AS price, 'images/paneer-tikka.jpg' AS image_url
	UNION ALL SELECT 'Starters', 'French Fries',
		'Crispy golden potato fries', 120.00, 'images/french-fries.jpg'
	UNION ALL SELECT 'Main Course', 'Veg Biryani',
		'Aromatic basmati rice cooked with vegetables and spices', 220.00, NULL
	UNION ALL SELECT 'Main Course', 'Paneer Butter Masala',
		'Creamy tomato-based paneer curry', 240.00, NULL
	UNION ALL SELECT 'Pizza', 'Margherita Pizza',
		'Classic pizza with tomato, mozzarella and basil', 299.00, NULL
	UNION ALL SELECT 'Pizza', 'Farmhouse Pizza',
		'Pizza loaded with fresh vegetables and cheese', 399.00, NULL
	UNION ALL SELECT 'Burgers', 'Veg Burger',
		'Crispy vegetable patty with fresh vegetables', 159.00, NULL
	UNION ALL SELECT 'Burgers', 'Cheese Burger',
		'Classic burger with cheese and crispy patty', 199.00, NULL
	UNION ALL SELECT 'Desserts', 'Chocolate Brownie',
		'Rich chocolate brownie', 149.00, NULL
	UNION ALL SELECT 'Desserts', 'Ice Cream',
		'Creamy vanilla ice cream', 99.00, NULL
	UNION ALL SELECT 'Beverages', 'Cold Coffee',
		'Chilled creamy cold coffee', 129.00, NULL
	UNION ALL SELECT 'Beverages', 'Fresh Lime Soda',
		'Refreshing lime soda', 89.00, NULL
) AS seed
INNER JOIN categories c ON c.category_name = seed.category_name
WHERE NOT EXISTS (
	SELECT 1
	FROM food_items existing
	WHERE existing.category_id = c.category_id
	  AND existing.food_name = seed.food_name
);

-- Register an account first, then grant administrator access by email:
-- UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
