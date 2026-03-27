const params = new URLSearchParams(window.location.search);
const trackId = params.get("id");

const criteria = [
  { key: "rhymes_avg", label: "Рифмы и образы" },
  { key: "structure_avg", label: "Структура и ритмика" },
  { key: "style_avg", label: "Реализация стиля" },
  { key: "charisma_avg", label: "Индивидуальность и харизма" },
  { key: "vibe_avg", label: "Атмосфера и вайб" },
  { key: "memory_avg", label: "Запоминаемость" }
];

const audio = document.getElementById("trackAudio");
const playBtn = document.getElementById("playBtn");
const progress = document.getElementById("progress");
const progressWrap = document.getElementById("progressWrap");
const currentTimeEl = document.getElementById("current");
const durationEl = document.getElementById("duration");
const volume = document.getElementById("volume");
const mp3Player = document.getElementById("mp3Player");
const scWrapper = document.getElementById("scWrapper");
const soundcloudIframe = document.getElementById("soundcloudPlayer");

let isMP3 = false;
let scWidget = null;
let scIsPlaying = false;
let scReady = false;

function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

function resetPlayerUI() {
  playBtn.classList.remove("playing");
  progress.style.width = "0%";
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
}

function showMP3Player() {
  mp3Player.style.display = "flex";
  scWrapper.style.display = "none";
  isMP3 = true;
  scIsPlaying = false;
}

function showSCPlayer() {
  mp3Player.style.display = "none";
  scWrapper.style.display = "block";
  isMP3 = false;
  scIsPlaying = false;
  scReady = false;

  audio.pause();
  audio.src = "";
  resetPlayerUI();
}

function initSoundCloud(url) {
  scReady = false;
  scIsPlaying = false;

  soundcloudIframe.src =
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}` +
    `&color=%23b07497&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`;

  scWidget = SC.Widget(soundcloudIframe);

  scWidget.bind(SC.Widget.Events.READY, () => {
    scReady = true;
    progress.style.width = "0%";
    currentTimeEl.textContent = "0:00";

    scWidget.setVolume(Math.round(Number(volume.value) * 100));

    scWidget.getDuration((ms) => {
      durationEl.textContent = formatTime(ms / 1000);
    });

    if (window.scInterval) clearInterval(window.scInterval);

    window.scInterval = setInterval(() => {
      if (!scWidget || !scReady) return;

      scWidget.getPosition((pos) => {
        scWidget.getDuration((dur) => {
          if (!dur) return;

          const percent = (pos / dur) * 100;
          progress.style.width = percent + "%";
          currentTimeEl.textContent = formatTime(pos / 1000);
        });
      });
    }, 300);
  });

  scWidget.bind(SC.Widget.Events.PLAY, () => {
    scIsPlaying = true;
    playBtn.classList.add("playing");
    document.getElementById("playerCover")?.classList.add("playing");
  });

  scWidget.bind(SC.Widget.Events.PAUSE, () => {
    scIsPlaying = false;
    playBtn.classList.remove("playing");
    document.getElementById("playerCover")?.classList.remove("playing");
  });

  scWidget.bind(SC.Widget.Events.FINISH, () => {
    scIsPlaying = false;
    playBtn.classList.remove("playing");
    progress.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    document.getElementById("playerCover")?.classList.remove("playing");
  });
}

playBtn.addEventListener("click", () => {
  if (isMP3) {
    if (!audio.src) return;
    if (audio.paused) audio.play();
    else audio.pause();
    return;
  }

  if (!scWidget || !scReady) return;
  if (scIsPlaying) scWidget.pause();
  else scWidget.play();
});

audio.addEventListener("play", () => {
  playBtn.classList.add("playing");
  document.getElementById("playerCover")?.classList.add("playing");
});

audio.addEventListener("pause", () => {
  playBtn.classList.remove("playing");
  document.getElementById("playerCover")?.classList.remove("playing");
});

audio.addEventListener("ended", () => {
  playBtn.classList.remove("playing");
  progress.style.width = "0%";
  currentTimeEl.textContent = "0:00";
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.style.width = percent + "%";
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

progressWrap.addEventListener("click", (e) => {
  const rect = progressWrap.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percent = clickX / rect.width;

  if (isMP3) {
    if (!audio.duration) return;
    audio.currentTime = percent * audio.duration;
    return;
  }

  if (scWidget) {
    scWidget.getDuration((durationMs) => {
      if (!durationMs) return;
      scWidget.seekTo(percent * durationMs);
    });
  }
});

volume.value = 0.5;
audio.volume = 0.5;

volume.addEventListener("input", () => {
  const value = Number(volume.value);
  audio.volume = value;
  if (scWidget) scWidget.setVolume(value * 100);

  const percent = value * 100;
  volume.style.setProperty("--vol", percent + "%");
});

function renderCriteria(track) {
  const container = document.getElementById("criteriaList");
  container.innerHTML = "";

  criteria.forEach((c) => {
    const value = Number(track[c.key] || 0);
    let percent;

if (c.key === "vibe_avg" || c.key === "memory_avg") {
  percent = (value / 5) * 100; // 👈 максимум 5
} else {
  percent = (value / 10) * 100; // 👈 максимум 10
}

percent = Math.max(0, Math.min(100, percent));

    const row = document.createElement("div");
    row.className = "criterion-row";

    row.innerHTML = `
      <div class="criterion-title">${c.label}</div>
      <div class="criterion-bar">
        <div class="criterion-fill" style="width:${percent}%"></div>
      </div>
      <div class="criterion-value">${value ? (Math.round(value * 10) / 10).toFixed(1) : "—"}
      </div>
    `;

    container.appendChild(row);
  });
}



async function loadTrack() {
  try {
    const res = await fetch(`/api/tracks/${trackId}`);
    if (!res.ok) throw new Error("track load failed");

    const track = await res.json();

    document.getElementById("trackName").textContent = track.title || "Без названия";
    document.getElementById("trackArtist").textContent = track.artist || "Неизвестный артист";
    document.getElementById("trackCover").src = track.cover || "/images/cover-placeholder.jpg";

    const judgeScore = track.judge_score;

document.getElementById("judgeScore").textContent =
  judgeScore ? Number(judgeScore).toFixed(1) : "—";
    const userScore = track.user_score;

document.getElementById("userScore").textContent =
  userScore ? Number(userScore).toFixed(1) : "—";
    document.getElementById("likes").textContent = track.likes || 0;
    document.getElementById("dislikes").textContent = track.dislikes || 0;

    document.getElementById("playerCover").src = track.cover || "/images/cover-placeholder.jpg";
    document.getElementById("playerTitle").textContent = track.title || "Без названия";
    document.getElementById("playerArtist").textContent = track.artist || "Неизвестный артист";

    renderCriteria(track);
    resetPlayerUI();

    if (track.audio && track.audio !== "null") {
      showMP3Player();
      audio.src = track.audio;
      audio.load();
    } else if (track.soundcloud) {
      showSCPlayer();
      initSoundCloud(track.soundcloud);
    } else {
      mp3Player.style.display = "none";
      scWrapper.style.display = "none";
    }

  } catch (err) {
    console.error("Ошибка загрузки трека:", err);
  }
}

loadTrack();


async function initJudgeHover() {
  const container = document.getElementById("judgeHover");
  const rows = document.getElementById("judgeRows");

  if (!container || !rows) return;

  let loaded = false;

  container.addEventListener("mouseenter", async () => {
    if (loaded) return;

    try {
      const res = await fetch(`/api/tracks/${trackId}/judges`);
      const judges = await res.json();

      rows.innerHTML = "";

      if (!judges || !judges.length) {
  rows.innerHTML = "<div style='padding:10px'>Нет оценок</div>";
  return;
}

  


// 👉 рендер
function safe(v) {
  const num = Number(v);
  return isNaN(num) ? 0 : num;
}

function getClass(v) {
  if (v >= 8.5) return "judge-cell high";
  if (v >= 7) return "judge-cell mid";
  return "judge-cell low";
}

// 👉 нормализуем данные
const prepared = judges.map(j => {
  const rhymes = safe(j.rhymes);
  const structure = safe(j.structure);
  const style = safe(j.style);
  const charisma = safe(j.charisma);
  const vibe = safe(j.vibe);
  const memory = safe(j.memory);

  const base = rhymes + structure + style + charisma;

const k1 = 1 + vibe * 0.1;
const k2 = 1 + memory * 0.1;

const total = Math.round(base * k1 * k2 * 1.111111);

  return {
  username: j.username,
  rhymes,
  structure,
  style,
  charisma,
  vibe,
  memory,
  total
};
});

// 👉 сортировка
const sorted = prepared.sort((a, b) => b.total - a.total);

// 👉 рендер
sorted.forEach(j => {
  const row = document.createElement("div");
  row.className = "judge-row";

  row.innerHTML = `
    <div class="judge-name">${j.username}</div>

    <div class="${getClass(j.rhymes)}">${j.rhymes.toFixed(1)}</div>
    <div class="${getClass(j.structure)}">${j.structure.toFixed(1)}</div>
    <div class="${getClass(j.style)}">${j.style.toFixed(1)}</div>
    <div class="${getClass(j.charisma)}">${j.charisma.toFixed(1)}</div>
    <div class="${getClass(j.vibe)}">${j.vibe.toFixed(1)}</div>
    <div class="${getClass(j.memory)}">${j.memory.toFixed(1)}</div>

    <div class="judge-avg">${j.total}</div>
  `;

  rows.appendChild(row);
});

      loaded = true;

    } catch (err) {
      console.error("hover error", err);
    }
  });
}
initJudgeHover();