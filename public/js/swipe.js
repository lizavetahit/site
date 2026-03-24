const tracks = [
  {
    title: "Track 1",
    artist: "Artist 1",
    cover: "/images/cover1.jpg",
    src: "/music/track1.mp3"
  },
  {
    title: "Track 2",
    artist: "Artist 2",
    cover: "/images/cover2.jpg",
    src: "/music/track2.mp3"
  },
  {
    title: "Track 3",
    artist: "Artist 3",
    cover: "/images/cover3.jpg",
    src: "/music/track3.mp3"
  }
];

let currentTrack = 0;
let history = [];

const audio = document.getElementById("audioPlayer");
const card = document.querySelector(".track-card.active");
const bg = document.querySelector(".swipe-bg");

const playBtn = document.querySelector(".play");
const likeBtn = document.querySelector(".like");
const dislikeBtn = document.querySelector(".dislike");
const backBtn = document.querySelector(".back");

const progress = document.getElementById("progressFill");

/* ========================= */
/* 🎵 ЗАГРУЗКА ТРЕКА */
/* ========================= */

function renderTrack(index) {
  const track = tracks[index];

  card.innerHTML = `
    <div class="card-content">
      <div class="cover" style="background-image:url('${track.cover}'); background-size:cover;"></div>

      <div class="track-info">
        <h2>${track.title}</h2>
        <p class="artist">${track.artist}</p>
      </div>
    </div>
  `;

  audio.src = track.src;
}

function playTrack(index) {
  renderTrack(index);
  audio.play();
  playBtn.textContent = "⏸";
}

/* ========================= */
/* ▶ PLAY / PAUSE */
/* ========================= */

playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸";
  } else {
    audio.pause();
    playBtn.textContent = "▶";
  }
};

/* ========================= */
/* ⏪ НАЗАД */
/* ========================= */

backBtn.onclick = () => {
  if (history.length === 0) return;

  currentTrack = history.pop();
  playTrack(currentTrack);
};

/* ========================= */
/* ❤️ ЛАЙК */
/* ========================= */

likeBtn.onclick = () => swipeRight();

/* ========================= */
/* ❌ ДИЗЛАЙК */
/* ========================= */

dislikeBtn.onclick = () => swipeLeft();

/* ========================= */
/* 🔄 ПЕРЕКЛЮЧЕНИЕ */
/* ========================= */

function nextTrack() {
  history.push(currentTrack);

  currentTrack++;
  if (currentTrack >= tracks.length) currentTrack = 0;

  playTrack(currentTrack);
}

/* ========================= */
/* 👉 СВАЙПЫ */
/* ========================= */

function swipeRight() {
  saveLikedTrack();

  card.style.transform = "translateX(500px) rotate(25deg)";
  card.style.opacity = "0";

  setTimeout(() => {
    nextTrack();
    resetCard();
  }, 300);
}

function swipeLeft() {
  card.style.transform = "translateX(-500px) rotate(-25deg)";
  card.style.opacity = "0";

  setTimeout(() => {
    nextTrack();
    resetCard();
  }, 300);
}

/* ========================= */
/* ❤️ СОХРАНЕНИЕ В ПЛЕЙЛИСТ */
/* ========================= */

function saveLikedTrack() {
  let liked = JSON.parse(localStorage.getItem("likedTracks") || "[]");

  liked.push(tracks[currentTrack]);

  localStorage.setItem("likedTracks", JSON.stringify(liked));
}

/* ========================= */
/* 🖱 DRAG */
/* ========================= */

let isDragging = false;
let startX = 0;
let currentX = 0;

card.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX;
  card.style.transition = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  currentX = e.clientX - startX;

  card.style.transform = `
    translateX(${currentX}px)
    rotate(${currentX * 0.05}deg)
  `;

  let strength = Math.min(Math.abs(currentX) / 150, 1);

  bg.style.opacity = strength;

  if (currentX > 0) {
    bg.classList.add("like");
    bg.classList.remove("dislike");
  } else {
    bg.classList.add("dislike");
    bg.classList.remove("like");
  }
});

document.addEventListener("mouseup", () => {
  if (!isDragging) return;

  isDragging = false;
  card.style.transition = "0.3s";

  if (currentX > 140) swipeRight();
  else if (currentX < -140) swipeLeft();
  else resetPosition();

  bg.style.opacity = 0;
});

/* ========================= */
/* RESET */
/* ========================= */

function resetPosition() {
  card.style.transform = "translateX(0)";
}

function resetCard() {
  card.style.transition = "none";
  card.style.transform = "translateX(0)";
  card.style.opacity = "1";

  setTimeout(() => {
    card.style.transition = "0.3s";
  }, 10);
}

/* ========================= */
/* 📊 ПРОГРЕСС */
/* ========================= */

audio.addEventListener("timeupdate", () => {
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.style.width = percent + "%";
});

/* ========================= */
/* 🔊 VOLUME (оставляем как есть) */
/* ========================= */

const range = document.getElementById("volumeRange");
const icon = document.getElementById("volumeIcon");

const volumeOn = document.getElementById("volumeOn");
const volumeOff = document.getElementById("volumeOff");

let lastVolume = range.value;
let muted = false;

function updateFill() {
  range.style.setProperty("--fill", range.value + "%");
  audio.volume = range.value / 100;
}

range.addEventListener("input", () => {
  updateFill();

  if (range.value == 0) {
    muted = true;
    volumeOn.style.display = "none";
    volumeOff.style.display = "block";
  } else {
    muted = false;
    volumeOn.style.display = "block";
    volumeOff.style.display = "none";
  }
});

icon.addEventListener("click", () => {
  if (!muted) {
    lastVolume = range.value;
    range.value = 0;
    muted = true;
  } else {
    range.value = lastVolume || 70;
    muted = false;
  }

  updateFill();

  volumeOn.style.display = muted ? "none" : "block";
  volumeOff.style.display = muted ? "block" : "none";
});

/* ========================= */
/* 🚀 СТАРТ */
/* ========================= */

updateFill();
playTrack(currentTrack);