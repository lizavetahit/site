console.log("NAVBAR JS LOADED");

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
  // 🔥 ждём пока navbar точно появится
  requestAnimationFrame(() => {
    const navbar = document.querySelector(".navbar");

    if (navbar) {
      navbar.classList.add("auth-navbar");
    }
  });
}

if (!isAuthPage) {
  initSearch();
} else {
  // скрываем поиск
  const search = document.querySelector(".nav-search");
  search?.classList.add("hidden");
}

    await loadNavbarUser();
    initDropdown();
  } catch (err) {
    console.error("Navbar load error:", err);
  }
  loadQueueStatus(); // 🔥 ВАЖНО
setInterval(loadQueueStatus, 5000);
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
    if(user.role === "admin"){
  document.getElementById("adminPanelBtn")?.classList.remove("hidden")
}

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
function initSearch(){
  const path = window.location.pathname;
const isAuthPage = path.includes("login") || path.includes("register");


  const input = document.getElementById("globalSearch")
  const results = document.getElementById("searchResults")

  if(!input || !results) return

  let timeout

  input.addEventListener("input", () => {

    clearTimeout(timeout)

    const q = input.value.trim()

    if(!q){
      results.style.display = "none"
      return
    }

    timeout = setTimeout(async () => {

      const res = await fetch(`/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      const items = []

      // users
      data.users.forEach(u=>{
  items.push(`
    <div class="search-item user-item" onclick="goToUserProfile(${u.id})">
      
      <img class="search-avatar" src="${u.avatar || '/images/default-avatar.jpg'}">

      <div class="search-info">
        <div class="search-name">${u.username || "No name"}</div>
        <div class="search-tag">@${u.username_tag || ""}</div>
      </div>

    </div>
  `)
})

      // tracks
      data.tracks.forEach(t=>{
  items.push(`
  <div class="search-item track-item">

    <div class="track-cover-wrap">
      <img
        class="track-cover-img"
        src="${t.cover || '/images/default-avatar.jpg'}"
        alt="cover"
      >

      <button
        type="button"
        class="track-play"
        onclick="event.stopPropagation(); playPreview(this, '${t.audio || ""}', '${t.soundcloud || ""}')"
      >
        <span class="track-play-circle">
          <span class="play-icon"></span>
          <span class="pause-icon">
            <span></span>
            <span></span>
          </span>
        </span>
      </button>
    </div>

    <div class="search-info">
      <div class="search-name">${t.title}</div>
      <div class="search-tag">${t.artist || "Unknown"}</div>
    </div>

  </div>
`)
})

      if(items.length === 0){
        results.innerHTML = `<div class="search-item">Ничего не найдено</div>`
      }else{
        results.innerHTML = items.join("")
      }

      results.style.display = "block"

    }, 300)

  })

  document.addEventListener("click", (e)=>{
    if(!e.target.closest(".nav-search")){
      results.style.display = "none"
    }
  })

}

function goToUserProfile(id){
  window.location.href = `/html/profile.html?id=${id}`
}

let currentAudio = null;
let currentButton = null;
let scWidget = null;

function resetPlayButtons() {
  document.querySelectorAll(".track-play").forEach(btn => {
    btn.classList.remove("active");
  });
}

function stopCurrentPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if (scWidget) {
    try {
      scWidget.pause();
    } catch (e) {}
  }

  resetPlayButtons();
  currentButton = null;
}

function playPreview(button, audio, soundcloud) {
  if (!button) return;

  const clickedSameButton =
    currentButton === button && button.classList.contains("active");

  if (clickedSameButton) {
    if (window.stopGlobalTrack) {
      window.stopGlobalTrack();
    } else {
      stopCurrentPlayback();
    }
    return;
  }

  document.querySelectorAll(".track-play").forEach(b => {
    if (b !== button) b.classList.remove("active");
  });

  const trackItem = button.closest(".track-item");
  const title =
    trackItem?.querySelector(".search-name")?.textContent?.trim() || "Unknown track";
  const artist =
    trackItem?.querySelector(".search-tag")?.textContent?.trim() || "Unknown artist";
  const cover =
    trackItem?.querySelector(".track-cover-img")?.src ||
    trackItem?.querySelector(".track-cover-wrap img")?.src ||
    "/images/default-avatar.jpg";

  const fullSrc = audio
    ? (audio.startsWith("http") ? audio : window.location.origin + audio)
    : "";

  if (window.playTrackGlobal) {
    window.playTrackGlobal({
      title,
      artist,
      cover,
      audioSrc: fullSrc,
      soundcloud
    });

    button.classList.add("active");
    currentButton = button;
    return;
  }

  stopCurrentPlayback();

  if (audio) {
    currentAudio = new Audio(fullSrc);

    currentAudio.play().then(() => {
      button.classList.add("active");
      currentButton = button;
    }).catch(err => {
      console.log("Audio play error:", err);
    });

    currentAudio.onended = () => {
      stopCurrentPlayback();
    };

    return;
  }

  if (soundcloud) {
    if (typeof SC === "undefined" || !SC.Widget) {
      window.open(soundcloud, "_blank");
      return;
    }

    let container = document.getElementById("sc-player");

    if (!container) {
      container = document.createElement("div");
      container.id = "sc-player";
      container.style.display = "none";
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <iframe id="sc-frame"
        width="0"
        height="0"
        allow="autoplay"
        frameborder="no"
        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloud)}&auto_play=true">
      </iframe>
    `;

    const iframe = document.getElementById("sc-frame");
    scWidget = SC.Widget(iframe);

    scWidget.bind(SC.Widget.Events.READY, () => {
      scWidget.play();
      button.classList.add("active");
      currentButton = button;
    });

    scWidget.bind(SC.Widget.Events.FINISH, () => {
      stopCurrentPlayback();
    });
  }
}

function goToAdmin(){
  window.location.href = "/html/admin.html"
}
window.goToAdmin = goToAdmin

async function loadQueueStatus() {
  try {
    const res = await fetch("/api/queue/state");
    const data = await res.json();

    const dot = document.getElementById("queueStatus");
    if (!dot) return;

    dot.classList.remove("active", "closed");

    if (data.state === "open") {
      dot.classList.add("active"); // 🟢
    } else {
      dot.classList.add("closed"); // 🔴 paused или closed
    }

  } catch (err) {
    console.error("Queue status error:", err);
  }
}