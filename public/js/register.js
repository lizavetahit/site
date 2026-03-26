console.log("REGISTER JS LOADED");

const emailInput = document.getElementById("email");
const emailStatus = document.getElementById("emailStatus");

const form = document.getElementById("registerForm");
const error = document.getElementById("error");

const usernameInput = document.getElementById("username");
const tagInput = document.getElementById("usernameTag");
const tagStatus = document.getElementById("tagStatus");

let emailTimeout;

// ================= EMAIL CHECK =================
emailInput.addEventListener("input", () => {
  clearTimeout(emailTimeout);

  const email = emailInput.value.trim();

  if (!email) {
    emailStatus.innerText = "";
    emailInput.classList.remove("valid", "invalid");
    return;
  }

  if (!email.includes("@")) {
    emailStatus.innerText = "Некорректный email";
    emailStatus.style.color = "#ef4444";
    emailInput.classList.add("invalid");
    return;
  }

  emailStatus.innerText = "Проверка...";
  emailStatus.style.color = "#a78bfa";

  emailTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/check-email/${encodeURIComponent(email)}`);
      const data = await res.json();

      if (data.available) {
        emailStatus.innerText = "Доступно";
        emailStatus.style.color = "#22c55e";
        emailInput.classList.remove("invalid");
        emailInput.classList.add("valid");
      } else {
        emailStatus.innerText = "Уже используется";
        emailStatus.style.color = "#ef4444";
        emailInput.classList.remove("valid");
        emailInput.classList.add("invalid");
      }
    } catch {
      emailStatus.innerText = "Ошибка";
      emailStatus.style.color = "#ef4444";
    }
  }, 500);
});

// ================= TAG CHECK =================
let timeout;

tagInput.addEventListener("input", () => {
  clearTimeout(timeout);

  const tag = tagInput.value.trim();

  if (!tag) {
    tagStatus.innerText = "";
    tagInput.classList.remove("valid", "invalid");
    return;
  }

  tagStatus.innerText = "Проверка...";
  tagStatus.style.color = "#a78bfa";

  timeout = setTimeout(async () => {
    try {
      const res = await fetch(`/check-tag/${tag}`);
      const data = await res.json();

      if (data.available) {
        tagStatus.innerText = "Доступно";
        tagStatus.style.color = "#22c55e";
        tagInput.classList.remove("invalid");
        tagInput.classList.add("valid");
      } else {
        tagStatus.innerText = "Уже занято";
        tagStatus.style.color = "#ef4444";
        tagInput.classList.remove("valid");
        tagInput.classList.add("invalid");
      }
    } catch {
      tagStatus.innerText = "Ошибка";
      tagStatus.style.color = "#ef4444";
    }
  }, 500);
});

// ================= SUBMIT =================
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log("SUBMIT WORKS");
  console.log("EMAIL:", emailInput.value);

  const username = usernameInput.value.trim();
  const username_tag = tagInput.value.trim();
  const email = emailInput.value.trim();
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  error.innerText = "";

  if (username.length < 3) {
    error.innerText = "Имя минимум 3 символа";
    return;
  }

  if (!email.includes("@")) {
    error.innerText = "Введите корректный email";
    return;
  }

  if (password.length < 8) {
    error.innerText = "Пароль минимум 8 символов";
    return;
  }

  if (password !== password2) {
    error.innerText = "Пароли не совпадают";
    return;
  }

  if (username_tag.length < 3) {
    error.innerText = "Username минимум 3 символа";
    return;
  }

  try {
    console.log("EMAIL FRONT:", email);
    // 🔥 1. отправляем код
    await fetch("/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

     openCodeModal(email);
    return;

    if (!code) {
      error.innerText = "Введите код";
      return;
    }

    // 🔍 3. проверка кода
    const verifyRes = await fetch("/verify-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, code })
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      error.innerText = "Неверный код";
      return;
    }

    // 🚀 4. регистрация
    const res = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        username_tag,
        email,
        password
      })
    });

    if (res.ok) {
      alert("Регистрация успешна 🔥");
      window.location.href = "login.html";
    } else {
      error.innerText = "Ошибка регистрации";
    }

  } catch (err) {
    console.error(err);
    error.innerText = "Ошибка сервера";
  }
});

// ================= TELEGRAM =================
window.onTelegramAuth = async function (user) {
  console.log("TG DATA:", user);

  try {
    const res = await fetch("/telegram-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    });

    if (!res.ok) return;

    const data = await res.json();

    if (!data.token) return;

    localStorage.setItem("token", data.token);

    setTimeout(() => {
      window.location.href = "/html/profile.html";
    }, 100);

  } catch (err) {
    console.log("TG ERROR:", err);
  }
};

function openCodeModal(email) {
  const modal = document.getElementById("codeModal");
  modal.classList.remove("hidden");

  const confirmBtn = document.getElementById("confirmCodeBtn");
  const input = document.getElementById("codeInput");
  const error = document.getElementById("codeError");

  confirmBtn.onclick = async () => {
    const code = input.value.trim();

    if (!code) {
      error.innerText = "Введите код";
      return;
    }

    const res = await fetch("/verify-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, code })
    });

    const data = await res.json();

    if (!data.success) {
      error.innerText = "Неверный код";
      return;
    }

    // 👉 регистрация после кода
    await completeRegistration(email);
  };
}

function closeCodeModal() {
  document.getElementById("codeModal").classList.add("hidden");
}

async function completeRegistration(email) {
  const username = document.getElementById("username").value.trim();
  const username_tag = document.getElementById("usernameTag").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      username_tag,
      email,
      password
    })
  });

  if (res.ok) {
    alert("Регистрация успешна 🔥");
    window.location.href = "login.html";
  }
}