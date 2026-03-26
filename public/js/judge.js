document.addEventListener("DOMContentLoaded", () => {
  const rateBtn = document.getElementById("rateBtn");
  const resetBtn = document.getElementById("resetBtn");

  const sliders = ["s1", "s2", "s3", "s4"];

  const audio = document.getElementById("judgeAudio");
  const playBtn = document.getElementById("playBtn");
  const progress = document.getElementById("progress");
  const progressWrap = document.getElementById("progressWrap");
  const currentTimeEl = document.getElementById("current");
  const durationEl = document.getElementById("duration");
  const volume = document.getElementById("volume");

  const mp3Player = document.getElementById("mp3Player");
  const scWrapper = document.getElementById("scWrapper");
  const soundcloudIframe = document.getElementById("soundcloudPlayer");

  const trackName = document.getElementById("trackName");
  const trackArtist = document.getElementById("trackArtist");
  const trackCover = document.getElementById("trackCover");
  const playerCover = document.getElementById("playerCover");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
  let isMP3 = false;
  let scWidget = null;
  let scIsPlaying = false;
  let scReady = false;

  // -------------------------
  // UI / popup
  // -------------------------
  if (rateBtn) {
    rateBtn.addEventListener("click", () => {
      const popup = document.createElement("div");
      popup.className = "rate-popup";
      popup.textContent = "🔥 Оценка сохранена";

      document.body.appendChild(popup);

      setTimeout(() => popup.classList.add("show"), 10);

      setTimeout(() => {
        popup.classList.remove("show");
        setTimeout(() => popup.remove(), 300);
      }, 2000);
    });
  }

  // -------------------------
  // Sliders
  // -------------------------
  function setFill(el) {
    const min = Number(el.min);
    const max = Number(el.max);
    const val = Number(el.value);
    const pct = ((val - min) / (max - min)) * 100;
    el.style.setProperty("--fill", pct + "%");
  }

  function animateValue(el, start, end, duration = 400) {
    let startTime = null;

    function step(time) {
      if (!startTime) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);
      const value = Math.floor(start + (end - start) * progress);

      el.textContent = value;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function recalc() {
    const vals = sliders.map(id => Number(document.getElementById(id).value));
    const base = vals.reduce((a, b) => a + b, 0);

    const vibe = Number(document.getElementById("b1").value);
    const mem = Number(document.getElementById("b2").value);

    const k1 = 1 + vibe * 0.1;
    const k2 = 1 + mem * 0.1;

    const total = Math.round(base * k1 * k2 * 1.111111);

    document.getElementById("baseExpr").textContent = vals.join(" + ");
    document.getElementById("bonusExpr1").textContent = "× " + k1.toFixed(1);
    document.getElementById("bonusExpr2").textContent = "× " + k2.toFixed(1);

    const totalEl = document.getElementById("total");
    const currentValue = Number(totalEl.textContent) || 0;
    animateValue(totalEl, currentValue, total);

    sliders.forEach((id, i) => {
      const el = document.getElementById(id);
      document.getElementById("v" + (i + 1)).textContent = el.value;
      setFill(el);
    });

    const b1 = document.getElementById("b1");
    const b2 = document.getElementById("b2");

    document.getElementById("bv1").textContent = b1.value;
    document.getElementById("bv2").textContent = b2.value;

    setFill(b1);
    setFill(b2);
  }

  document.querySelectorAll('input[type="range"]').forEach(el => {
    el.addEventListener("input", () => {
      const row = el.closest(".row");
      if (row) {
        row.classList.add("active");
        setTimeout(() => row.classList.remove("active"), 300);
      }

      recalc();
    });

    setFill(el);
  });

  if (resetBtn) {
    resetBtn.onclick = () => {
      document.querySelectorAll('input[type="range"]').forEach(el => {
        if (
          el.id === "s1" ||
          el.id === "s2" ||
          el.id === "s3" ||
          el.id === "s4" ||
          el.id === "b1" ||
          el.id === "b2"
        ) {
          el.value = el.min;
          setFill(el);
        }
      });

      recalc();
    };
  }

  recalc();

  // -------------------------
  // Player helpers
  // -------------------------
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
  isMP3 = true;
  scIsPlaying = false;
}

function showSCPlayer() {
  mp3Player.style.display = "flex";
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
    `&color=%238b5cf6&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`;

  scWidget = SC.Widget(soundcloudIframe);

  scWidget.bind(SC.Widget.Events.READY, () => {
  scReady = true;

  // сброс UI
  progress.style.width = "0%";
  currentTimeEl.textContent = "0:00";

  // громкость
  scWidget.setVolume(Math.round(Number(volume.value) * 100));

  // длительность
  scWidget.getDuration((ms) => {
    durationEl.textContent = formatTime(ms / 1000);
  });

  // ❗ убираем старый интервал (очень важно)
  if (window.scInterval) clearInterval(window.scInterval);

  // ✅ основной апдейт прогресса
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
    document.querySelector(".custom-player").classList.add("playing");
    playerCover.classList.add("playing");
  });

  scWidget.bind(SC.Widget.Events.PAUSE, () => {
    scIsPlaying = false;
    playBtn.classList.remove("playing");
    document.querySelector(".custom-player").classList.remove("playing");
    playerCover.classList.remove("playing");
  });

  scWidget.bind(SC.Widget.Events.FINISH, () => {
    scIsPlaying = false;
    playBtn.classList.remove("playing");
    progress.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    document.querySelector(".custom-player").classList.remove("playing");
    playerCover.classList.remove("playing");
  });

  scWidget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
  if (!e || !e.duration) return;

  const currentSec = e.currentPosition / 1000;
  const durationSec = e.duration / 1000;

  currentTimeEl.textContent = formatTime(currentSec);

  const percent = (currentSec / durationSec) * 100;

  progress.style.width = percent + "%";
});
}

  // -------------------------
  // MP3 controls
  // -------------------------
  volume.value = 0.5;
  audio.volume = 0.5;

  playBtn.addEventListener("click", () => {
  if (isMP3) {
    if (!audio.src) return;

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
    return;
  }

  if (!scWidget) return;
  if (!scReady) return;

  if (scIsPlaying) {
    scWidget.pause();
  } else {
    scWidget.play();
  }
});

  audio.addEventListener("play", () => {
  playBtn.classList.add("playing");
  playerCover.classList.add("playing"); // 👈 сюда
});

audio.addEventListener("pause", () => {
  playBtn.classList.remove("playing");
  playerCover.classList.remove("playing"); // 👈 сюда
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

  progressWrap.addEventListener("click", e => {
    const rect = progressWrap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;

    if (isMP3) {
      if (!audio.duration) return;
      audio.currentTime = percent * audio.duration;
      return;
    }

    if (scWidget) {
      scWidget.getDuration(durationMs => {
        if (!durationMs) return;
        scWidget.seekTo(percent * durationMs);
      });
    }
  });

  volume.addEventListener("input", () => {
  const value = volume.value;

  // громкость
  if (audio) audio.volume = value;
  if (scWidget) scWidget.setVolume(value * 100);

  // заполнение
  const percent = value * 100;
  volume.style.setProperty("--vol", percent + "%");

  // 🔇 mute логика
  if (value == 0) {
    volume.classList.add("muted");
  } else {
    volume.classList.remove("muted");
  }
});
  // -------------------------
  // Load track
  // -------------------------
  async function loadTrackPlayer() {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("track");

    if (!trackId) return;

    try {
      const res = await fetch(`/api/tracks/${trackId}`);
      if (!res.ok) throw new Error("Ошибка загрузки трека");

      const track = await res.json();


      trackName.textContent = track.title || "Без названия";
      trackArtist.textContent = track.artist || "Unknown artist";
      trackCover.src = track.cover || "/images/cover-placeholder.jpg";

      playerCover.src = track.cover || "/images/cover-placeholder.jpg";
playerTitle.textContent = track.title || "Без названия";
playerArtist.textContent = track.artist || "Unknown artist";
      resetPlayerUI();

      if (track.audio && track.audio !== "null") {
        showMP3Player();
        audio.src = track.audio;
        audio.load();
        return;
      }

      if (track.soundcloud) {
        showSCPlayer();
        initSoundCloud(track.soundcloud);
        return;
      }

      mp3Player.style.display = "none";
      scWrapper.style.display = "none";
    } catch (err) {
      console.error("Ошибка загрузки трека:", err);
    }
  }

  loadTrackPlayer();
});