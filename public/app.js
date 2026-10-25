document.querySelectorAll("[data-demo-role]").forEach(button => {
  button.addEventListener("click", () => {
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    if (!email || !password) return;
    email.value = button.dataset.demoRole + "@example.test";
    password.value = "DemoShop!2026";
    document.querySelectorAll("[data-demo-role]").forEach(choice => {
      choice.classList.toggle("selected", choice === button);
    });
    document.querySelector(".login-form button[type=submit]")?.focus();
  });
});
document.querySelectorAll("form").forEach(form => {
  if (form.method.toLowerCase() !== "post") return;
  form.addEventListener("submit", () => {
    const button = form.querySelector("button[type=submit]");
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
  });
});
