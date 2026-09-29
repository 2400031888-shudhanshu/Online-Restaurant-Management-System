// =====================================
// CHECKOUT PAGE
// =====================================

const checkoutContainer = document.getElementById("checkout-container");

// =====================================
// GET LOGIN USER
// =====================================

const user = JSON.parse(localStorage.getItem("user") || "null");
const token = localStorage.getItem("token");

// =====================================
// CHECK LOGIN
// =====================================

if (!checkoutContainer) {
    console.warn("checkout-container not found on this page.");
} else if (!user || !token) {
    checkoutContainer.innerHTML = `
        <div class="empty-cart">
            <h3>🔐 Please Login First</h3>
            <p>Login to continue checkout.</p>
            <a href="login.html">Login</a>
        </div>
    `;
} else {
    loadCheckout();
}

// =====================================
// LOAD CART
// =====================================

async function loadCheckout() {
    try {
        const response = await fetch("/api/cart", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();
        console.log("Checkout Cart:", data);

        if (!response.ok) {
            throw new Error(data.message || "Unable to load cart");
        }

        displayCheckout(data.items, data.total);

    } catch (error) {
        console.error("Checkout Error:", error);

        if (checkoutContainer) {
            checkoutContainer.innerHTML = `
                <div>
                    <h3>❌ Unable to load checkout</h3>
                    <p>${error.message}</p>
                    <button onclick="loadCheckout()">Try Again</button>
                </div>
            `;
        }
    }
}

// =====================================
// DISPLAY CHECKOUT
// =====================================

function displayCheckout(items, total) {
    if (!checkoutContainer) {
        return;
    }

    if (!items || items.length === 0) {
        checkoutContainer.innerHTML = `
            <div class="empty-cart">
                <h3>🛒 Your Cart Is Empty</h3>
                <p>Add food before checkout.</p>
                <a href="menu.html">Browse Menu</a>
            </div>
        `;
        return;
    }

    let html = `
        <h3>Order Summary</h3>
        <div class="checkout-items">
    `;

    items.forEach(item => {
        html += `
            <div class="cart-item">
                <h4>${item.food_name}</h4>
                <p>Price: ₹${Number(item.price).toFixed(2)}</p>
                <p>Quantity: ${item.quantity}</p>
                <p><strong>Subtotal: ₹${Number(item.subtotal).toFixed(2)}</strong></p>
            </div>
            <hr>
        `;
    });

    html += `
        </div>
        <div class="cart-total">
            <h2>Total: ₹${Number(total).toFixed(2)}</h2>
        </div>
        <h3>Delivery Address</h3>
        <textarea id="delivery-address" rows="5" cols="50" placeholder="Enter your complete delivery address"></textarea>
        <br><br>
        <button onclick="placeOrder()">🛍️ Place Order</button>
        <button onclick="goBackToCart()">← Back to Cart</button>
    `;

    checkoutContainer.innerHTML = html;
}

// =====================================
// PLACE ORDER
// =====================================

async function placeOrder() {
    const addressElement = document.getElementById("delivery-address");

    if (!addressElement) {
        alert("Delivery address field not found.");
        return;
    }

    const deliveryAddress = addressElement.value.trim();

    if (!deliveryAddress) {
        alert("Please enter your delivery address.");
        return;
    }

    try {
        const response = await fetch("/api/orders/place", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                user_id: user.user_id,
                delivery_address: deliveryAddress
            })
        });

        const data = await response.json();
        console.log("Order Response:", data);

        if (!response.ok) {
            alert("❌ " + (data.message || "Unable to place order"));
            return;
        }

        alert("✅ Order placed successfully!");
        console.log("Order ID:", data.order_id);
        window.location.href = "orders.html";

    } catch (error) {
        console.error("Place Order Error:", error);
        alert("❌ Unable to connect to server.");
    }
}

// =====================================
// BACK TO CART
// =====================================

function goBackToCart() {
    window.location.href = "cart.html";
}
