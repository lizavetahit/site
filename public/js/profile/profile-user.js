const token = localStorage.getItem("token");

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = text || "";
  }
}

function clearMessages() {
  setText("profileError", "");
  setText("profileSuccess", "");
  setText("usernameError", "");
}

function normalizeUrl(url) {
  if (!url) return "";
  const value = url.trim();

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:")
  ) {
    return value;
  }

  return "https://" + value;
}

function normalizeTelegram(value) {
  if (!value) return "";
  const telegram = value.trim();

  if (telegram.startsWith("https://t.me/")) return telegram;
  if (telegram.startsWith("http://t.me/")) {
    return telegram.replace("http://", "https://");
  }
  if (telegram.startsWith("@")) return `https://t.me/${telegram.slice(1)}`;
  if (telegram.includes("t.me/")) return normalizeUrl(telegram);

  return `https://t.me/${telegram}`;
}

function renderSocialLinks(user) {
  const socialLinks = document.getElementById("socialLinks");
  if (!socialLinks) return;

  socialLinks.innerHTML = "";

  const items = [
    {
      value: user.soundcloud,
      href: normalizeUrl(user.soundcloud),
      className: "soundcloud",
      iconClass: "fa-brands fa-soundcloud",
      title: "SoundCloud"
    },
    {
      value: user.instagram,
      href: normalizeUrl(user.instagram),
      className: "instagram",
      iconClass: "fa-brands fa-instagram",
      title: "Instagram"
    },
    {
      value: user.telegram,
      href: normalizeTelegram(user.telegram),
      className: "telegram",
      iconClass: "fa-brands fa-telegram",
      title: "Telegram"
    },
    {
      value: user.website,
      href: normalizeUrl(user.website),
      className: "website",
      iconClass: "fa-solid fa-globe",
      title: "Website"
    }
  ];

  items.forEach((item) => {
    if (!item.value) return;

    const link = document.createElement("a");
    link.href = item.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = `social-link ${item.className}`;
    link.title = item.title;
    link.setAttribute("aria-label", item.title);

    const icon = document.createElement("i");
    icon.className = item.iconClass;

    link.appendChild(icon);
    socialLinks.appendChild(link);
  });
}

async function loadProfile() {
  clearMessages();

  try {
    const params = new URLSearchParams(window.location.search);
    const tag = window.__profileTag || params.get("tag");

    let url = "/api/profile";
    if (tag) {
      url += `?tag=${tag}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      throw new Error("Ошибка загрузки профиля");
    }

    const user = await res.json();
    window.currentProfile = user;

    if (typeof fillProfileEditor === "function") {
      fillProfileEditor(user);
    }

    setText("username", user.username);
    setText("usernameTag", user.username_tag ? "@" + user.username_tag : "");

    const bioEl = document.getElementById("bio");
    if (!bioEl) return user;

    if (!user.bio || user.bio.trim() === "") {
      bioEl.style.display = "none";
    } else {
      bioEl.style.display = "block";
      bioEl.innerText = user.bio;
    }

    let avatar = user.avatar;
    if (!avatar || avatar === "" || avatar === "null") {
      avatar = "/images/default-avatar.jpg";
    }

    const avatarEl = document.getElementById("avatar");
    if (avatarEl) {
      avatarEl.src = avatar + "?t=" + Date.now();
    }

    const editUsernameEl = document.getElementById("editUsername");
    const editBioEl = document.getElementById("editBio");
    const editAvatarEl = document.getElementById("editAvatar");
    const editSoundcloudEl = document.getElementById("editSoundcloud");
    const editInstagramEl = document.getElementById("editInstagram");
    const editTwitterEl = document.getElementById("editTwitter");
    const editTelegramEl = document.getElementById("editTelegram");
    const editWebsiteEl = document.getElementById("editWebsite");
    const editUsernameTagEl = document.getElementById("editUsernameTag");
    const bioCount = document.getElementById("bioCount");

    if (editUsernameEl) editUsernameEl.value = user.username || "";
    if (editUsernameTagEl) editUsernameTagEl.value = user.username_tag || "";
    if (editBioEl) editBioEl.value = user.bio || "";
    if (bioCount && editBioEl) bioCount.textContent = editBioEl.value.length;
    if (editAvatarEl) editAvatarEl.value = user.avatar || "";
    if (editSoundcloudEl) editSoundcloudEl.value = user.soundcloud || "";
    if (editInstagramEl) editInstagramEl.value = user.instagram || "";
    if (editTwitterEl) editTwitterEl.value = user.twitter || "";
    if (editTelegramEl) editTelegramEl.value = user.telegram || "";
    if (editWebsiteEl) editWebsiteEl.value = user.website || "";

    renderSocialLinks(user);

    await loadFollowCounts(user.id);
    await initFollowSystem();

    return user;
  } catch (error) {
    console.error(error);
    setText("profileError", "Не удалось загрузить профиль");
    return null;
  }
}

async function openEdit() {
  if (!(await isMyProfileAsync())) {
    alert("Это не твой профиль 😈");
    return;
  }

  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "block";
}

function closeEdit() {
  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "none";
}

function editUsername() {
  const editBox = document.getElementById("usernameEditBox");
  const usernameInput = document.getElementById("usernameInput");
  const username = document.getElementById("username");

  if (!editBox || !usernameInput || !username) return;

  if (!editBox.classList.contains("profile-hidden")) {
    editBox.classList.add("profile-hidden");
    return;
  }

  setText("usernameError", "");
  usernameInput.value = username.innerText.trim();
  editBox.classList.remove("profile-hidden");
  usernameInput.focus();
}

function cancelUsernameEdit() {
  const editBox = document.getElementById("usernameEditBox");
  setText("usernameError", "");
  if (editBox) editBox.classList.add("profile-hidden");
}

async function saveUsername() {
  if (!(await isMyProfileAsync())) {
    alert("Это не твой профиль 😈");
    return;
  }

  const username = document.getElementById("usernameInput")?.value.trim() || "";

  setText("usernameError", "");
  setText("profileError", "");

  if (!username) {
    setText("usernameError", "Ник не может быть пустым");
    return;
  }

  try {
    const res = await fetch("/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ username })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error === "username_taken") {
        setText("usernameError", "Этот никнейм уже используется");
        return;
      }

      setText("usernameError", data.error || "Не удалось изменить ник");
      return;
    }

    document.getElementById("username").innerText = data.username || username;
    const editUsernameEl = document.getElementById("editUsername");
    if (editUsernameEl) editUsernameEl.value = data.username || username;

    cancelUsernameEdit();
  } catch (error) {
    console.error(error);
    setText("usernameError", "Не удалось изменить ник");
  }
}

async function saveProfile() {
  if (!(await isMyProfileAsync())) {
    alert("Это не твой профиль 😈");
    return;
  }

  clearMessages();

  const username = document.getElementById("editUsername")?.value.trim() || "";
  const username_tag = document.getElementById("editUsernameTag")?.value.trim() || "";
  const bio = document.getElementById("editBio")?.value.trim() || "";
  const soundcloud = document.getElementById("editSoundcloud")?.value.trim() || "";
  const instagram = document.getElementById("editInstagram")?.value.trim() || "";
  const telegram = document.getElementById("editTelegram")?.value.trim() || "";
  const website = document.getElementById("editWebsite")?.value.trim() || "";

  if (!username) {
    setText("profileError", "Ник не может быть пустым");
    return;
  }

  if (bio.length > 200) {
    setText("profileError", "Описание максимум 200 символов");
    return;
  }

  try {
    const res = await fetch("/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        username,
        username_tag,
        bio,
        soundcloud,
        instagram,
        telegram,
        website
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error === "username_taken") {
        setText("profileError", "Этот ник уже используется");
        return;
      }

      if (data.error === "username_tag_taken") {
        setText("profileError", "Этот username уже занят");
        return;
      }

      setText("profileError", data.error || "Ошибка сохранения");
      return;
    }

    closeEdit();
    setText("profileSuccess", "Профиль сохранён");

    await loadProfile();
    await handleProfileUI();
    if (typeof loadNavbarUser === "function") {
      await loadNavbarUser();
    }
  } catch (error) {
    console.error(error);
    setText("profileError", "Не удалось сохранить профиль");
  }
}

async function initProfileUser() {
  const data = await loadProfile();
  window.currentProfile = data;
}

window.openEdit = openEdit;
window.closeEdit = closeEdit;
window.saveProfile = saveProfile;
window.editUsername = editUsername;
window.saveUsername = saveUsername;
window.cancelUsernameEdit = cancelUsernameEdit;
window.initProfileUser = initProfileUser;

async function getProfileId() {
  const params = new URLSearchParams(window.location.search);
  const tag = window.__profileTag || params.get("tag");

  let url = "/api/profile";
  if (tag) url += "?tag=" + tag;

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token }
  });

  const user = await res.json();
  return user.id;
}

async function initFollowSystem() {
  const btn = document.getElementById("followBtn");
  const actions = document.querySelector(".profile-page-actions");
  if (!btn || !actions) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  const params = new URLSearchParams(window.location.search);
  const tag = window.__profileTag || params.get("tag");

  if (!tag) {
    btn.style.setProperty("display", "none", "important");
    const myId = await getProfileId();
    await loadFollowCounts(myId);
    return;
  }

  let myTag = "";

  try {
    const meRes = await fetch("/me", {
      headers: { Authorization: "Bearer " + token }
    });

    const me = await meRes.json();
    myTag = (me.username_tag || "").toLowerCase();
  } catch (e) {
    console.error("me error", e);
  }

  if (tag.toLowerCase() === myTag) {
    btn.style.setProperty("display", "none", "important");
    return;
  }

  actions.style.setProperty("display", "flex", "important");
  btn.style.setProperty("display", "inline-flex", "important");
  btn.style.setProperty("visibility", "visible", "important");
  btn.style.setProperty("opacity", "1", "important");

  const profileId = await getProfileId();

  const statusRes = await fetch(`/follow-status/${profileId}`, {
    headers: { Authorization: "Bearer " + token }
  });

  const status = await statusRes.json();

  updateFollowBtn(btn, status.following);
  await loadFollowCounts(profileId);

  btn.onclick = async () => {
    const res = await fetch(`/follow/${profileId}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();

    updateFollowBtn(btn, data.following);
    updateFollowCountsInstant(data.following);
    await loadFollowCounts(profileId);
  };
}

function updateFollowBtn(btn, following) {
  if (following) {
    btn.innerHTML = '<i class="fa-solid fa-user-minus"></i> Отписаться';
    btn.classList.add("secondary-btn");
  } else {
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Подписаться';
    btn.classList.remove("secondary-btn");
  }
}

async function loadFollowCounts(userId) {
  const token = localStorage.getItem("token");

  const followers = await fetch(`/followers-count/${userId}`, {
    headers: { Authorization: "Bearer " + token }
  }).then((r) => r.json());

  const following = await fetch(`/following-count/${userId}`, {
    headers: { Authorization: "Bearer " + token }
  }).then((r) => r.json());

  const followersEl = document.getElementById("followersCount");
  const followingEl = document.getElementById("followingCount");

  const newFollowers = Number(followers.count) || 0;
  const newFollowing = Number(following.count) || 0;

  animateCount(followersEl, newFollowers);
  animateCount(followingEl, newFollowing);
}

const counters = new Map();

function animateCount(el, newValue) {
  if (!el) return;

  if (counters.has(el)) {
    cancelAnimationFrame(counters.get(el));
  }

  const start = Number(el.dataset.value || el.innerText || 0);
  const duration = 250;
  const startTime = performance.now();

  function update(time) {
    const progress = Math.min((time - startTime) / duration, 1);
    const value = Math.round(start + (newValue - start) * progress);

    el.innerText = value;
    el.dataset.value = value;

    if (progress < 1) {
      const id = requestAnimationFrame(update);
      counters.set(el, id);
    } else {
      el.dataset.value = newValue;
      counters.delete(el);
      el.style.transform = "scale(1.15)";
      el.style.color = "#ff4d9d";

      setTimeout(() => {
        el.style.transform = "scale(1)";
        el.style.color = "";
      }, 180);
    }
  }

  const id = requestAnimationFrame(update);
  counters.set(el, id);
}

async function openFollowModal(type) {
  const modal = document.getElementById("followModal");
  const list = document.getElementById("followList");
  const title = document.getElementById("followTitle");

  if (!modal || !list || !title) return;

  modal.style.display = "flex";
  list.innerHTML = "Загрузка...";

  const targetId = await getProfileId();

  let url = "";

  if (type === "followers") {
    title.innerText = "Подписчики";
    url = `/followers/${targetId}`;
  } else {
    title.innerText = "Подписки";
    url = `/following/${targetId}`;
  }

  const res = await fetch(url);
  const users = await res.json();

  list.innerHTML = "";

  users.forEach((user) => {
    list.innerHTML += `
      <div class="follow-item" onclick="goToUserProfile('${user.username_tag}')">
        <img class="follow-avatar" src="${user.avatar || "/images/default-avatar.jpg"}">
        <div class="follow-info">
          <div class="follow-name">${user.username}</div>
          <div class="follow-tag">@${user.username_tag}</div>
        </div>
        <div class="follow-action">
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>
    `;
  });
}

function closeFollowModal() {
  const modal = document.getElementById("followModal");
  if (modal) modal.style.display = "none";
}

function goToUserProfile(tag) {
  navigate(`/${tag}`);
}

function updateFollowCountsInstant(isFollowing) {
  const followersEl = document.getElementById("followersCount");

  let current = Number(followersEl?.dataset.value || followersEl?.innerText || 0);

  if (isFollowing) {
    animateCount(followersEl, current + 1);
  } else {
    animateCount(followersEl, Math.max(0, current - 1));
  }
}

const bioInput = document.getElementById("editBio");
const bioCount = document.getElementById("bioCount");

if (bioInput && bioCount) {
  bioInput.addEventListener("input", () => {
    bioCount.textContent = bioInput.value.length;
  });
}

window.openFollowModal = openFollowModal;
window.closeFollowModal = closeFollowModal;
window.goToUserProfile = goToUserProfile;
window.initFollowSystem = initFollowSystem;
window.loadFollowCounts = loadFollowCounts;