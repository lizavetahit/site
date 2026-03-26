async function loadNavbar() {
  const container = document.getElementById("navbar");
  if (!container) return;

  try {
    const res = await fetch("/html/components/navbar.html");
    const html = await res.text();

    container.innerHTML = html;

    await loadNavbarUser();
    initDropdown();
  } catch (err) {
    console.error("Navbar load error:", err);
  }
}

async function loadNavbarUser() {
  const token = localStorage.getItem("token");

  const navGuest = document.getElementById("navGuest");
  const navUser = document.getElementById("navUser");
  const navAvatar = document.getElementById("navAvatar");

  if (!navGuest || !navUser || !navAvatar) return;

  if (!token) {
    navGuest.classList.remove("hidden");
    navUser.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch("/me", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) throw new Error("Unauthorized");

    const user = await res.json();
    console.log("USER:", user);

    if (user.avatar) {
  navAvatar.src = user.avatar + "?t=" + Date.now();
} else {
  navAvatar.src = "/images/default-avatar.jpg";
}

    navGuest.classList.add("hidden");
    navUser.classList.remove("hidden");
  } catch (err) {
    console.error("Navbar user error:", err);

    navGuest.classList.remove("hidden");
    navUser.classList.add("hidden");
  }
}

// 🔥 dropdown логика
function initDropdown() {
  const btn = document.getElementById("navUserBtn");
  const dropdown = document.getElementById("navDropdown");

  if (!btn || !dropdown) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("active");
  });
}

// переходы
function goToProfile() {
  window.location.href = "/html/profile.html";
}

function goToSettings() {
  window.location.href = "/html/settings.html";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/html/index.html";
}

window.goToProfile = goToProfile;
window.goToSettings = goToSettings;
window.logout = logout;

// запуск
loadNavbar();