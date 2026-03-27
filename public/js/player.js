(() => {
  if (window.__ritmoriaPlayerLoaded) return;
  window.__ritmoriaPlayerLoaded = true;

  const STORAGE_KEY = "ritmoria_current_track";
  const AUTOPLAY_KEY = "ritmoria_autoplay";
  const FORCE_PAUSED_KEY = "ritmoria_force_paused";

  let playerReady = false;
  let audioEl = null;
  let scWidgetInstance = null;
  let currentMode = null; // "audio" | "soundcloud"
  let lastScPosition = 0;
  let lastScDuration = 0;

  function ensurePlayerMarkup() {

    const player = document.getElementById("global-player")

document.getElementById("gp-hide")?.addEventListener("click", () => {
  player.classList.add("hidden")
  localStorage.setItem("playerHidden", "1")
})


    let host = document.getElementById("player");
    if (!host) {
      host = document.createElement("div");
      host.id = "player";
      document.body.appendChild(host);
    }

    if (!document.getElementById("global-player")) {
      host.innerHTML = `
        <div id="global-player" class="global-player hidden">
          <div class="gp-left">
            <img id="gp-cover" class="gp-cover" src="/images/default-avatar.jpg" alt="cover">
            <div class="gp-meta">
              <div id="gp-title" class="gp-title">Ничего не играет</div>
              <div id="gp-artist" class="gp-artist">—</div>
            </div>
          </div>

          <div class="gp-center">
            <div class="gp-controls">
              <button id="gp-play" class="gp-btn" type="button">▶</button>
            </div>

            <div class="gp-progress-row">
              <span id="gp-current" class="gp-time">0:00</span>
              <input id="gp-progress" class="gp-progress" type="range" min="0" max="100" value="0">
              <span id="gp-duration" class="gp-time">0:00</span>
            </div>
          </div>

          <div class="gp-right">
          <button id="gp-hide" class="gp-hide">✕</button>
            <input id="gp-volume" class="gp-volume" type="range" min="0" max="1" step="0.01" value="0.7">
          </div>

          <audio id="global-audio"></audio>
          <div id="gp-sc-host" class="gp-sc-host"></div>
        </div>
      `;
    }

    audioEl = document.getElementById("global-audio");

    if (playerReady) return;
    playerReady = true;

    const playBtn = document.getElementById("gp-play");
    const progress = document.getElementById("gp-progress");
    const volume = document.getElementById("gp-volume");

    if (audioEl) {
      audioEl.volume = Number(volume.value);

      audioEl.addEventListener("timeupdate", () => {
        const duration = audioEl.duration || 0;
        const current = audioEl.currentTime || 0;

        document.getElementById("gp-current").textContent = formatTime(current);
        document.getElementById("gp-duration").textContent = formatTime(duration);

        if (duration > 0) {
          progress.value = (current / duration) * 100;
        } else {
          progress.value = 0;
        }

        saveCurrentState(!audioEl.paused);
      });

      audioEl.addEventListener("ended", () => {
        setPlayingUI(false);
        saveCurrentState(false);
      });

      audioEl.addEventListener("play", () => {
  setPlayingUI(true);
  saveCurrentState(true);
  localStorage.setItem(AUTOPLAY_KEY, "1");
  localStorage.setItem(FORCE_PAUSED_KEY, "0");
});

      audioEl.addEventListener("pause", () => {
  setPlayingUI(false);
  saveCurrentState(false);
  localStorage.setItem(AUTOPLAY_KEY, "0");
  localStorage.setItem(FORCE_PAUSED_KEY, "1");
});
    }

    playBtn.addEventListener("click", () => {
      if (currentMode === "audio" && audioEl) {
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
          saveCurrentState(currentMode === "audio" ? !audioEl.paused : true);
        } else {
          audioEl.pause();
          saveCurrentState(false);
        }
        return;
      }

      if (currentMode === "soundcloud" && scWidgetInstance) {
        const isPlaying = document.getElementById("global-player").dataset.playing === "1";

        if (isPlaying) {
          scWidgetInstance.pause();
          saveCurrentState(false);
        } else {
          scWidgetInstance.play();
          saveCurrentState(currentMode === "audio" ? !audioEl.paused : true);
        }
      }
    });

    progress.addEventListener("input", () => {
      if (currentMode === "audio" && audioEl && audioEl.duration) {
        audioEl.currentTime = (Number(progress.value) / 100) * audioEl.duration;
      }

      if (currentMode === "soundcloud" && scWidgetInstance && lastScDuration > 0) {
        const nextMs = (Number(progress.value) / 100) * lastScDuration;
        scWidgetInstance.seekTo(nextMs);
      }
    });

    volume.addEventListener("input", () => {
      const value = Number(volume.value);

      if (audioEl) {
        audioEl.volume = value;
      }

      if (scWidgetInstance) {
        scWidgetInstance.setVolume(Math.round(value * 100));
      }
    });

    restoreTrack();

    // восстановление состояния скрытия
if (localStorage.getItem("playerHidden") === "1") {
  document.getElementById("global-player").classList.add("hidden")
}
  }

  function setPlayingUI(isPlaying) {
    const player = document.getElementById("global-player");
    const playBtn = document.getElementById("gp-play");
    if (!player || !playBtn) return;

    player.dataset.playing = isPlaying ? "1" : "0";
    playBtn.textContent = isPlaying ? "❚❚" : "▶";
  }

  function formatTime(sec) {
    if (!sec || Number.isNaN(sec)) return "0:00";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function stopAudioOnly() {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.removeAttribute("src");
      audioEl.load();
    }
  }

  function stopSoundCloudOnly() {
    if (scWidgetInstance) {
      try {
        scWidgetInstance.pause();
      } catch (e) {}
    }

    const scHost = document.getElementById("gp-sc-host");
    if (scHost) {
      scHost.innerHTML = "";
    }

    scWidgetInstance = null;
    lastScPosition = 0;
    lastScDuration = 0;
  }

  function updateMeta(track) {
    const player = document.getElementById("global-player");
    if (!player) return;

    if (localStorage.getItem("playerHidden") !== "1") {
  player.classList.remove("hidden");
}
    document.getElementById("gp-title").textContent = track.title || "Unknown track";
    document.getElementById("gp-artist").textContent = track.artist || "Unknown artist";
    document.getElementById("gp-cover").src = track.cover || "/images/default-avatar.jpg";
  }

  function saveTrackObject(track, isPlaying) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      title: track.title || "",
      artist: track.artist || "",
      cover: track.cover || "",
      audioSrc: track.audioSrc || "",
      soundcloud: track.soundcloud || "",
      currentTime: track.currentTime || 0,
      isPlaying: !!isPlaying
    }));
  }

  function saveCurrentState(isPlaying) {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;

    if (currentMode === "audio" && audioEl) {
      saved.currentTime = audioEl.currentTime || 0;
      saved.isPlaying = !!isPlaying;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return;
    }

    if (currentMode === "soundcloud") {
      saved.currentTime = lastScPosition || 0;
      saved.isPlaying = !!isPlaying;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
  }

  function bindSoundCloudEvents(track) {
    if (!scWidgetInstance) return;

    scWidgetInstance.bind(SC.Widget.Events.READY, () => {
      scWidgetInstance.setVolume(Math.round(Number(document.getElementById("gp-volume").value) * 100));

      if (track.currentTime) {
        scWidgetInstance.seekTo(track.currentTime * 1000);
      }

      if (track.isPlaying) {
        scWidgetInstance.play();
      } else {
        scWidgetInstance.pause();
      }
    });

    scWidgetInstance.bind(SC.Widget.Events.PLAY, () => {
      currentMode = "soundcloud";
      setPlayingUI(true);
      saveCurrentState(currentMode === "audio" ? !audioEl.paused : true);
    });

    scWidgetInstance.bind(SC.Widget.Events.PAUSE, () => {
      setPlayingUI(false);
      saveCurrentState(false);
    });

    scWidgetInstance.bind(SC.Widget.Events.FINISH, () => {
      setPlayingUI(false);
      saveCurrentState(false);
    });

    scWidgetInstance.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
      lastScPosition = (e.currentPosition || 0) / 1000;
      lastScDuration = e.loadedProgress ? lastScDuration : lastScDuration;

      const duration = e.relativePosition > 0
        ? (e.currentPosition / e.relativePosition)
        : lastScDuration;

      if (duration && Number.isFinite(duration)) {
        lastScDuration = duration;
        document.getElementById("gp-current").textContent = formatTime(lastScPosition);
        document.getElementById("gp-duration").textContent = formatTime(duration / 1000);
        document.getElementById("gp-progress").value = (e.relativePosition || 0) * 100;
      }

      saveCurrentState(currentMode === "audio" ? !audioEl.paused : true);
    });
  }

  function playSoundCloud(track) {
    if (!window.SC || !SC.Widget) {
      window.open(track.soundcloud, "_blank");
      return;
    }

    stopAudioOnly();
    stopSoundCloudOnly();

    const scHost = document.getElementById("gp-sc-host");
    scHost.innerHTML = `
      <iframe
        id="gp-sc-frame"
        width="0"
        height="0"
        allow="autoplay"
        frameborder="no"
        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(track.soundcloud)}&auto_play=${track.isPlaying ? "true" : "false"}">
      </iframe>
    `;

    const iframe = document.getElementById("gp-sc-frame");
    scWidgetInstance = SC.Widget(iframe);
    currentMode = "soundcloud";
    bindSoundCloudEvents(track);
  }

  function playAudio(track) {
    stopSoundCloudOnly();
    currentMode = "audio";

    if (!audioEl) return;

    const isSameTrack = audioEl.src.includes(track.audioSrc);

if (!isSameTrack) {
  audioEl.src = track.audioSrc;
}

audioEl.currentTime = track.currentTime || 0;
document.getElementById("gp-current").textContent = formatTime(track.currentTime || 0);

if (track.isPlaying === true) {
  setTimeout(() => {
    audioEl.play().catch(() => {});
  }, 80);
} else {
  audioEl.pause();
}
  }

  window.playTrackGlobal = function(track) {
    ensurePlayerMarkup();

    const normalizedTrack = {
      title: track.title || "Unknown track",
      artist: track.artist || "Unknown artist",
      cover: track.cover || "/images/default-avatar.jpg",
      audioSrc: track.audioSrc || "",
      soundcloud: track.soundcloud || "",
      currentTime: 0,
      isPlaying: true
    };
    localStorage.setItem(FORCE_PAUSED_KEY, "0");
localStorage.setItem(AUTOPLAY_KEY, "1");

    updateMeta(normalizedTrack);
    saveTrackObject(normalizedTrack, true);

    if (normalizedTrack.audioSrc) {
      playAudio(normalizedTrack);
      return;
    }

    if (normalizedTrack.soundcloud) {
      playSoundCloud(normalizedTrack);
    }
  };

  window.stopGlobalTrack = function() {
    ensurePlayerMarkup();
    stopAudioOnly();
    stopSoundCloudOnly();
    setPlayingUI(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  function restoreTrack() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const track = JSON.parse(raw);
    ensurePlayerMarkup();
    updateMeta(track);

    const autoplay = localStorage.getItem(AUTOPLAY_KEY) === "1";
const forcePaused = localStorage.getItem(FORCE_PAUSED_KEY) === "1";

if (track.audioSrc) {
  const shouldPlay = forcePaused ? false : autoplay;

  playAudio({
    ...track,
    isPlaying: shouldPlay
  });

  setPlayingUI(shouldPlay); // 💣 ВОТ ЭТО ФИКСИТ КНОПКУ
  return;
}

    if (track.soundcloud) {
  const shouldPlay = forcePaused ? false : autoplay;

  playSoundCloud({
    ...track,
    isPlaying: shouldPlay
  });

  setPlayingUI(shouldPlay); // 💣 тоже сюда
}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePlayerMarkup);
  } else {
    ensurePlayerMarkup();
  }
})();

window.togglePlayer = function() {
  const player = document.getElementById("global-player")
  const hidden = player.classList.contains("hidden")

  if (hidden) {
    player.classList.remove("hidden")
    localStorage.removeItem("playerHidden")
  } else {
    player.classList.add("hidden")
    localStorage.setItem("playerHidden", "1")
  }
}