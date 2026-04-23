let currentSettingsArchiveAudio = null;
window.settingsReady = false;


function settingsGetToken() {
  return localStorage.getItem("token") || "";
}

function settingsEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function openSettings(type) {
  
  const modal = document.getElementById("settingsModal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");

  if (!modal || !title || !body) return;

  modal.style.display = "flex";

if (type === "archive") {
  title.innerText = "Архив";

  body.innerHTML = `
    <div class="settings-archive-tabs">
      <button class="settings-archive-tab settings-archive-tab-active" onclick="switchArchiveTab(event, 'posts')">
        Посты
      </button>

      <button class="settings-archive-tab" onclick="switchArchiveTab(event, 'tracks')">
        Треки
      </button>
    </div>

    <div id="archiveContent">
      Загрузка...
    </div>
  `;

  // 💣 ВАЖНО: НЕ requestAnimationFrame
  setTimeout(() => {
    const container = document.getElementById("archiveContent");

    if (!container) {
      console.log("❌ archiveContent STILL not found");
      return;
    }

    setTimeout(() => {
  if (!window.settingsReady) {
    console.log("⛔ settings not ready yet");
    return;
  }

  loadArchivePosts();
}, 100);
  }, 0);

  return;
}

  if (type === "privacy") {
    title.innerText = "Конфиденциальность";

    try {
      const token = settingsGetToken();

      const res = await fetch("/me?ts=" + Date.now(), {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!res.ok) {
        body.innerHTML = `<p>Не удалось загрузить настройки конфиденциальности</p>`;
        return;
      }

      const user = await res.json();

      
        body.innerHTML = `
<div class="privacy-section">

  <div class="privacy-block">
    <div class="privacy-title">🔐 Смена пароля</div>

    <div class="privacy-row privacy-row-inputs">
  <input id="currentPassword" type="password" placeholder="Текущий пароль" class="privacy-input">
  <input id="newPassword" type="password" placeholder="Новый пароль" class="privacy-input">
  <input id="newPassword2" type="password" placeholder="Повторите пароль" class="privacy-input">
</div>

<div class="privacy-row privacy-row-btn">
  <button onclick="changePassword()" class="privacy-btn">
    Сменить пароль
  </button>
</div>

    <p id="passwordError" class="privacy-error"></p>
    <p id="passwordSuccess" class="privacy-success"></p>
  </div>


  <div class="privacy-block">
    <div class="privacy-title">📧 Смена почты</div>

    <div class="privacy-info">
      Текущая почта: ${user.email}
    </div>

    <div class="privacy-row">
      <input id="newEmail" type="email" placeholder="Новая почта" class="privacy-input">
      <button onclick="sendEmailCode()" class="privacy-btn">
        Отправить код
      </button>
    </div>

    <div id="emailCodeBlock" style="display:none; margin-top:10px;">
      <input id="emailCode" placeholder="Код" class="privacy-input">

      <button onclick="confirmEmailChange()" class="privacy-btn" style="margin-top:10px;">
        Подтвердить
      </button>
    </div>

    <p id="emailError" class="privacy-error"></p>
    <p id="emailSuccess" class="privacy-success"></p>
  </div>

</div>
`;
      
    } catch (err) {
      console.log("openSettings privacy error:", err);
      body.innerHTML = `<p>Ошибка загрузки</p>`;
    }

    return;
  }

  if (type === "saved") {
    title.innerText = "Сохранённые";
    body.innerHTML = "<p>Сохранённые посты и треки</p>";
  }
}

function closeSettings() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.style.display = "none";
}

async function changePassword() {
  const token = settingsGetToken();

  const currentPassword = document.getElementById("currentPassword")?.value.trim();
  const newPassword = document.getElementById("newPassword")?.value.trim();
  const newPassword2 = document.getElementById("newPassword2")?.value.trim();

  const passwordError = document.getElementById("passwordError");
  const passwordSuccess = document.getElementById("passwordSuccess");

  if (passwordError) passwordError.innerText = "";
  if (passwordSuccess) passwordSuccess.innerText = "";

  if (!currentPassword) {
    if (passwordError) passwordError.innerText = "Введи текущий пароль";
    return;
  }

  if (!newPassword) {
    if (passwordError) passwordError.innerText = "Введи новый пароль";
    return;
  }

  if (newPassword.length < 8) {
    if (passwordError) passwordError.innerText = "Новый пароль должен быть минимум 8 символов";
    return;
  }

  if (newPassword !== newPassword2) {
    if (passwordError) passwordError.innerText = "Пароли не совпадают";
    return;
  }

  try {
    const res = await fetch("/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (passwordError) {
        passwordError.innerText = data.error === "Wrong password"
          ? "Неверный текущий пароль"
          : "Ошибка смены пароля";
      }
      return;
    }

    if (passwordSuccess) passwordSuccess.innerText = "Пароль изменён";

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("newPassword2").value = "";
  } catch (err) {
    console.log("changePassword error:", err);
    if (passwordError) passwordError.innerText = "Ошибка смены пароля";
  }
}

async function sendEmailCode() {
  const newEmail = document.getElementById("newEmail")?.value.trim();

  const emailError = document.getElementById("emailError");
  const emailSuccess = document.getElementById("emailSuccess");

  if (emailError) emailError.innerText = "";
  if (emailSuccess) emailSuccess.innerText = "";

  if (!newEmail) {
    if (emailError) emailError.innerText = "Введи новую почту";
    return;
  }

  if (!newEmail.includes("@")) {
    if (emailError) emailError.innerText = "Неверный формат почты";
    return;
  }

  try {
    const res = await fetch("/change-email-send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + settingsGetToken()
      },
      body: JSON.stringify({ newEmail })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (emailError) {
        emailError.innerText = data.error === "Email уже используется"
          ? "Эта почта уже занята"
          : "Не удалось отправить код";
      }
      return;
    }

    const block = document.getElementById("emailCodeBlock");
    if (block) block.style.display = "block";

    if (emailSuccess) emailSuccess.innerText = "Код отправлен на почту";
  } catch (err) {
    console.log("sendEmailCode error:", err);
    if (emailError) emailError.innerText = "Не удалось отправить код";
  }
}

async function confirmEmailChange() {
  const token = settingsGetToken();

  const newEmail = document.getElementById("newEmail")?.value.trim();
  const code = document.getElementById("emailCode")?.value.trim();

  const emailError = document.getElementById("emailError");
  const emailSuccess = document.getElementById("emailSuccess");

  if (emailError) emailError.innerText = "";
  if (emailSuccess) emailSuccess.innerText = "";

  if (!newEmail) {
    if (emailError) emailError.innerText = "Введи новую почту";
    return;
  }

  if (!code) {
    if (emailError) emailError.innerText = "Введи код из письма";
    return;
  }

  try {
    const res = await fetch("/change-email-confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        newEmail,
        code
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (emailError) {
        emailError.innerText = data.error === "Wrong code"
          ? "Неверный код"
          : "Не удалось изменить почту";
      }
      return;
    }

    if (emailSuccess) emailSuccess.innerText = "Почта изменена";

    document.getElementById("newEmail").value = "";
    document.getElementById("emailCode").value = "";

    const block = document.getElementById("emailCodeBlock");
    if (block) block.style.display = "none";
  } catch (err) {
    console.log("confirmEmailChange error:", err);
    if (emailError) emailError.innerText = "Не удалось изменить почту";
  }
}

async function setPassword() {
  const token = settingsGetToken();

  const pass1 = document.getElementById("newPassword")?.value.trim();
  const pass2 = document.getElementById("newPassword2")?.value.trim();

  const error = document.getElementById("privacyError");
  if (error) error.innerText = "";

  if (!pass1) {
    if (error) error.innerText = "Введи пароль";
    return;
  }

  if (pass1.length < 8) {
    if (error) error.innerText = "Пароль должен быть минимум 8 символов";
    return;
  }

  if (pass1 !== pass2) {
    if (error) error.innerText = "Пароли не совпадают";
    return;
  }

  try {
    const res = await fetch("/set-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        password: pass1
      })
    });

    if (!res.ok) {
      if (error) error.innerText = "Ошибка";
      return;
    }

    openSettings("privacy");
  } catch (err) {
    console.log("setPassword error:", err);
    if (error) error.innerText = "Ошибка";
  }
}

async function loadArchivePosts() {
  console.log("🔥 loadArchivePosts called");
  const token = settingsGetToken();
  const container = document.getElementById("archiveContent");

  if (!container) return;

  container.innerHTML = "Загрузка...";

  try {
    const res = await fetch("/archived-posts", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      throw new Error("archived-posts failed");
    }

    const posts = await res.json();

    if (!posts.length) {
      container.innerHTML = "<p>Архив постов пуст</p>";
      return;
    }

    container.innerHTML = `
    <h3 class="archive-title">Посты</h3>
      <div class="settings-archive-grid">
        ${posts.map((p) => {
          const date = new Date(p.created_at);
          const formattedDate = date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });

          return `
            <div class="settings-archive-card" onclick='openPost(${JSON.stringify(p).replace(/'/g, "&apos;")})'>
              ${p.media_url ? `
                ${
                  p.media_type === "image"
                    ? `<img src="${settingsEscapeHtml(p.media_url)}" alt="">`
                    : `<video src="${settingsEscapeHtml(p.media_url)}" muted></video>`
                }
              ` : `<div class="settings-no-media">Текст</div>`}

              <div class="settings-archive-overlay">
                <div class="settings-archive-date">${formattedDate}</div>

                <button onclick="event.stopPropagation(); unarchivePost(${Number(p.id)})">
                  Вернуть
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } catch (err) {
    console.log("loadArchivePosts error:", err);
    container.innerHTML = "Ошибка загрузки";
  }
}

async function unarchivePost(id) {
  const token = settingsGetToken();

  await fetch(`/archive-post/${id}`, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadArchivePosts();
}
function setViewPostMode(open) {
  document.body.classList.toggle("view-post-open", open);
}

function openPost(post) {
  const modal = document.getElementById("viewPostModal");
  const body = document.getElementById("viewPostBody");

  if (!modal || !body) return;

  setViewPostMode(true);
  modal.style.display = "flex";

  body.innerHTML = `
    <div class="view-post-wrapper">
     

      <div class="view-post">
        <div class="view-post-header">
          <img
            src="${settingsEscapeHtml(post.avatar || "/images/default-avatar.jpg")}"
            class="view-post-avatar"
            alt=""
          >
          <div class="view-post-username">${settingsEscapeHtml(post.username || "")}</div>
        </div>

        ${
          post.media_url
            ? post.media_type === "image"
              ? `<img src="${settingsEscapeHtml(post.media_url)}" class="view-post-media" alt="">`
              : `<video src="${settingsEscapeHtml(post.media_url)}" controls class="view-post-media"></video>`
            : ""
        }

        ${
          post.content
            ? `<div class="view-post-description">${settingsEscapeHtml(post.content)}</div>`
            : ""
        }

        <div class="view-post-date">
          ${post.created_at ? new Date(post.created_at).toLocaleString("ru-RU") : ""}
        </div>
      </div>
    </div>
  `;
}

function closeViewPost() {
  const modal = document.getElementById("viewPostModal");
  const body = document.getElementById("viewPostBody");

  if (modal) modal.style.display = "none";
  if (body) body.innerHTML = "";

  setViewPostMode(false);
}

function switchArchiveTab(e, type) {
  document.querySelectorAll(".settings-archive-tab").forEach((btn) => {
    btn.classList.remove("settings-archive-tab-active");
  });

  e.currentTarget.classList.add("settings-archive-tab-active");

  if (type === "posts") {
    loadArchivePosts();
  } else {
    loadArchiveTracks();
  }
}

async function loadArchiveTracks() {
  const token = settingsGetToken();
  const container = document.getElementById("archiveContent");
  if (!container) return;

  container.innerHTML = "Загрузка...";

  try {
    const res = await fetch("/archived-tracks", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      throw new Error("archived-tracks failed");
    }

    const tracks = await res.json();

    if (!tracks.length) {
      container.innerHTML = "<p>Архив треков пуст</p>";
      return;
    }

    container.innerHTML = `
    <h3 class="archive-title">Треки</h3>
      <div class="settings-archive-tracks">
        ${tracks.map((t) => `
          <div class="settings-archive-track">
            <img
              src="${settingsEscapeHtml(t.cover || "/images/default-cover.jpg")}"
              class="settings-archive-track-cover"
              alt=""
            >

            <div class="settings-archive-track-info">
              <div class="settings-archive-track-title">${settingsEscapeHtml(t.title || "Без названия")}</div>
              <div class="settings-archive-track-artist">${settingsEscapeHtml(t.artist || "Unknown")}</div>

              <div class="settings-track-player" data-id="${Number(t.id)}">
                <button class="settings-play-btn" onclick="toggleArchiveTrack(${Number(t.id)})">
                  ▶
                </button>

                <div class="settings-track-progress" onclick="seekTrack(event, ${Number(t.id)})">
                  <div class="settings-track-progress-fill" id="progress-${Number(t.id)}"></div>
                </div>

                <span class="settings-track-time" id="time-${Number(t.id)}">0:00</span>

                <div class="settings-volume">
                  <button onclick="toggleMute(${Number(t.id)})" class="settings-volume-btn" id="volbtn-${Number(t.id)}">
                    🔊
                  </button>

                  <div class="settings-volume-slider" onclick="setVolume(event, ${Number(t.id)})">
                    <div class="settings-volume-fill" id="volume-${Number(t.id)}"></div>
                  </div>
                </div>

                <audio id="audio-${Number(t.id)}" src="${settingsEscapeHtml(t.audio || "")}"></audio>
              </div>
            </div>

            <div class="settings-archive-track-actions">
              <button class="settings-archive-restore-btn" onclick="unarchiveTrack(${Number(t.id)})">
                Вернуть
              </button>

              <button class="settings-archive-delete-btn" onclick="deleteArchiveTrack(${Number(t.id)})">
                Удалить
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    console.log("loadArchiveTracks error:", err);
    container.innerHTML = "Ошибка загрузки";
  }
}

async function unarchiveTrack(id) {
  const token = settingsGetToken();

  await fetch(`/archive-track/${id}`, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadArchiveTracks();
}

function toggleArchiveTrack(id) {
  const audio = document.getElementById(`audio-${id}`);
  const btn = document.querySelector(`[data-id="${id}"] .settings-play-btn`);
  if (!audio || !btn) return;

  if (currentSettingsArchiveAudio && currentSettingsArchiveAudio !== audio) {
    currentSettingsArchiveAudio.pause();
    document.querySelectorAll(".settings-play-btn").forEach((b) => {
      b.innerText = "▶";
    });
  }

  if (audio.paused) {
    audio.play();
    btn.innerText = "⏸";
    currentSettingsArchiveAudio = audio;
  } else {
    audio.pause();
    btn.innerText = "▶";
  }

  audio.ontimeupdate = () => {
    const progress = document.getElementById(`progress-${id}`);
    const time = document.getElementById(`time-${id}`);
    if (!progress || !time) return;

    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.style.width = percent + "%";
    time.innerText = formatTime(audio.currentTime);
  };

  audio.onended = () => {
    btn.innerText = "▶";
    const progress = document.getElementById(`progress-${id}`);
    const time = document.getElementById(`time-${id}`);
    if (progress) progress.style.width = "0%";
    if (time) time.innerText = "0:00";
  };
}

function formatTime(sec) {
  if (!sec || !Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

function setVolume(e, id) {
  const slider = e.currentTarget;
  const audio = document.getElementById(`audio-${id}`);
  const fill = document.getElementById(`volume-${id}`);
  if (!slider || !audio || !fill) return;

  const rect = slider.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;

  audio.volume = Math.max(0, Math.min(1, percent));
  fill.style.width = (audio.volume * 100) + "%";
  settingsVolumeMemory[id] = audio.volume;

  const btn = document.getElementById(`volbtn-${id}`);
  if (btn) btn.innerText = audio.volume > 0 ? "🔊" : "🔇";
}

function toggleMute(id) {
  const audio = document.getElementById(`audio-${id}`);
  const btn = document.getElementById(`volbtn-${id}`);
  const fill = document.getElementById(`volume-${id}`);
  if (!audio || !btn || !fill) return;

  if (audio.volume > 0) {
    settingsVolumeMemory[id] = audio.volume;
    audio.volume = 0;
    btn.innerText = "🔇";
  } else {
    audio.volume = settingsVolumeMemory[id] || 0.7;
    btn.innerText = "🔊";
  }

  fill.style.width = (audio.volume * 100) + "%";
}

function seekTrack(e, id) {
  const bar = e.currentTarget;
  const audio = document.getElementById(`audio-${id}`);
  if (!bar || !audio || !audio.duration) return;

  const rect = bar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = Math.max(0, Math.min(audio.duration, percent * audio.duration));
}

async function deleteArchiveTrack(id) {
  const ok = confirm("Удалить трек навсегда?");
  if (!ok) return;

  const res = await fetch(`/delete-track/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + settingsGetToken()
    }
  });

  if (!res.ok) {
    alert("Ошибка удаления");
    return;
  }

  loadArchiveTracks();
}

function logout() {
  localStorage.removeItem("token");
  navigate("/login");
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.changePassword = changePassword;
window.sendEmailCode = sendEmailCode;
window.confirmEmailChange = confirmEmailChange;
window.setPassword = setPassword;
window.loadArchivePosts = loadArchivePosts;
window.unarchivePost = unarchivePost;
window.openPost = openPost;
window.closeViewPost = closeViewPost;
window.switchArchiveTab = switchArchiveTab;
window.loadArchiveTracks = loadArchiveTracks;
window.unarchiveTrack = unarchiveTrack;
window.toggleArchiveTrack = toggleArchiveTrack;
window.setVolume = setVolume;
window.toggleMute = toggleMute;
window.seekTrack = seekTrack;
window.deleteArchiveTrack = deleteArchiveTrack;
window.logout = logout;

window.initSettingsPage = function () {
  const root = document.querySelector(".settings-page");
  if (!root) {
    console.log("❌ settings page not found");
    return;
  }

  if (!settingsGetToken()) {
    navigate("/login");
    return;
  }

  setViewPostMode(false);

  const settingsModal = document.getElementById("settingsModal");
  const viewPostModal = document.getElementById("viewPostModal");

  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        closeSettings();
      }
    });
  }

  if (viewPostModal) {
    viewPostModal.addEventListener("click", (e) => {
      if (e.target === viewPostModal) {
        closeViewPost();
      }
    });
  }
  window.settingsReady = true;
console.log("✅ settingsReady = true");
  
};