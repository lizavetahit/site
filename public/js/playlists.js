window.initPlaylistsPage = async function () {
  const root = document.querySelector(".playlists-page");
  if (!root) return;

  const grid = root.querySelector(".playlists-grid");
  const createBtn = root.querySelector(".playlists-create-btn");

  const modal = document.getElementById("playlistModal");
  const overlay = root.querySelector(".playlists-modal-overlay");
  const saveBtn = root.querySelector(".playlists-save-btn");
  const cancelBtn = root.querySelector(".playlists-cancel-btn");
  const input = document.getElementById("playlistName");

  const playlistsScreen = document.getElementById("playlistsScreen");
  const playlistView = document.getElementById("playlistView");
  const backBtn = root.querySelector(".playlists-back-btn");

  const viewTitle = document.getElementById("viewTitle");
  const viewCount = document.getElementById("viewCount");
  const viewCover = document.getElementById("viewCover");
  const tracksBox = root.querySelector(".playlists-tracks-box");

  const coverInput = document.getElementById("coverInput");

  if (
    !grid ||
    !createBtn ||
    !modal ||
    !overlay ||
    !saveBtn ||
    !cancelBtn ||
    !input ||
    !playlistsScreen ||
    !playlistView ||
    !backBtn ||
    !viewTitle ||
    !viewCount ||
    !viewCover ||
    !tracksBox ||
    !coverInput
  ) {
    console.log("❌ playlists page elements not found");
    return;
  }

  let currentPlaylistIndex = null;
  let coverTargetIndex = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(sec) {
    const safe = Number(sec) || 0;
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function getTokenPayload() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const parts = token.split(".");
      if (parts.length < 2) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload || null;
    } catch (err) {
      console.log("token parse error", err);
      return null;
    }
  }

  function getCurrentUserId() {
    const payload = getTokenPayload();
    return payload?.id || "guest";
  }

  function getStorageKey() {
    return `ritmoria_playlists_user_${getCurrentUserId()}`;
  }

  function normalizeTrack(track) {
    if (!track) return null;

    const cover =
      track.cover
        ? (String(track.cover).startsWith("http")
            ? String(track.cover)
            : "/" + String(track.cover).replace(/^\/+/, ""))
        : "/images/default-cover.jpg";

    const audioSrc = track.audioSrc
      ? track.audioSrc
      : track.audio
        ? (String(track.audio).startsWith("http")
            ? String(track.audio)
            : "/" + String(track.audio).replace(/^\/+/, ""))
        : "";

    return {
      id: Number(track.id) || 0,
      title: track.title || "Без названия",
      artist: track.artist || "Unknown artist",
      cover,
      audioSrc,
      soundcloud: track.soundcloud || "",
      slug: track.slug || "",
      username_tag: track.username_tag || "",
      duration: Number(track.duration || track._duration || 0) || 0,
      addedAt: track.addedAt || Date.now()
    };
  }

  function ensureFavoritesPlaylist(playlists) {
    let list = Array.isArray(playlists) ? [...playlists] : [];

    let favorites = list.find((p) => p && p.id === "favorites");

    if (!favorites) {
      favorites = {
        id: "favorites",
        name: "Любимые треки",
        system: true,
        cover: "",
        tracks: []
      };

      list.unshift(favorites);
    }

    favorites.name = "Любимые треки";
    favorites.system = true;
    favorites.tracks = Array.isArray(favorites.tracks) ? favorites.tracks : [];

    const others = list.filter((p) => p && p.id !== "favorites");

    return [favorites, ...others.map((p) => ({
      id: p.id || `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: p.name || "Без названия",
      system: !!p.system,
      cover: p.cover || "",
      tracks: Array.isArray(p.tracks) ? p.tracks : []
    }))];
  }

  function getPlaylists() {
    try {
      const raw = JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
      return ensureFavoritesPlaylist(raw);
    } catch (err) {
      console.log("playlists parse error", err);
      return ensureFavoritesPlaylist([]);
    }
  }

  function savePlaylists(playlists) {
    const safe = ensureFavoritesPlaylist(playlists);
    localStorage.setItem(getStorageKey(), JSON.stringify(safe));
    return safe;
  }

  function getPlaylistById(playlistId) {
    return getPlaylists().find((p) => p.id === playlistId) || null;
  }

  function getFavoritesPlaylist() {
    return getPlaylistById("favorites");
  }

  function isTrackInPlaylist(playlistId, trackId) {
    const playlist = getPlaylistById(playlistId);
    if (!playlist) return false;
    return playlist.tracks.some((t) => Number(t.id) === Number(trackId));
  }

  function isTrackInFavorites(trackId) {
    return isTrackInPlaylist("favorites", trackId);
  }

  function createPlaylist(name) {
    const playlists = getPlaylists();
    const trimmed = String(name || "").trim();

    if (!trimmed) return null;

    const newPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      system: false,
      cover: "",
      tracks: []
    };

    playlists.push(newPlaylist);
    savePlaylists(playlists);
    return newPlaylist;
  }

  function renamePlaylist(playlistId, newName) {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);
    const trimmed = String(newName || "").trim();

    if (!playlist || playlist.system || !trimmed) return false;

    playlist.name = trimmed;
    savePlaylists(playlists);
    return true;
  }

  function deletePlaylist(playlistId) {
    if (playlistId === "favorites") return false;

    const playlists = getPlaylists();
    const next = playlists.filter((p) => p.id !== playlistId);
    savePlaylists(next);
    return true;
  }

  function addTrackToPlaylist(playlistId, track) {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);
    const normalized = normalizeTrack(track);

    if (!playlist || !normalized || !normalized.id) return false;

    const exists = playlist.tracks.some((t) => Number(t.id) === Number(normalized.id));
    if (exists) return false;

    playlist.tracks.unshift(normalized);

    if (!playlist.cover && normalized.cover) {
      playlist.cover = normalized.cover;
    }

    savePlaylists(playlists);
    return true;
  }

  function removeTrackFromPlaylist(playlistId, trackId) {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    const before = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter((t) => Number(t.id) !== Number(trackId));

    if (playlist.cover && playlist.tracks.length === 0 && !playlist.system) {
      playlist.cover = "";
    }

    savePlaylists(playlists);
    return playlist.tracks.length !== before;
  }

  function toggleTrackInFavorites(track) {
    const normalized = normalizeTrack(track);
    if (!normalized || !normalized.id) {
      return { added: false, removed: false };
    }

    if (isTrackInFavorites(normalized.id)) {
      removeTrackFromPlaylist("favorites", normalized.id);
      return { added: false, removed: true };
    }

    addTrackToPlaylist("favorites", normalized);
    return { added: true, removed: false };
  }

  function getPlaylistTrackCount(playlist) {
    return Array.isArray(playlist?.tracks) ? playlist.tracks.length : 0;
  }

  function getCoverMarkup(playlist, extraClass = "") {
    const style = playlist.cover
      ? `style="background-image:url('${playlist.cover}')"`
      : "";

    return `<div class="playlists-cover ${extraClass}" ${style}></div>`;
  }

  function closeAllMenus() {
    root.querySelectorAll(".playlist-menu.open").forEach((menu) => {
      menu.classList.remove("open");
      const dropdown = menu.querySelector(".playlists-menu-dropdown");
      if (dropdown) dropdown.classList.add("playlists-hidden");
    });
  }

  function renderTrackRow(track, playlistId) {
    const cover = track.cover || "/images/default-cover.jpg";
    const duration = formatTime(track.duration || 0);

    return `
      <div class="playlist-track-row" data-track-id="${Number(track.id)}">
        <div class="playlist-track-left" onclick="window.__openPlaylistTrack('${escapeHtml(playlistId)}', ${Number(track.id)})">
          <img class="playlist-track-cover" src="${cover}" alt="${escapeHtml(track.title)}">
          <div class="playlist-track-meta">
            <div class="playlist-track-title">${escapeHtml(track.title)}</div>
            <div class="playlist-track-artist" onclick="event.stopPropagation(); window.__openPlaylistAuthor('${escapeHtml(track.username_tag)}')">
              ${escapeHtml(track.artist)}
            </div>
          </div>
        </div>

        <div class="playlist-track-right">
          <div class="playlist-track-duration">${duration}</div>

          <button
            class="playlist-track-remove-btn"
            type="button"
            onclick="window.__removeTrackFromPlaylistView('${escapeHtml(playlistId)}', ${Number(track.id)})"
          >
            Удалить
          </button>
        </div>
      </div>
    `;
  }

  function renderPlaylistTracks(playlist) {
    if (!playlist) return;

    if (!playlist.tracks.length) {
      tracksBox.innerHTML = `
        <div class="playlists-empty-tracks">
          <p>Здесь пока нет треков</p>
        </div>
      `;
      return;
    }

    tracksBox.innerHTML = `
      <div class="playlist-tracks-list">
        ${playlist.tracks.map((track) => renderTrackRow(track, playlist.id)).join("")}
      </div>
    `;
  }

  function updatePlaylistView() {
    const playlists = getPlaylists();
    const playlist = playlists[currentPlaylistIndex];

    if (!playlist) return;

    viewTitle.textContent = playlist.name;
    viewCount.textContent = `${getPlaylistTrackCount(playlist)} треков`;

    if (playlist.cover) {
      viewCover.style.backgroundImage = `url("${playlist.cover}")`;
    } else {
      viewCover.style.backgroundImage = "";
    }

    renderPlaylistTracks(playlist);
  }

  function renderEmptyState() {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M29,16.5A13.08,13.08,0,0,0,25.7,8l0.7-.73L26,6.92A14.42,14.42,0,0,0,16,3,14.42,14.42,0,0,0,6,6.92L5.6,7.26,6.3,8A13.08,13.08,0,0,0,3,16.5a10.57,10.57,0,0,0,3,7.69V27H8a2,2,0,0,0,4,0V19a2,2,0,0,0-4,0H6v3.67A9.7,9.7,0,0,1,4,16.5,12,12,0,0,1,7,8.72L7.67,9.43,8,9.08A11.25,11.25,0,0,1,16,6a11.25,11.25,0,0,1,8,3.08l0.36,0.35L25,8.72a12,12,0,0,1,3,7.78,9.7,9.7,0,0,1-2,6.17V19H24a2,2,0,0,0-4,0v8a2,2,0,0,0,4,0h2V24.19A10.57,10.57,0,0,0,29,16.5ZM10,18a1,1,0,0,1,1,1v8a1,1,0,0,1-2,0V19A1,1,0,0,1,10,18ZM7,20H8v6H7V20ZM24.29,8A12.26,12.26,0,0,0,16,5,12.26,12.26,0,0,0,7.71,8L7,7.3A13.47,13.47,0,0,1,16,4a13.47,13.47,0,0,1,9,3.3ZM22,28a1,1,0,0,1-1-1V19a1,1,0,0,1,2,0v8A1,1,0,0,1,22,28Zm3-2H24V20h1v6Z"></path>
          </svg>
        </div>
        <h3>У тебя пока нет плейлистов</h3>
        <p>Создай первый и добавляй любимые треки</p>
      </div>
    `;
  }

  function renderPlaylists() {
    const playlists = getPlaylists();
    grid.innerHTML = "";

    if (!playlists.length) {
      renderEmptyState();
      return;
    }

    playlists.forEach((playlist, index) => {
      const count = getPlaylistTrackCount(playlist);

      const card = document.createElement("article");
      card.className = "playlist-card";
      card.style.animationDelay = `${index * 0.06}s`;

      card.innerHTML = `
        <div class="playlist-menu">
          <button class="playlists-menu-btn" type="button" aria-label="Настройки плейлиста">
            <span class="menu-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div class="playlists-menu-dropdown playlists-hidden">
            ${
              playlist.system
                ? `
                  <button class="playlists-menu-item system-label" type="button" disabled>
                    <span class="menu-icon">⭐</span>
                    <span>Системный плейлист</span>
                  </button>
                `
                : `
                  <button class="playlists-menu-item rename" type="button">
                    <span class="menu-icon">✏️</span>
                    <span>Изменить название</span>
                  </button>

                  <button class="playlists-menu-item cover-action" type="button">
                    <span class="menu-icon">🖼</span>
                    <span>Изменить обложку</span>
                  </button>

                  <button class="playlists-menu-item delete" type="button">
                    <span class="menu-icon">🗑</span>
                    <span>Удалить</span>
                  </button>
                `
            }
          </div>
        </div>

        ${getCoverMarkup(playlist)}
        <h3>${escapeHtml(playlist.name)}</h3>
        <p>${count} треков</p>
      `;

      const menu = card.querySelector(".playlist-menu");
      const menuBtn = card.querySelector(".playlists-menu-btn");
      const dropdown = card.querySelector(".playlists-menu-dropdown");
      const renameBtn = card.querySelector(".rename");
      const coverBtn = card.querySelector(".cover-action");
      const deleteBtn = card.querySelector(".delete");

      card.addEventListener("click", () => {
        openPlaylist(index);
      });

      menuBtn?.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = menu.classList.contains("open");
        closeAllMenus();

        if (!isOpen) {
          menu.classList.add("open");
          dropdown?.classList.remove("playlists-hidden");
        }
      });

      dropdown?.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      renameBtn?.addEventListener("click", () => {
        const newName = prompt("Новое название плейлиста:", playlist.name);
        if (!newName) return;

        renamePlaylist(playlist.id, newName);
        renderPlaylists();

        if (currentPlaylistIndex === index) {
          updatePlaylistView();
        }
      });

      coverBtn?.addEventListener("click", () => {
        coverTargetIndex = index;
        coverInput.click();
      });

      deleteBtn?.addEventListener("click", () => {
        const confirmed = confirm(`Удалить плейлист "${playlist.name}"?`);
        if (!confirmed) return;

        deletePlaylist(playlist.id);
        closeAllMenus();

        if (currentPlaylistIndex === index) {
          currentPlaylistIndex = null;
          playlistView.classList.add("playlists-hidden");
          playlistsScreen.classList.remove("playlists-hidden");
        } else if (currentPlaylistIndex !== null && currentPlaylistIndex > index) {
          currentPlaylistIndex -= 1;
        }

        renderPlaylists();
      });

      grid.appendChild(card);
    });
  }

  function openPlaylist(index) {
    currentPlaylistIndex = index;
    updatePlaylistView();

    playlistsScreen.classList.add("playlists-hidden");
    playlistView.classList.remove("playlists-hidden");
    closeAllMenus();
  }

  function closePlaylistView() {
    currentPlaylistIndex = null;
    playlistView.classList.add("playlists-hidden");
    playlistsScreen.classList.remove("playlists-hidden");
  }

  function openModal() {
    modal.classList.add("active");
    input.value = "";
    setTimeout(() => input.focus(), 80);
  }

  function closeModal() {
    modal.classList.remove("active");
  }

  function handleCreatePlaylist() {
    const created = createPlaylist(input.value);
    if (!created) return;

    closeModal();
    renderPlaylists();
  }

  window.__removeTrackFromPlaylistView = function (playlistId, trackId) {
    removeTrackFromPlaylist(playlistId, trackId);

    const playlists = getPlaylists();
    const newIndex = playlists.findIndex((p) => p.id === playlistId);

    if (newIndex !== -1) {
      currentPlaylistIndex = newIndex;
      updatePlaylistView();
    }

    renderPlaylists();
  };

  window.__openPlaylistTrack = function (playlistId, trackId) {
    const playlist = getPlaylistById(playlistId);
    if (!playlist) return;

    const track = playlist.tracks.find((t) => Number(t.id) === Number(trackId));
    if (!track) return;

    if (track.username_tag && track.slug && typeof navigate === "function") {
      navigate(`/${track.username_tag}/${track.slug}`);
    }
  };

  window.__openPlaylistAuthor = function (tag) {
    if (!tag) return;
    if (typeof navigate === "function") {
      navigate(`/${tag}`);
    }
  };

  createBtn.onclick = openModal;
  overlay.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  saveBtn.onclick = handleCreatePlaylist;
  backBtn.onclick = closePlaylistView;

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      handleCreatePlaylist();
    }

    if (e.key === "Escape") {
      closeModal();
    }
  };

  coverInput.onchange = () => {
    const file = coverInput.files?.[0];
    if (!file || coverTargetIndex === null) return;

    const reader = new FileReader();

    reader.onload = () => {
      const playlists = getPlaylists();
      const playlist = playlists[coverTargetIndex];

      if (!playlist || playlist.system) return;

      playlist.cover = String(reader.result || "");
      savePlaylists(playlists);

      renderPlaylists();

      if (currentPlaylistIndex === coverTargetIndex) {
        updatePlaylistView();
      }
    };

    reader.readAsDataURL(file);
    coverInput.value = "";
  };

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".playlist-menu")) {
      closeAllMenus();
    }
  });

  savePlaylists(getPlaylists());
  renderPlaylists();

  window.RitmoriaPlaylists = {
    getAll() {
      return getPlaylists();
    },

    getFavorites() {
      return getFavoritesPlaylist();
    },

    createPlaylist(name) {
      const created = createPlaylist(name);
      renderPlaylists();
      return created;
    },

    addTrackToPlaylist(playlistId, track) {
      const ok = addTrackToPlaylist(playlistId, track);
      renderPlaylists();

      if (currentPlaylistIndex !== null) {
        updatePlaylistView();
      }

      return ok;
    },

    removeTrackFromPlaylist(playlistId, trackId) {
      const ok = removeTrackFromPlaylist(playlistId, trackId);
      renderPlaylists();

      if (currentPlaylistIndex !== null) {
        updatePlaylistView();
      }

      return ok;
    },

    toggleTrackInFavorites(track) {
      const result = toggleTrackInFavorites(track);
      renderPlaylists();

      if (currentPlaylistIndex !== null) {
        updatePlaylistView();
      }

      return result;
    },

    isTrackInFavorites(trackId) {
      return isTrackInFavorites(trackId);
    },

    ensureInitialized() {
      savePlaylists(getPlaylists());
      renderPlaylists();
    }
  };
};