# Online Restaurant Management System

A full-stack restaurant ordering and operations app. Customers can browse the live menu, manage a cart, place and track orders. Administrators manage orders, menu items, and staff accounts; staff can process orders without access to menu or account management.

## Features

- Public restaurant homepage with a live menu preview, contact information, and saved customer feedback.
- Customer registration and sign-in.
- MySQL-backed menu, cart, checkout, and order history.
- Admin order review and status updates, including printing individual order receipts.
- Admin menu management: add, edit, enable, disable, and remove items.
- Admin staff management: create staff accounts and deactivate access while preserving order history.
- Delivery accounts can view order and customer details, update delivery progress, and confirm collected cash after delivery.
- Checkout supports cash on delivery and UPI with a scannable payment QR; UPI payment confirmation is manual.
- Admin-only account directory with role, access status, registration date, and last sign-in activity; passwords are never exposed.
- Admins can activate or deactivate registered accounts without deleting their history. Self-deactivation and removal of the last active admin are blocked.
- Optional email notification to the restaurant when an order is placed.

## Requirements

- Node.js 20 or newer.
- MySQL 8 or newer.
- Gmail or another SMTP service for order email notifications (optional).

## Database Setup

1. Open `database/restaurant.sql` in MySQL Workbench and execute it. The script creates `restaurant_db`, the required tables and relationships, and starter categories/menu items. It also migrates existing `users` tables to support staff and delivery roles and creates the customer feedback table. Re-run this script on an existing installation to apply these schema updates; starter menu rows are not duplicated.
2. Register an account from the website.
3. Promote the first administrator account in MySQL Workbench. Replace the example email with the registered account's email:

```sql
UPDATE users
SET role = 'ADMIN', is_active = 1
WHERE email = 'your-email@example.com';
```

The SQL script does not create a default admin or store plaintext passwords.

## Configure and Run

From PowerShell, open the backend folder and copy the environment template:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set your MySQL host, username, password, and database name. Set `JWT_SECRET` to a long, random value and `UPI_VPA=8809273370@upi` for UPI checkout. Keep `.env` private and never publish its contents.

Install dependencies and start the server:

```powershell
npm install
npm start
```

Open [http://localhost:5000](http://localhost:5000).

## Order and Feedback Email Notifications

To receive order alerts and customer feedback at `shudhanshukumar973@gmail.com`, configure these values in `backend/.env`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=your-gmail-app-password
MAIL_FROM=your-sender@gmail.com
ORDER_ALERT_EMAIL=shudhanshukumar973@gmail.com
FEEDBACK_EMAIL=shudhanshukumar973@gmail.com
```

For Gmail, create an App Password and use it as `SMTP_PASSWORD`; do not use your normal account password. Feedback is stored in the database even if email delivery is unavailable, and the website reports when it could not be emailed.

## Using the App

- Customers create an account, sign in, browse the menu, add items to the cart, check out, and view or print their orders.
- Sign in through **Admin Portal** with an active `ADMIN` account to manage orders and menu items.
- On the admin dashboard, use **Manage Staff** to create staff or delivery logins and remove access. Staff sign in through **Admin Portal** and can process orders; delivery users can only move ready orders through delivery and confirm COD after delivery.
- UPI payments stay pending until a staff member verifies the transaction reference and confirms payment. This project does not connect to a payment gateway.
- Use **Registered Accounts** to search and filter customers, staff, and admins, and activate or deactivate access. Last sign-in tracking starts with this update, so existing accounts show **Never** until they sign in again.
- The public contact email is `shudhanshukumar973@gmail.com`.

## Project Layout

```text
backend/    Express API, authentication, MySQL access, and email notifications
database/   MySQL schema, migration, and starter menu data
frontend/   HTML pages, shared CSS, and browser-side JavaScript
```

## Troubleshooting

- **Database connection fails:** confirm MySQL is running and the `DB_*` values in `backend/.env` match your local setup.
- **Port 5000 is busy:** set `PORT` to another available port in `backend/.env` and restart the server.
- **Admin or staff access is denied:** confirm the account role and `is_active = 1` in the `users` table, then sign in again.
- **Order email is skipped or not delivered:** check SMTP settings and use a valid provider App Password; order placement remains available without email.
- **Feedback email is not delivered:** check `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `FEEDBACK_EMAIL` in `backend/.env`, then restart the backend. Feedback remains stored in the database.
