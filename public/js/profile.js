const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/html/login.html";
}

function setMessage(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = text || "";
  }
}

function clearMessages() {
  setMessage("profileError", "");
  setMessage("profileSuccess", "");
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
  if (telegram.startsWith("@")) return "https://t.me/" + telegram.slice(1);
  if (telegram.includes("t.me/")) return normalizeUrl(telegram);

  return "https://t.me/" + telegram;
}

function renderSocialLinks(user) {
  const socialLinks = document.getElementById("socialLinks");
  if (!socialLinks) return;

  socialLinks.innerHTML = "";

  const socials = [
    {
      value: user.soundcloud,
      href: normalizeUrl(user.soundcloud),
      icon: "fa-brands fa-soundcloud",
      className: "soundcloud",
      title: "SoundCloud"
    },
    {
      value: user.instagram,
      href: normalizeUrl(user.instagram),
      icon: "fa-brands fa-instagram",
      className: "instagram",
      title: "Instagram"
    },
    {
      value: user.telegram,
      href: normalizeTelegram(user.telegram),
      icon: "fa-brands fa-telegram",
      className: "telegram",
      title: "Telegram"
    },
    {
      value: user.website,
      href: normalizeUrl(user.website),
      icon: "fa-solid fa-globe",
      className: "website",
      title: "Website"
    }
  ];

  socials.forEach((item) => {
    if (!item.value) return;

    const link = document.createElement("a");
    link.href = item.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = `social-link ${item.className}`;
    link.title = item.title;

    const icon = document.createElement("i");
    icon.className = item.icon;

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

    document.getElementById("username").innerText = user.username || "";
    document.getElementById("email").innerText = user.email || "";
    document.getElementById("bio").innerText = user.bio || "";
    document.getElementById("avatar").src = user.avatar || "https://i.pravatar.cc/150";

    const editUsername = document.getElementById("editUsername");
    const editBio = document.getElementById("editBio");
    const editAvatar = document.getElementById("editAvatar");
    const editSoundcloud = document.getElementById("editSoundcloud");
    const editInstagram = document.getElementById("editInstagram");
    const editTelegram = document.getElementById("editTelegram");
    const editWebsite = document.getElementById("editWebsite");

    if (editUsername) editUsername.value = user.username || "";
    if (editBio) editBio.value = user.bio || "";
    if (editAvatar) editAvatar.value = user.avatar || "";
    if (editSoundcloud) editSoundcloud.value = user.soundcloud || "";
    if (editInstagram) editInstagram.value = user.instagram || "";
    if (editTelegram) editTelegram.value = user.telegram || "";
    if (editWebsite) editWebsite.value = user.website || "";

    renderSocialLinks(user);
    loadPosts();
    loadTracks();
  } catch (error) {
    console.error(error);
    setMessage("profileError", "Не удалось загрузить профиль");
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
  const box = document.getElementById("usernameEditBox");
  const input = document.getElementById("usernameInput");
  const username = document.getElementById("username");

  if (!box || !input || !username) return;

  input.value = username.innerText.trim();
  box.classList.remove("hidden");
  input.focus();
}

function cancelUsernameEdit() {
  const box = document.getElementById("usernameEditBox");
  if (box) box.classList.add("hidden");
}

async function saveUsername() {
  clearMessages();

  const input = document.getElementById("usernameInput");
  const box = document.getElementById("usernameEditBox");

  if (!input) return;

  const username = input.value.trim();

  if (!username) {
    setMessage("profileError", "Ник не может быть пустым");
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
        setMessage("profileError", "Этот никнейм уже используется");
        return;
      }

      setMessage("profileError", data.error || "Ошибка сохранения ника");
      return;
    }

    document.getElementById("username").innerText = data.username || username;
    document.getElementById("editUsername").value = data.username || username;

    if (box) box.classList.add("hidden");

    setMessage("profileSuccess", "Ник успешно обновлён");
  } catch (error) {
    console.error(error);
    setMessage("profileError", "Не удалось обновить ник");
  }
}

async function saveProfile() {
  clearMessages();

  const username = document.getElementById("editUsername")?.value.trim() || "";
  const bio = document.getElementById("editBio")?.value.trim() || "";
  const avatar = document.getElementById("editAvatar")?.value || "";
  const soundcloud = document.getElementById("editSoundcloud")?.value.trim() || "";
  const instagram = document.getElementById("editInstagram")?.value.trim() || "";
  const telegram = document.getElementById("editTelegram")?.value.trim() || "";
  const website = document.getElementById("editWebsite")?.value.trim() || "";

  if (!username) {
    setMessage("profileError", "Ник не может быть пустым");
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
        telegram,
        website
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error === "username_taken") {
        setMessage("profileError", "Этот никнейм уже используется");
        return;
      }

      setMessage("profileError", data.error || "Ошибка сохранения профиля");
      return;
    }

    closeEdit();
    setMessage("profileSuccess", "Профиль успешно сохранён");
    loadProfile();
  } catch (error) {
    console.error(error);
    setMessage("profileError", "Не удалось сохранить профиль");
  }
}

async function uploadAvatar(file) {
  if (!file) return;

  clearMessages();

  try {
    const formData = new FormData();
    formData.append("avatar", file);

    const uploadRes = await fetch("/upload-avatar", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.avatar) {
      throw new Error("Ошибка загрузки файла");
    }

    const saveRes = await fetch("/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ avatar: uploadData.avatar })
    });

    const saveData = await saveRes.json();

    if (!saveRes.ok) {
      throw new Error(saveData.error || "Ошибка сохранения аватара");
    }

    document.getElementById("avatar").src = uploadData.avatar;
    document.getElementById("editAvatar").value = uploadData.avatar;
    setMessage("profileSuccess", "Аватар обновлён");
  } catch (error) {
    console.error(error);
    setMessage("profileError", "Не удалось обновить аватар");
  }
}

async function loadPosts() {
  const container = document.getElementById("postsContainer");
  if (!container) return;

  try {
    const res = await fetch("/my-posts");
    const posts = await res.json();

    container.innerHTML = "";

    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "post-card";
      card.innerText = post.content;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="post-card">Не удалось загрузить посты</div>';
  }
}

async function loadTracks() {
  const container = document.getElementById("tracksContainer");
  if (!container) return;

  try {
    const res = await fetch("/my-tracks");
    const tracks = await res.json();

    container.innerHTML = "";

    tracks.forEach((track) => {
      const card = document.createElement("div");
      card.className = "track-card-small";
      card.innerText = track.title;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="track-card-small">Не удалось загрузить треки</div>';
  }
}

function createPost() {
  window.location.href = "/html/create-post.html";
}

function addTrack() {
  window.location.href = "/html/submit.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const avatarInput = document.getElementById("avatarInput");

  if (avatarInput) {
    avatarInput.addEventListener("change", function () {
      const file = this.files[0];
      uploadAvatar(file);
    });
  }

  window.addEventListener("click", function (event) {
    const modal = document.getElementById("editModal");
    if (event.target === modal) {
      closeEdit();
    }
  });

  loadProfile();
});