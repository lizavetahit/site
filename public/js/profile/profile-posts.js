
let postViewTimers = new Map();
let postViewsObserver = null;

async function loadPosts() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const meRes = await fetch("/me", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!meRes.ok) return;
    const me = await meRes.json();

    const params = new URLSearchParams(window.location.search);
    const tag = window.__profileTag || params.get("tag");

    let url;
    if (!tag) {
      url = "/my-posts";
    } else {
      url = "/posts?tag=" + tag;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      console.error("Ошибка загрузки постов");
      return;
    }

    const posts = await res.json();
    window.currentPosts = posts;

    const container = document.getElementById("postsContainer");
    if (!container) return;

    container.innerHTML = "";

    const isMyProfile = !tag || tag === me.username_tag;

    posts.forEach((post) => {
      let mediaHTML = "";

      if (post.media_type === "image") {
        mediaHTML = `
          <div class="post-media-wrapper">
            <img src="${post.media_url}" class="post-media">
          </div>
        `;
      }

      if (post.media_type === "video") {
        mediaHTML = `
          <div class="post-media-wrapper video-player">
            <video class="video-element" preload="metadata">
              <source src="${post.media_url}">
            </video>

            <div class="video-overlay">
              <i class="fa-solid fa-play"></i>
            </div>

            <div class="video-ui">
              <div class="video-progress">
                <div class="video-progress-bar"></div>
              </div>

              <div class="video-controls">
                <button class="video-btn play-btn">
                  <i class="fa-solid fa-play"></i>
                </button>

                <div class="video-time">
                  <span class="current">0:00</span>
                  /
                  <span class="duration">0:00</span>
                </div>

                <div class="video-spacer"></div>

                <button class="video-btn mute-btn">
                  <i class="fa-solid fa-volume-high"></i>
                </button>

                <input class="volume" type="range" min="0" max="1" step="0.05" value="1">

                <button class="video-btn fullscreen-btn">
                  <i class="fa-solid fa-expand"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }

      container.innerHTML += `
        <div class="post-card" data-post-id="${post.id}">
          <div class="post-header">
            <div class="post-user">
              <img src="${post.avatar || "/images/default-avatar.jpg"}" class="post-avatar">

              <div class="post-user-info">
                <div class="post-username">${post.username || "User"}</div>
                <div class="post-date">${post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}</div>
              </div>
            </div>

            ${isMyProfile ? `
              <div class="post-menu-container">
                <button class="post-menu-btn" onclick="togglePostMenu(${post.id})">
                  <i class="fa-solid fa-ellipsis"></i>
                </button>

                <div id="postMenu-${post.id}" class="post-menu profile-hidden">
                  <button class="danger" onclick="deletePost(${post.id})">
                    <i class="fa-solid fa-trash"></i>
                    Удалить
                  </button>

                  <button onclick="editPost(${post.id})">
                    <i class="fa-solid fa-pen"></i>
                    Редактировать
                  </button>

                  <button onclick="archivePost(${post.id})">
                    <i class="fa-solid fa-box-archive"></i>
                    Архив
                  </button>

                  <button onclick="pinPost(${post.id})">
                    <i class="fa-solid fa-thumbtack"></i>
                    Закрепить
                  </button>
                </div>
              </div>
            ` : ""}
          </div>

          <div class="post-text">
            <p>${post.content || ""}</p>
          </div>

          ${mediaHTML ? mediaHTML : ""}

          <div class="post-stats">
            <div class="post-stat-item">
              <i class="fa-regular fa-eye"></i>
              <span class="post-views-count" id="post-views-${post.id}">${Number(post.views_count) || 0}</span>
            </div>
          </div>
        </div>
      `;
    });

    document.querySelectorAll(".volume").forEach((slider) => {
      updateVolumeSlider(slider);
    });

    const players = document.querySelectorAll(".video-player");
    if (players.length) {
      players.forEach((player) => {
        const video = player.querySelector("video");
        const slider = player.querySelector(".volume");

        if (video && slider) {
          video.volume = slider.value;
        }
      });
    }

    const videos = document.querySelectorAll(".video-element");
    if (videos.length) {
      videos.forEach((video) => {
        if (video) videoObserver.observe(video);
      });
    }

    initPostViewsObserver();
  } catch (err) {
    console.error("loadPosts error", err);
  }
}

async function registerPostView(postId) {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`/api/posts/${postId}/view`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) return;

    const data = await res.json();
    const countEl = document.getElementById(`post-views-${postId}`);

    if (countEl && typeof data.views_count !== "undefined") {
      countEl.innerText = Number(data.views_count) || 0;
    }
  } catch (err) {
    console.error("registerPostView error", err);
  }
}

function clearPostViewTimer(postId) {
  if (!postViewTimers.has(postId)) return;
  clearTimeout(postViewTimers.get(postId));
  postViewTimers.delete(postId);
}

function initPostViewsObserver() {
  if (postViewsObserver) {
    postViewsObserver.disconnect();
  }

  postViewsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const card = entry.target;
      const postId = card.dataset.postId;

      if (!postId || card.dataset.viewSent === "true") return;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        if (postViewTimers.has(postId)) return;

        const timer = setTimeout(() => {
          card.dataset.viewSent = "true";
          registerPostView(postId);
          clearPostViewTimer(postId);
          postViewsObserver.unobserve(card);
        }, 1500);

        postViewTimers.set(postId, timer);
      } else {
        clearPostViewTimer(postId);
      }
    });
  }, {
    threshold: [0.25, 0.6, 0.8]
  });

  document.querySelectorAll(".post-card[data-post-id]").forEach((card) => {
    if (card.dataset.viewSent === "true") return;
    postViewsObserver.observe(card);
  });
}

const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target;

    if (!entry.isIntersecting) {
      video.pause();
    }
  });
}, {
  threshold: 0.4
});

function togglePostMenu(id) {
  const menu = document.getElementById("postMenu-" + id);
  if (!menu) return;

  const isOpen = !menu.classList.contains("profile-hidden");

  document.querySelectorAll(".post-menu").forEach((m) => {
    m.classList.add("profile-hidden");
  });

  if (!isOpen) {
    menu.classList.remove("profile-hidden");
  }

  document.querySelectorAll(".post-card").forEach((p) => {
    p.classList.remove("active");
  });

  const card = menu.closest(".post-card");
  if (card) {
    card.classList.add("active");
  }
}

async function deletePost(id) {
  const confirmDelete = confirm("Удалить публикацию?");
  if (!confirmDelete) return;

  try {
    const res = await fetch("/delete-post/" + id, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      alert("Ошибка удаления");
      return;
    }

    loadPosts();
  } catch (err) {
    console.error(err);
    alert("Ошибка удаления");
  }
}

function pinPost(id) {
  alert("Функция закрепления будет добавлена на сервере");
}

async function archivePost(id) {
  try {
    const res = await fetch("/archive-post/" + id, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      alert("Ошибка архивации");
      return;
    }

    loadPosts();
  } catch (err) {
    console.error(err);
    alert("Ошибка архивации");
  }
}

function editPost(id) {
  const post = window.currentPosts?.find((p) => p.id === id);
  if (!post) return;

  const modal = document.getElementById("postModal");
  if (!modal) return;

  modal.dataset.editId = id;

  const title = document.querySelector(".profile-post-modal-title");
  if (title) {
    title.innerText = "Редактировать публикацию";
  }

  const text = document.getElementById("postText");
  if (text) {
    text.value = post.content || "";
  }

  if (post.media_type === "image") {
    loadImageFromUrl(post.media_url);
  }

  if (post.media_type === "video") {
    loadVideoFromUrl(post.media_url);
  }

  openPostModal();
}

function initPosts() {
  const container = document.getElementById("postsContainer");
  if (!container) return;

  if (container.dataset.postsInitialized === "true") return;
  container.dataset.postsInitialized = "true";

  loadPosts();
}

document.addEventListener("click", function (e) {
  const player = e.target.closest(".video-player");
  if (!player) return;

  const video = player.querySelector("video");
  const playIcon = player.querySelector(".play-btn i");

  if (
    e.target.closest(".play-btn") ||
    e.target.closest(".video-overlay") ||
    e.target.tagName === "VIDEO"
  ) {
    if (video.paused) {
      video.play();
      player.classList.add("playing");
      playIcon.className = "fa-solid fa-pause";
    } else {
      video.pause();
      player.classList.remove("playing");
      playIcon.className = "fa-solid fa-play";
    }
  }
});

document.addEventListener("timeupdate", function (e) {
  if (e.target.tagName !== "VIDEO") return;

  const video = e.target;
  const player = video.closest(".video-player");
  if (!player) return;

  const bar = player.querySelector(".video-progress-bar");
  if (!bar) return;

  const current = player.querySelector(".current");
  const duration = player.querySelector(".duration");

  if (video.duration) {
    bar.style.width = (video.currentTime / video.duration * 100) + "%";

    const cm = Math.floor(video.currentTime / 60);
    const cs = Math.floor(video.currentTime % 60).toString().padStart(2, "0");
    current.textContent = cm + ":" + cs;

    const dm = Math.floor(video.duration / 60);
    const ds = Math.floor(video.duration % 60).toString().padStart(2, "0");
    duration.textContent = dm + ":" + ds;
  }
}, true);

document.addEventListener("click", function (e) {
  const progress = e.target.closest(".video-progress");
  if (!progress) return;

  const player = progress.closest(".video-player");
  const video = player.querySelector("video");

  const rect = progress.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;

  video.currentTime = percent * video.duration;
});

document.addEventListener("input", function (e) {
  if (!e.target.classList.contains("volume")) return;

  const slider = e.target;
  const player = slider.closest(".video-player");
  const video = player.querySelector("video");

  video.volume = slider.value;
  updateVolumeSlider(slider);
});

document.addEventListener("click", function (e) {
  if (!e.target.closest(".fullscreen-btn")) return;

  const player = e.target.closest(".video-player");

  if (!document.fullscreenElement) {
    player.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

let hideTimer = null;

document.addEventListener("mousemove", function (e) {
  const player = e.target.closest(".video-player");
  if (!player) return;

  player.classList.remove("hide-ui");

  clearTimeout(hideTimer);

  hideTimer = setTimeout(() => {
    player.classList.add("hide-ui");
  }, 2000);
});

document.addEventListener("pause", function (e) {
  if (e.target.tagName !== "VIDEO") return;

  const player = e.target.closest(".video-player");
  if (player) {
    player.classList.remove("hide-ui");
  }
}, true);

function updateVolumeSlider(slider) {
  const percent = slider.value * 100;

  slider.style.background = `linear-gradient(
    90deg,
    #8b5cf6 0%,
    #8b5cf6 ${percent}%,
    rgba(255,255,255,.25) ${percent}%,
    rgba(255,255,255,.25) 100%
  )`;
}

document.addEventListener("play", function (e) {
  if (e.target.tagName !== "VIDEO") return;

  const video = e.target;
  const player = video.closest(".video-player");
  if (!player) return;

  const icon = player.querySelector(".play-btn i");

  player.classList.add("playing");
  icon.className = "fa-solid fa-pause";
}, true);

document.addEventListener("pause", function (e) {
  if (e.target.tagName !== "VIDEO") return;

  const video = e.target;
  const player = video.closest(".video-player");
  if (!player) return;

  const icon = player.querySelector(".play-btn i");

  player.classList.remove("playing");
  icon.className = "fa-solid fa-play";
}, true);

document.addEventListener("click", function (e) {
  if (!e.target.closest(".post-menu-container")) {
    document.querySelectorAll(".post-menu").forEach((menu) => {
      menu.classList.add("profile-hidden");
    });
  }
});

window.togglePostMenu = togglePostMenu;
window.deletePost = deletePost;
window.archivePost = archivePost;
window.editPost = editPost;
window.initPosts = initPosts;

function loadImageFromUrl(url) {
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const file = new File([blob], "image-from-server.jpg", { type: blob.type });
      handleSelectedFile(file);
    })
    .catch((err) => console.error("loadImageFromUrl error", err));
}

function loadVideoFromUrl(url) {
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const file = new File([blob], "video-from-server.mp4", { type: blob.type });
      handleSelectedFile(file);
    })
    .catch((err) => console.error("loadVideoFromUrl error", err));
}