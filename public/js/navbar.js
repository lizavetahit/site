console.log("NAVBAR JS LOADED");

let navbarQueueInterval = null;
let navbarInitialized = false;

async function loadNavbar() {
  const container = document.getElementById("navbar");
  if (!container) return;

  try {
    const res = await fetch("/html/components/navbar.html");
    const html = await res.text();

    container.innerHTML = html;

    const path = window.location.pathname;
    const isAuthPage = path.includes("login") || path.includes("register");

    if (isAuthPage) {
      requestAnimationFrame(() => {
        const navbar = document.querySelector(".navbar");
        if (navbar) {
          navbar.classList.add("auth-navbar");
        }

        const search = document.querySelector(".navbar-search");
        search?.classList.add("navbar-hidden");
      });
    }

    await loadNavbarUser();
    initDropdown();
    initSearch();
    highlightActivePage();

    if (navbarQueueInterval) {
      clearInterval(navbarQueueInterval);
    }

    await loadQueueStatus();
    navbarQueueInterval = setInterval(loadQueueStatus, 5000);
  } catch (err) {
    console.error("Navbar load error:", err);
  }
}

async function loadNavbarUser() {
  const token = localStorage.getItem("token");

  const navGuest = document.getElementById("navGuest");
  const navUser = document.getElementById("navUser");
  const navAvatar = document.getElementById("navAvatar");
  const adminPanelBtn = document.getElementById("adminPanelBtn");
  const navDropdown = document.getElementById("navDropdown");

  if (!navGuest || !navUser || !navAvatar) return;

  adminPanelBtn?.classList.add("navbar-hidden");
  navDropdown?.classList.remove("active");

  if (!token) {
    navGuest.classList.remove("navbar-hidden");
    navUser.classList.add("navbar-hidden");
    window.currentUser = null;
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
    window.currentUser = user;

    navAvatar.src = user.avatar
      ? `${user.avatar}?t=${Date.now()}`
      : "/images/default-avatar.jpg";

    navGuest.classList.add("navbar-hidden");
    navUser.classList.remove("navbar-hidden");

    if (user.role === "admin") {
      adminPanelBtn?.classList.remove("navbar-hidden");
    }
  } catch (err) {
    console.error("Navbar user error:", err);

    navGuest.classList.remove("navbar-hidden");
    navUser.classList.add("navbar-hidden");
    adminPanelBtn?.classList.add("navbar-hidden");
    window.currentUser = null;
  }
}

function initDropdown() {
  const btn = document.getElementById("navUserBtn");
  const dropdown = document.getElementById("navDropdown");

  if (!btn || !dropdown) return;

  if (btn.dataset.dropdownInitialized === "true") return;
  btn.dataset.dropdownInitialized = "true";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
  });

  dropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("active");
  });
}

async function goToProfile(e) {
  if (e) e.stopPropagation();

  const token = localStorage.getItem("token");
  if (!token) {
    navigate("/login");
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
    const tag = user.username_tag;

    if (tag) {
      navigate(`/${tag}`);
    } else {
      navigate("/profile");
    }
  } catch (err) {
    console.error("goToProfile error", err);
    navigate("/profile");
  }
}

function goToSettings(e) {
  if (e) e.stopPropagation();
  navigate("/settings");
}

async function logout(e) {
  if (e) e.stopPropagation();
  localStorage.removeItem("token");
  window.currentUser = null;
  await loadNavbarUser();
  navigate("/");
}

function goToAdmin(e) {
  if (e) e.stopPropagation();
  if (window.currentUser?.role !== "admin") return;
  navigate("/admin");
}

window.goToProfile = goToProfile;
window.goToSettings = goToSettings;
window.logout = logout;
window.goToAdmin = goToAdmin;

function initSearch() {
  const input = document.getElementById("globalSearch");
  const results = document.getElementById("searchResults");

  if (!input || !results) return;
  if (input.dataset.searchInitialized === "true") return;
  input.dataset.searchInitialized = "true";

  let timeout;

  input.addEventListener("input", () => {
    clearTimeout(timeout);

    const q = input.value.trim();

    if (!q) {
      results.classList.remove("active");
      results.innerHTML = "";
      return;
    }

    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);

        if (!res.ok) {
          console.error("Search error:", res.status);
          return;
        }

        const data = await res.json();
        results.innerHTML = "";

        const items = [];

        (data.users || []).forEach((u) => {
          items.push(`
            <div class="navbar-search-item" onclick="goToUserProfile('${u.username_tag}')">
              <img
                class="navbar-search-avatar"
                src="${u.avatar || "/images/default-avatar.jpg"}"
                alt="${u.username || "User"}"
              >
              <div class="navbar-search-info">
                <div class="navbar-search-name">${u.username || "No name"}</div>
                <div class="navbar-search-tag">@${u.username_tag || ""}</div>
              </div>
            </div>
          `);
        });

        if (items.length === 0) {
          results.innerHTML = `<div class="navbar-search-item">Ничего не найдено</div>`;
        } else {
          results.innerHTML = items.join("");
        }

        results.classList.add("active");
      } catch (err) {
        console.error("Search fetch error:", err);
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".navbar-search")) {
      results.classList.remove("active");
    }
  });
}

function goToUserProfile(tag) {
  navigate(`/${tag}`);
}

window.goToUserProfile = goToUserProfile;

async function loadQueueStatus() {
  try {
    const res = await fetch("/api/queue/state");
    const data = await res.json();

    const dot = document.getElementById("queueStatus");
    if (!dot) return;

    dot.classList.remove("active", "closed");

    if (data.state === "open") {
      dot.classList.add("active");
    } else {
      dot.classList.add("closed");
    }
  } catch (err) {
    console.error("Queue status error:", err);
  }
}

function highlightActivePage() {
  const path = window.location.pathname;

  let page = "";

  if (path === "/" || path.includes("index")) page = "index";
  else if (path.includes("playlists")) page = "playlists";
  else if (path.includes("submit")) page = "submit";
  else if (path.includes("queue")) page = "queue";
  else if (path.includes("discover")) page = "discover";

  const nav = document.querySelector(".navbar-links");
  if (!nav) return;

  const links = nav.querySelectorAll("a");
  const indicator = nav.querySelector(".navbar-indicator");
  if (!indicator) return;

  links.forEach((link) => link.classList.remove("active-link"));

  const activeLink = Array.from(links).find((link) => link.dataset.page === page);

  if (!activeLink) {
    indicator.style.width = "0px";
    return;
  }

  activeLink.classList.add("active-link");

  const rect = activeLink.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();

  indicator.style.width = rect.width + "px";
  indicator.style.left = (rect.left - navRect.left) + "px";
}

if (!navbarInitialized) {
  navbarInitialized = true;
  loadNavbar();
}

window.highlightActivePage = highlightActivePage;
window.loadNavbar = loadNavbar;
window.loadNavbarUser = loadNavbarUser;