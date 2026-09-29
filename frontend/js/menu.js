const API_URL = "/api/foods";

const CATEGORY_IMAGES = {
    "Starters": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    "Main Course": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80",
    "Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
    "Burgers": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    "Desserts": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
    "Beverages": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80"
};

async function loadFoodItems() {

    const foodContainer = document.getElementById("food-container");

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch food items");
        }

        const foods = await response.json();

        foodContainer.innerHTML = "";

        foods.forEach(food => {

            const foodCard = document.createElement("div");

            foodCard.className = "food-card";

            const foodImage = document.createElement("img");
            foodImage.className = "food-card-image";
            foodImage.alt = food.food_name;
            foodImage.loading = "lazy";
            foodImage.src = food.image_url || CATEGORY_IMAGES[food.category_name];
            foodImage.addEventListener("error", () => {
                if (foodImage.src !== CATEGORY_IMAGES[food.category_name]) {
                    foodImage.src = CATEGORY_IMAGES[food.category_name];
                } else {
                    foodImage.remove();
                }
            });

            foodCard.innerHTML = `
                <h3>${food.food_name}</h3>

                <p>${food.description || ""}</p>

                <p>
                    <strong>Category:</strong>
                    ${food.category_name}
                </p>

                <p>
                    <strong>Price:</strong>
                    ₹${food.price}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${food.availability == 1
                        ? "Available"
                        : "Not Available"}
                </p>

                <button
                    onclick="addToCart(${food.food_id})"
                    ${food.availability == 1 ? "" : "disabled"}>
                    Add to Cart
                </button>
            `;

            foodCard.prepend(foodImage);
            foodContainer.appendChild(foodCard);
        });

    } catch (error) {

        console.error("Error:", error);

        foodContainer.innerHTML = `
            <p>❌ Unable to load food items.</p>
        `;
    }
}


// =====================================
// ADD TO CART
// =====================================

async function addToCart(foodId) {

    const user = JSON.parse(
        localStorage.getItem("user")
    );
    const token = localStorage.getItem("token");

    if (!user || !token) {

        alert("Please login first.");

        window.location.href = "login.html";

        return;
    }

    try {

        const response = await fetch("/api/cart", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },

            body: JSON.stringify({
                food_id: foodId,

                quantity: 1
            })
        });

        const data = await response.json();

        if (!response.ok) {

            alert("❌ " + data.message);

            return;
        }

        alert("✅ " + data.message);

    } catch (error) {

        console.error(error);

        alert("❌ Unable to add item to cart.");
    }
}


loadFoodItems();