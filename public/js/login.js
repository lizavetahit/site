function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("error");
  const loginInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const tgAvatar = document.getElementById("tgAvatar");

  function renderTelegramWidget() {
  const container = document.querySelector(".telegram-widget-wrap");
  if (!container) return;

  container.innerHTML = "";

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.async = true;

  script.setAttribute("data-telegram-login", "ritmoriaauthBot");
  script.setAttribute("data-size", "large");
  script.setAttribute("data-userpic", "true");
  script.setAttribute("data-radius", "20");
  script.setAttribute("data-request-access", "write");
  script.setAttribute("data-onauth", "onTelegramAuth(user)");

  container.appendChild(script);
}

  if (!loginForm) return;
  if (loginForm.dataset.authInitialized === "true") return;
  loginForm.dataset.authInitialized = "true";

  function setError(message = "") {
    if (loginError) {
      loginError.innerText = message;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");

    const login = loginInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!login || !password) {
      setError("Заполни email/@username и пароль");
      return;
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ login, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Неверный email или пароль");
        return;
      }

      if (!data?.token) {
        setError("Сервер не вернул токен");
        return;
      }

      localStorage.setItem("token", data.token);

// 🔥 ОБНОВЛЯЕМ NAVBAR
if (window.loadNavbarUser) {
  await window.loadNavbarUser();
}

navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      setError("Ошибка сервера");
    }
  });

  window.onTelegramAuth = async function (user) {
    try {
      if (tgAvatar && user?.photo_url) {
        tgAvatar.src = user.photo_url;
        tgAvatar.classList.remove("auth-hidden");
      }

      const response = await fetch("/telegram-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Telegram login failed:", data);
        setError(data?.error || "Ошибка входа через Telegram");
        return;
      }

      if (!data?.token) {
        setError("Не удалось войти через Telegram");
        return;
      }

      localStorage.setItem("token", data.token);

if (window.loadNavbarUser) {
  await window.loadNavbarUser();
}

navigate("/");
      
    } catch (error) {
      console.error("Telegram login error:", error);
      setError("Ошибка входа через Telegram");
    }
  };

  renderTelegramWidget();
}

window.initLoginPage = initLoginPage;