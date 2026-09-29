const nodemailer = require("nodemailer");

async function sendOrderAlert(order) {
    const host = process.env.SMTP_HOST;
    const username = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const recipient = process.env.ORDER_ALERT_EMAIL || "shudhanshukumar973@gmail.com";

    if (!host || !username || !password) {
        console.warn("Order email alert skipped: configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.");
        return false;
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true" || port === 465,
        auth: {
            user: username,
            pass: password
        }
    });

    const itemSummary = order.items
        .map(item => `- ${item.food_name} x ${item.quantity}: INR ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`)
        .join("\n");

    await transporter.sendMail({
        from: process.env.MAIL_FROM || username,
        to: recipient,
        replyTo: order.customerEmail,
        subject: `New restaurant order #${order.orderId}`,
        text: [
            `A new order was placed.`,
            `Order: #${order.orderId}`,
            `Customer: ${order.customerEmail || "Not provided"}`,
            `Total: INR ${Number(order.totalAmount).toFixed(2)}`,
            "",
            "Items:",
            itemSummary,
            "",
            `Delivery address: ${order.deliveryAddress}`
        ].join("\n")
    });

    return true;
}

module.exports = { sendOrderAlert };