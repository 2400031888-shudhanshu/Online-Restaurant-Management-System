# Online Restaurant Management System

A full-stack restaurant ordering and operations app. Customers can browse the live menu, manage a cart, place and track orders. Administrators manage orders, menu items, and staff accounts; staff can process orders without access to menu or account management.

## Features

- Public restaurant homepage with About and contact information.
- Customer registration and sign-in.
- MySQL-backed menu, cart, checkout, and order history.
- Admin order review and status updates, including printing individual order receipts.
- Admin menu management: add, edit, enable, disable, and remove items.
- Admin staff management: create staff accounts and deactivate access while preserving order history.
- Admin-only account directory with role, access status, registration date, and last sign-in activity; passwords are never exposed.
- Admins can activate or deactivate registered accounts without deleting their history. Self-deactivation and removal of the last active admin are blocked.
- Optional email notification to the restaurant when an order is placed.

## Requirements

- Node.js 20 or newer.
- MySQL 8 or newer.
- Gmail or another SMTP service for order email notifications (optional).

## Database Setup

1. Open `database/restaurant.sql` in MySQL Workbench and execute it. The script creates `restaurant_db`, the required tables and relationships, and starter categories/menu items. It also migrates existing `users` tables to support staff accounts.
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

Edit `backend/.env` and set your MySQL host, username, password, and database name. Set `JWT_SECRET` to a long, random value. Keep `.env` private and never publish its contents.

Install dependencies and start the server:

```powershell
npm install
npm start
```

Open [http://localhost:5000](http://localhost:5000).

## Order Email Notifications

To receive an email at `shudhanshukumar973@gmail.com` for each successfully placed order, configure these values in `backend/.env`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=your-gmail-app-password
MAIL_FROM=your-sender@gmail.com
ORDER_ALERT_EMAIL=shudhanshukumar973@gmail.com
```

For Gmail, create an App Password and use it as `SMTP_PASSWORD`; do not use your normal account password. Email delivery is optional and does not cancel an order if SMTP is unavailable. Without SMTP configuration, the order is still saved and the backend logs that the email alert was skipped.

## Using the App

- Customers create an account, sign in, browse the menu, add items to the cart, check out, and view or print their orders.
- Sign in through **Admin Portal** with an active `ADMIN` account to manage orders and menu items.
- On the admin dashboard, use **Manage Staff** to create staff logins or remove staff access. Staff sign in through **Admin Portal** and can process orders, but cannot manage staff or edit menu items.
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
