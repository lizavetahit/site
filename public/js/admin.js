let adminAllUsers = [];
let adminSearchBound = false;

function denyAccess(text) {
  const app = document.getElementById("app");

  if (app) {
    app.innerHTML = `
      <div style="
        color:white;
        display:flex;
        justify-content:center;
        align-items:center;
        height:80vh;
        font-size:24px;
        text-align:center;
        padding:20px;
      ">
        ${text}
      </div>
    `;
  }
}

async function checkAdminAccess() {
  const token = localStorage.getItem("token");

  if (!token) {
    denyAccess("Нет доступа");
    return false;
  }

  try {
    const res = await fetch("/me", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      denyAccess("Нет доступа");
      return false;
    }

    const user = await res.json();

    if (user.role !== "admin") {
      denyAccess("У вас нет доступа к этой странице");
      return false;
    }

    return true;
  } catch (err) {
    console.error("checkAdminAccess error:", err);
    denyAccess("Ошибка доступа");
    return false;
  }
}

function renderUsers(users) {
  const container = document.getElementById("usersList");
  if (!container) return;

  if (!users.length) {
    container.innerHTML = `<div style="opacity:0.6; color:white;">Ничего не найдено</div>`;
    return;
  }

  container.innerHTML = users.map((u) => `
    <div class="user-row">
      <div class="user-info">
        <div class="user-name">${escapeAdminHtml(u.username || "Без имени")}</div>
        <div class="user-tag">@${escapeAdminHtml(u.username_tag || "")}</div>
      </div>

      <select class="role-select" data-user-id="${u.id}">
        <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
        <option value="judge" ${u.role === "judge" ? "selected" : ""}>judge</option>
        <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
      </select>
    </div>
  `).join("");

  bindRoleSelects();
}

function escapeAdminHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadUsers() {
  try {
    const res = await fetch("/api/users", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      console.error("Ошибка загрузки пользователей");
      return;
    }

    const users = await res.json();

    adminAllUsers = Array.isArray(users) ? users : [];
    renderUsers(adminAllUsers);
  } catch (err) {
    console.error("Ошибка loadUsers:", err);
  }
}

async function changeRole(userId, role, selectEl) {
  const previousRole = adminAllUsers.find((u) => u.id === userId)?.role || "user";

  try {
    const res = await fetch(`/api/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ role })
    });

    if (!res.ok) {
      if (selectEl) {
        selectEl.value = previousRole;
      }
      alert("Ошибка смены роли");
      return;
    }

    const user = adminAllUsers.find((u) => u.id === userId);
    if (user) user.role = role;
  } catch (err) {
    console.error("changeRole error:", err);
    if (selectEl) {
      selectEl.value = previousRole;
    }
    alert("Ошибка смены роли");
  }
}

function bindRoleSelects() {
  const selects = document.querySelectorAll(".role-select");

  selects.forEach((select) => {
    if (select.dataset.bound === "true") return;
    select.dataset.bound = "true";

    select.addEventListener("change", () => {
      const userId = Number(select.dataset.userId);
      const role = select.value;

      if (!userId || !role) return;
      changeRole(userId, role, select);
    });
  });
}

function initAdminSearch() {
  const input = document.getElementById("adminSearch");
  const results = document.getElementById("adminSearchResults");

  if (!input || !results || adminSearchBound) return;
  adminSearchBound = true;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();

    if (!q) {
      results.style.display = "none";
      renderUsers(adminAllUsers);
      return;
    }

    const filtered = adminAllUsers.filter((u) =>
      (u.username_tag || "").toLowerCase().includes(q)
    );

    results.innerHTML = filtered.map((u) => `
      <div class="admin-search-item" data-tag="${escapeAdminHtml(u.username_tag || "")}">
        @${escapeAdminHtml(u.username_tag || "")}
      </div>
    `).join("");

    results.style.display = filtered.length ? "block" : "none";

    const items = results.querySelectorAll(".admin-search-item");
    items.forEach((item) => {
      item.addEventListener("click", () => {
        const tag = item.dataset.tag || "";
        selectUser(tag);
      });
    });

    renderUsers(filtered);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".admin-search")) {
      results.style.display = "none";
    }
  });
}

function selectUser(tag) {
  const input = document.getElementById("adminSearch");
  const results = document.getElementById("adminSearchResults");

  if (input) input.value = tag;

  const filtered = adminAllUsers.filter((u) => u.username_tag === tag);
  renderUsers(filtered);

  if (results) {
    results.style.display = "none";
  }
}

window.selectUser = selectUser;

window.initAdminPage = async function () {
  const ok = await checkAdminAccess();
  if (!ok) return;

  adminAllUsers = [];
  adminSearchBound = false;

  await loadUsers();
  initAdminSearch();
};