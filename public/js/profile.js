const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/html/login.html";
}

let cropState = {
  file: null,
  image: null,
  scale: 1,
  minScale: 1,
  maxScale: 4,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0
};

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

function openCropModal() {
  const cropModal = document.getElementById("cropModal");
  if (cropModal) cropModal.style.display = "block";
}

function closeCropModal() {
  const cropModal = document.getElementById("cropModal");
  const avatarInput = document.getElementById("avatarInput");

  if (cropModal) cropModal.style.display = "none";
  if (avatarInput) avatarInput.value = "";

  cropState = {
    file: null,
    image: null,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0
  };
}

function updateCropImageTransform() {
  const cropImage = document.getElementById("cropImage");
  if (!cropImage || !cropState.image) return;

  const circleSize = 280;

  clampCropPosition();

  const scaledWidth = cropState.image.width * cropState.scale;
  const scaledHeight = cropState.image.height * cropState.scale;

  const left = (circleSize - scaledWidth) / 2 + cropState.x;
  const top = (circleSize - scaledHeight) / 2 + cropState.y;

  cropImage.style.width = `${scaledWidth}px`;
  cropImage.style.height = `${scaledHeight}px`;
  cropImage.style.left = `${left}px`;
  cropImage.style.top = `${top}px`;
}

function initCropImage(src, file) {
  const cropImage = document.getElementById("cropImage");
  const zoomRange = document.getElementById("zoomRange");

  const circleSize = 280;

  cropState.file = file;
  cropState.image = new Image();

  cropState.image.onload = function () {
    const coverScale = Math.max(
      circleSize / cropState.image.width,
      circleSize / cropState.image.height
    );

    cropState.minScale = coverScale;
    cropState.maxScale = coverScale * 4;
    cropState.scale = coverScale;
    cropState.x = 0;
    cropState.y = 0;

    cropImage.src = src;

    zoomRange.min = String(cropState.minScale);
    zoomRange.max = String(cropState.maxScale);
    zoomRange.step = "0.01";
    zoomRange.value = String(cropState.scale);

    updateCropImageTransform();
    openCropModal();
  };

  cropState.image.src = src;
}

function startCropDrag(clientX, clientY) {
  cropState.dragging = true;
  cropState.startX = clientX - cropState.x;
  cropState.startY = clientY - cropState.y;
}

function moveCropDrag(clientX, clientY) {
  if (!cropState.dragging) return;

  cropState.x = clientX - cropState.startX;
  cropState.y = clientY - cropState.startY;

  updateCropImageTransform();
}


function endCropDrag() {
  cropState.dragging = false;
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
  const zoomRange = document.getElementById("zoomRange");
  const cropCircle = document.getElementById("cropCircle");

  const bioInput = document.getElementById("editBio");
  const bioCount = document.getElementById("bioCount");

  // счетчик символов био
  if (bioInput && bioCount) {

    bioCount.innerText = bioInput.value.length;

    bioInput.addEventListener("input", () => {
      bioCount.innerText = bioInput.value.length;
    });

  }

  // загрузка аватара
  if (avatarInput) {

    avatarInput.addEventListener("change", (event) => {

      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        initCropImage(e.target.result, file);
      };

      reader.readAsDataURL(file);

    });

  }

  // масштаб аватара
  if (zoomRange) {

    zoomRange.addEventListener("input", (event) => {

      cropState.scale = clamp(
        parseFloat(event.target.value),
        cropState.minScale,
        cropState.maxScale
      );

      updateCropImageTransform();

    });

  }

  // управление кропом
  if (cropCircle) {

    cropCircle.addEventListener("wheel", (event) => {

      event.preventDefault();

      const zoomStep = cropState.minScale * 0.08;

      if (event.deltaY < 0) {
        cropState.scale += zoomStep;
      } else {
        cropState.scale -= zoomStep;
      }

      cropState.scale = clamp(
        cropState.scale,
        cropState.minScale,
        cropState.maxScale
      );

      if (zoomRange) {
        zoomRange.value = String(cropState.scale);
      }

      updateCropImageTransform();

    });

    cropCircle.addEventListener("mousedown", (event) => {
      startCropDrag(event.clientX, event.clientY);
    });

    window.addEventListener("mousemove", (event) => {
      moveCropDrag(event.clientX, event.clientY);
    });

    window.addEventListener("mouseup", endCropDrag);

    cropCircle.addEventListener("touchstart", (event) => {
      const touch = event.touches[0];
      startCropDrag(touch.clientX, touch.clientY);
    });

    window.addEventListener("touchmove", (event) => {
      if (!cropState.dragging) return;
      const touch = event.touches[0];
      moveCropDrag(touch.clientX, touch.clientY);
    });

    window.addEventListener("touchend", endCropDrag);

  }

  // закрытие модальных окон
  window.addEventListener("click", (event) => {

    const editModal = document.getElementById("editModal");
    const cropModal = document.getElementById("cropModal");

    if (event.target === editModal) {
      closeEdit();
    }

    if (event.target === cropModal) {
      closeCropModal();
    }

  });

  // загрузка профиля
  loadProfile();

});

async function applyCrop() {
  if (!cropState.file || !cropState.image) {
    alert("Выберите изображение");
    return;
  }

  const circleSize = 280;
  const outputSize = 400;
  const ratio = outputSize / circleSize;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const scaledWidth = cropState.image.width * cropState.scale;
  const scaledHeight = cropState.image.height * cropState.scale;

  const left = (circleSize - scaledWidth) / 2 + cropState.x;
  const top = (circleSize - scaledHeight) / 2 + cropState.y;

  ctx.drawImage(
    cropState.image,
    left * ratio,
    top * ratio,
    scaledWidth * ratio,
    scaledHeight * ratio
  );

  canvas.toBlob(async (blob) => {
    if (!blob) {
      alert("Ошибка обработки изображения");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", blob, "avatar.png");

    try {
      const res = await fetch("/upload-avatar", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error("Ошибка загрузки");
      }

      document.getElementById("avatar").src =
        data.avatar + "?t=" + Date.now();

      const editAvatar = document.getElementById("editAvatar");
      if (editAvatar) {
        editAvatar.value = data.avatar;
      }

      closeCropModal();
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки аватара");
    }
  }, "image/png");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampCropPosition() {
  if (!cropState.image) return;

  const circleSize = 280;

  const scaledWidth = cropState.image.width * cropState.scale;
  const scaledHeight = cropState.image.height * cropState.scale;

  const maxOffsetX = Math.max(0, (scaledWidth - circleSize) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - circleSize) / 2);

  cropState.x = clamp(cropState.x, -maxOffsetX, maxOffsetX);
  cropState.y = clamp(cropState.y, -maxOffsetY, maxOffsetY);
}

async function removeAvatar() {

  const defaultAvatar = "/images/default-avatar.jpg";

  try {

    const res = await fetch("/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        avatar: defaultAvatar
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Ошибка удаления аватара");
    }

    document.getElementById("avatar").src =
      defaultAvatar + "?t=" + Date.now();

    const editAvatar = document.getElementById("editAvatar");
    if (editAvatar) {
      editAvatar.value = defaultAvatar;
    }

  } catch (err) {

    console.error(err);
    alert("Не удалось удалить аватар");

  }

}

function switchTab(tab){

document.querySelectorAll(".tab-content").forEach(el=>{
el.classList.remove("active")
})

document.querySelectorAll(".tab-btn").forEach(el=>{
el.classList.remove("active")
})

if(tab==="posts"){
document.getElementById("postsTab").classList.add("active")
document.querySelectorAll(".tab-btn")[0].classList.add("active")
}

if(tab==="tracks"){
document.getElementById("tracksTab").classList.add("active")
document.querySelectorAll(".tab-btn")[1].classList.add("active")
}

if(tab==="mentions"){
document.getElementById("mentionsTab").classList.add("active")
document.querySelectorAll(".tab-btn")[2].classList.add("active")
}

}

function openSettings(){
document.getElementById("settingsModal").style.display="block"
}

function closeSettings(){
document.getElementById("settingsModal").style.display="none"
}