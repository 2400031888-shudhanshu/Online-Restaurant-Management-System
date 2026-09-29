const ordersContainer =
    document.getElementById("admin-orders");

const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (currentUser?.role !== "ADMIN") {
    document.querySelectorAll(".admin-only").forEach(link => {
        link.hidden = true;
    });
}


// =====================================
// LOAD ALL ORDERS
// =====================================

async function loadAllOrders() {

    try {

        const token =
    localStorage.getItem("token");

const response = await fetch(
    "/api/orders/admin/all",
    {
        headers: {
            "Authorization":
                `Bearer ${token}`
        }
    }
);


        if (!response.ok) {

            throw new Error(
                "Unable to fetch orders"
            );

        }


        const orders =
            await response.json();


        displayOrders(orders);


    } catch (error) {

        console.error(error);

        ordersContainer.innerHTML = `
            <p>
                ❌ Unable to load orders.
            </p>
        `;

    }

}


// =====================================
// DISPLAY ORDERS
// =====================================

function displayOrders(orders) {

    if (orders.length === 0) {

        ordersContainer.innerHTML = `
            <div class="empty-orders">

                <h3>
                    📦 No orders found
                </h3>

            </div>
        `;

        return;
    }


    let html = "";


    orders.forEach(order => {

        const orderDate =
            new Date(order.order_date)
                .toLocaleString();


        html += `

            <div class="admin-order-card" id="order-${order.order_id}">

                <div class="admin-order-header">

                    <h3>
                        Order #${order.order_id}
                    </h3>

                    <strong>
                        ₹${Number(
                            order.total_amount
                        ).toFixed(2)}
                    </strong>

                </div>


                <p>
                    <strong>Customer ID:</strong>
                    ${order.user_id}
                </p>


                <p>
                    <strong>Delivery Address:</strong>
                    ${order.delivery_address}
                </p>


                <p>
                    <strong>Order Date:</strong>
                    ${orderDate}
                </p>


                <p>
                    <strong>Status:</strong>
                    <span class="order-status">
                        ${order.order_status || "PENDING"}
                    </span>
                </p>


                <select
                    onchange="updateOrderStatus(
                        ${order.order_id},
                        this.value
                    )"
                >

                    <option value="PENDING"
                        ${order.order_status === "PENDING"
                            ? "selected"
                            : ""}>
                        PENDING
                    </option>

                    <option value="CONFIRMED"
                        ${order.order_status === "CONFIRMED"
                            ? "selected"
                            : ""}>
                        CONFIRMED
                    </option>

                    <option value="PREPARING"
                        ${order.order_status === "PREPARING"
                            ? "selected"
                            : ""}>
                        PREPARING
                    </option>

                    <option value="READY"
                        ${order.order_status === "READY"
                            ? "selected"
                            : ""}>
                        READY
                    </option>

                    <option value="OUT_FOR_DELIVERY"
                        ${order.order_status === "OUT_FOR_DELIVERY"
                            ? "selected"
                            : ""}>
                        OUT_FOR_DELIVERY
                    </option>

                    <option value="DELIVERED"
                        ${order.order_status === "DELIVERED"
                            ? "selected"
                            : ""}>
                        DELIVERED
                    </option>

                    <option value="CANCELLED"
                        ${order.order_status === "CANCELLED"
                            ? "selected"
                            : ""}>
                        CANCELLED
                    </option>

                </select>

                <button class="print-order-button" type="button" onclick="printOrder(${order.order_id})">
                    Print order
                </button>

            </div>

        `;

    });


    ordersContainer.innerHTML = html;

}

function printOrder(orderId) {
    const orderCard = document.getElementById(`order-${orderId}`);
    if (!orderCard) {
        return;
    }

    document.querySelectorAll(".print-target").forEach(card => {
        card.classList.remove("print-target");
    });
    orderCard.classList.add("print-target");

    const clearPrintTarget = () => orderCard.classList.remove("print-target");
    window.addEventListener("afterprint", clearPrintTarget, { once: true });
    window.print();
    setTimeout(clearPrintTarget, 2000);
}


// =====================================
// UPDATE ORDER STATUS
// =====================================

async function updateOrderStatus(
    orderId,
    newStatus
) {

    try {

        const token =
    localStorage.getItem("token");

const response = await fetch(
    `/api/orders/${orderId}/status`,
    {
        method: "PUT",

        headers: {
            "Content-Type":
                "application/json",

            "Authorization":
                `Bearer ${token}`
        },

                body: JSON.stringify({
                    order_status: newStatus
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                "❌ " + data.message
            );

            return;
        }


        alert(
            "✅ Order status updated"
        );


        loadAllOrders();


    } catch (error) {

        console.error(error);

        alert(
            "❌ Unable to update order status."
        );

    }

}


// Load orders
loadAllOrders();