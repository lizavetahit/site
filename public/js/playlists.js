const grid = document.querySelector(".playlists-grid");
const createBtn = document.querySelector(".create-btn");

const modal = document.getElementById("playlistModal");
const overlay = document.querySelector(".modal-overlay");
const saveBtn = document.querySelector(".save-btn");
const cancelBtn = document.querySelector(".cancel-btn");
const input = document.getElementById("playlistName");

const playlistsScreen = document.getElementById("playlistsScreen");
const playlistView = document.getElementById("playlistView");
const backBtn = document.querySelector(".back-btn");

const viewTitle = document.getElementById("viewTitle");
const viewCount = document.getElementById("viewCount");
const viewCover = document.getElementById("viewCover");

const coverInput = document.getElementById("coverInput");

let playlists = JSON.parse(localStorage.getItem("playlists")) || [];
let currentPlaylistIndex = null;
let coverTargetIndex = null;

function savePlaylists() {
  localStorage.setItem("playlists", JSON.stringify(playlists));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSVG() {
  return `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M29,16.5A13.08,13.08,0,0,0,25.7,8l0.7-.73L26,6.92A14.42,14.42,0,0,0,16,3,14.42,14.42,0,0,0,6,6.92L5.6,7.26,6.3,8A13.08,13.08,0,0,0,3,16.5a10.57,10.57,0,0,0,3,7.69V27H8a2,2,0,0,0,4,0V19a2,2,0,0,0-4,0H6v3.67A9.7,9.7,0,0,1,4,16.5,12,12,0,0,1,7,8.72L7.67,9.43,8,9.08A11.25,11.25,0,0,1,16,6a11.25,11.25,0,0,1,8,3.08l0.36,0.35L25,8.72a12,12,0,0,1,3,7.78,9.7,9.7,0,0,1-2,6.17V19H24a2,2,0,0,0-4,0v8a2,2,0,0,0,4,0h2V24.19A10.57,10.57,0,0,0,29,16.5ZM10,18a1,1,0,0,1,1,1v8a1,1,0,0,1-2,0V19A1,1,0,0,1,10,18ZM7,20H8v6H7V20ZM24.29,8A12.26,12.26,0,0,0,16,5,12.26,12.26,0,0,0,7.71,8L7,7.3A13.47,13.47,0,0,1,16,4a13.47,13.47,0,0,1,9,3.3ZM22,28a1,1,0,0,1-1-1V19a1,1,0,0,1,2,0v8A1,1,0,0,1,22,28Zm3-2H24V20h1v6Z"></path>
    </svg>
  `;
}

function closeAllMenus() {
  document.querySelectorAll(".playlist-menu.open").forEach((menu) => {
    menu.classList.remove("open");
    const dropdown = menu.querySelector(".menu-dropdown");
    if (dropdown) dropdown.classList.add("hidden");
  });
}

function getCoverMarkup(playlist) {
  const style = playlist.cover
    ? `style="background-image:url('${playlist.cover}')"`
    : "";

  return `<div class="cover" ${style}></div>`;
}

function updatePlaylistView() {
  if (currentPlaylistIndex === null || !playlists[currentPlaylistIndex]) return;

  const playlist = playlists[currentPlaylistIndex];
  viewTitle.textContent = playlist.name;
  viewCount.textContent = `${playlist.tracks || 0} треков`;

  if (playlist.cover) {
    viewCover.style.backgroundImage = `url("${playlist.cover}")`;
  } else {
    viewCover.style.backgroundImage = "";
  }
}

function renderPlaylists() {
  grid.innerHTML = "";

  if (playlists.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          ${getSVG()}
        </div>
        <h3>У тебя пока нет плейлистов</h3>
        <p>Создай первый и добавляй любимые треки</p>
      </div>
    `;
    return;
  }

  playlists.forEach((playlist, index) => {
    const card = document.createElement("article");
    card.className = "playlist-card";
    card.style.animationDelay = `${index * 0.06}s`;

    card.innerHTML = `
      <div class="playlist-menu">
        <button class="menu-btn" type="button" aria-label="Настройки плейлиста">
          <span class="menu-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div class="menu-dropdown hidden">
          <button class="menu-item rename" type="button">
            <span class="menu-icon">✏️</span>
            <span>Изменить название</span>
          </button>

          <button class="menu-item cover-action" type="button">
            <span class="menu-icon">🖼</span>
            <span>Изменить обложку</span>
          </button>

          <button class="menu-item delete" type="button">
            <span class="menu-icon">🗑</span>
            <span>Удалить</span>
          </button>
        </div>
      </div>

      ${getCoverMarkup(playlist)}
      <h3>${escapeHtml(playlist.name)}</h3>
      <p>${playlist.tracks || 0} треков</p>
    `;

    const menu = card.querySelector(".playlist-menu");
    const menuBtn = card.querySelector(".menu-btn");
    const dropdown = card.querySelector(".menu-dropdown");
    const renameBtn = card.querySelector(".rename");
    const coverBtn = card.querySelector(".cover-action");
    const deleteBtn = card.querySelector(".delete");

    card.addEventListener("click", () => {
      openPlaylist(index);
    });

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const isOpen = menu.classList.contains("open");
      closeAllMenus();

      if (!isOpen) {
        menu.classList.add("open");
        dropdown.classList.remove("hidden");
      }
    });

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    renameBtn.addEventListener("click", () => {
      const currentName = playlists[index].name;
      const newName = prompt("Новое название плейлиста:", currentName);

      if (!newName) return;

      const trimmed = newName.trim();
      if (!trimmed) return;

      playlists[index].name = trimmed;
      savePlaylists();
      renderPlaylists();

      if (currentPlaylistIndex === index) {
        updatePlaylistView();
      }
    });

    coverBtn.addEventListener("click", () => {
      coverTargetIndex = index;
      coverInput.click();
    });

    deleteBtn.addEventListener("click", () => {
      const confirmed = confirm(`Удалить плейлист "${playlists[index].name}"?`);
      if (!confirmed) return;

      playlists.splice(index, 1);
      savePlaylists();
      closeAllMenus();

      if (currentPlaylistIndex === index) {
        currentPlaylistIndex = null;
        playlistView.classList.add("hidden");
        playlistsScreen.classList.remove("hidden");
      } else if (
        currentPlaylistIndex !== null &&
        currentPlaylistIndex > index
      ) {
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

  playlistsScreen.classList.add("hidden");
  playlistView.classList.remove("hidden");
  closeAllMenus();
}

function closePlaylistView() {
  currentPlaylistIndex = null;
  playlistView.classList.add("hidden");
  playlistsScreen.classList.remove("hidden");
}

function openModal() {
  modal.classList.add("active");
  input.value = "";
  setTimeout(() => input.focus(), 80);
}

function closeModal() {
  modal.classList.remove("active");
}

function createPlaylist() {
  const name = input.value.trim();
  if (!name) return;

  playlists.push({
    name,
    tracks: 0,
    cover: ""
  });

  savePlaylists();
  closeModal();
  renderPlaylists();
}

createBtn.addEventListener("click", openModal);
overlay.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
backBtn.addEventListener("click", closePlaylistView);

saveBtn.addEventListener("click", createPlaylist);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    createPlaylist();
  }

  if (e.key === "Escape") {
    closeModal();
  }
});

coverInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file || coverTargetIndex === null) return;

  const reader = new FileReader();

  reader.onload = () => {
    playlists[coverTargetIndex].cover = reader.result;
    savePlaylists();
    renderPlaylists();

    if (currentPlaylistIndex === coverTargetIndex) {
      updatePlaylistView();
    }

    coverTargetIndex = null;
    coverInput.value = "";
  };

  reader.readAsDataURL(file);
});

document.addEventListener("click", () => {
  closeAllMenus();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllMenus();

    if (modal.classList.contains("active")) {
      closeModal();
    }
  }
});

renderPlaylists();