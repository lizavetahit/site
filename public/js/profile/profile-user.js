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
  if (telegram.startsWith("http://t.me/")) return telegram.replace("http://", "https://");
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
    const res = await fetch("/profile", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      throw new Error("Ошибка загрузки профиля");
    }

    const user = await res.json();

    setText("username", user.username);
    setText("email", user.email);
    setText("bio", user.bio || "");

    let avatar = user.avatar;

if (!avatar || avatar === "" || avatar === "null") {
  avatar = "/images/default-avatar.jpg";
}

document.getElementById("avatar").src = avatar + "?t=" + Date.now();

    document.getElementById("editUsername").value = user.username || "";
    document.getElementById("editBio").value = user.bio || "";
    document.getElementById("editAvatar").value = user.avatar || "";
    document.getElementById("editSoundcloud").value = user.soundcloud || "";
    document.getElementById("editInstagram").value = user.instagram || "";
    document.getElementById("editTwitter").value = user.twitter || "";
    document.getElementById("editTelegram").value = user.telegram || "";
    document.getElementById("editWebsite").value = user.website || "";

    renderSocialLinks(user);
    await loadPosts();
    await loadTracks();
  } catch (error) {
    console.error(error);
    setText("profileError", "Не удалось загрузить профиль");
  }
}

function openEdit() {
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

  setText("usernameError", "");

  if (editBox && usernameInput && username) {
    usernameInput.value = username.innerText.trim();
    editBox.classList.remove("hidden");
    usernameInput.focus();
  }
}

function cancelUsernameEdit() {
  const editBox = document.getElementById("usernameEditBox");
  setText("usernameError", "");
  if (editBox) editBox.classList.add("hidden");
}

async function saveUsername() {
  const username = document.getElementById("usernameInput").value.trim();

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
    document.getElementById("editUsername").value = data.username || username;
    cancelUsernameEdit();
  } catch (error) {
    console.error(error);
    setText("usernameError", "Не удалось изменить ник");
  }
}

async function saveProfile() {

  clearMessages();

  const username = document.getElementById("editUsername").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  const avatar = document.getElementById("editAvatar").value || "";
  const soundcloud = document.getElementById("editSoundcloud").value.trim();
  const instagram = document.getElementById("editInstagram").value.trim();
  const twitter = document.getElementById("editTwitter").value.trim();
  const telegram = document.getElementById("editTelegram").value.trim();
  const website = document.getElementById("editWebsite").value.trim();

  if (!username) {
    setText("profileError", "Ник не может быть пустым");
    return;
  }

  // ограничение био
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
        bio,
        avatar,
        soundcloud,
        instagram,
        twitter,
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

      setText("profileError", data.error || "Ошибка сохранения");
      return;
    }

    closeEdit();
    setText("profileSuccess", "Профиль сохранён");

    await loadProfile();

  } catch (error) {

    console.error(error);
    setText("profileError", "Не удалось сохранить профиль");

  }

}

function initProfileUser(){
  loadProfile()
}