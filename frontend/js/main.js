const adminModules = document.querySelector(".home-admin-modules");
const customerModules = document.querySelector(".home-modules:not(.home-admin-modules)");
const loginLink = document.getElementById("login-link");
const registerLink = document.getElementById("register-link");
const logoutButton = document.getElementById("logout-button");
const token = localStorage.getItem("token");

if (customerModules && token) {
    fetch("/api/auth/me", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
        .then(response => response.ok ? response.json() : null)
        .then(user => {
            if (!user) {
                return;
            }

            customerModules.hidden = false;
            loginLink.hidden = true;
            registerLink.hidden = true;
            logoutButton.hidden = false;

            if (user.role === "ADMIN") {
                adminModules.hidden = false;
            }
        })
        .catch(error => console.error("Unable to verify admin access:", error));
}

logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
});