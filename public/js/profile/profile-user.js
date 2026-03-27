const token = localStorage.getItem("token");

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
    const params = new URLSearchParams(window.location.search)
const id = params.get("id")

let url = "/profile"

if (id) {
  url += `?id=${id}`
}

const res = await fetch(url, {
  headers: {
    Authorization: "Bearer " + token
  }
});

    if (!res.ok) {
      throw new Error("Ошибка загрузки профиля");
    }

    const user = await res.json();
    fillProfileEditor(user);

    if (!user.email) {
  const username = document.getElementById("username");
  username.innerHTML 
  }

    setText("username", user.username);
    if (!user.email) {
  const usernameEl = document.getElementById("username");
  usernameEl.innerHTML
}
    setText("usernameTag", user.username_tag ? "@" + user.username_tag : "")
    if (user.email) {
  setText("email", user.email);
  } else {
  setText("email", "Telegram аккаунт");
  }
    const bioEl = document.getElementById("bio");

if (!user.bio || user.bio.trim() === "") {
  bioEl.style.display = "none";
} else {
  bioEl.style.display = "block";
  bioEl.innerText = user.bio;
}

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
    setText("profileError", "");
  }
}

function openEdit() {
if(!isMyProfile()){
  alert("Это не твой профиль 😈");
  return;
}

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

  if (!editBox || !usernameInput || !username) return;

  // 🔥 если уже открыт — закрываем
  if (!editBox.classList.contains("hidden")) {
    editBox.classList.add("hidden");
    return;
  }

  // иначе открываем
  setText("usernameError", "");
  usernameInput.value = username.innerText.trim();
  editBox.classList.remove("hidden");
  usernameInput.focus();
}

function cancelUsernameEdit() {
  const editBox = document.getElementById("usernameEditBox");
  setText("usernameError", "");
  if (editBox) editBox.classList.add("hidden");
}

async function saveUsername() {
  if(!isMyProfile()){
  alert("Это не твой профиль 😈");
  return;
}
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

  if(!isMyProfile()){
  alert("Это не твой профиль 😈");
  return;
}

  clearMessages();

  const username = document.getElementById("editUsername").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  const avatar = document.getElementById("editAvatar").value || "";
  const soundcloud = document.getElementById("editSoundcloud").value.trim();
  const instagram = document.getElementById("editInstagram").value.trim();
  const twitter = document.getElementById("editTwitter").value.trim();
  const telegram = document.getElementById("editTelegram").value.trim();
  const website = document.getElementById("editWebsite").value.trim();
  const username_tag = document.getElementById("editUsernameTag").value.trim();

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
        username_tag,
        bio,
        soundcloud,
        instagram,
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


function initProfileUser(){
  loadProfile()
}

async function loadTracks() {

  const container = document.getElementById("tracksContainer")
  if (!container) return

  const params = new URLSearchParams(window.location.search)
  const id = params.get("id")

  let url = "/user-tracks"
  if (id) url += "?id=" + id

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token
    }
  })

  const tracks = await res.json()

  container.innerHTML = ""

  tracks.forEach(track => {
    container.innerHTML += `
      <div class="track-card">

        <img src="${track.cover || '/images/default-avatar.jpg'}" class="track-cover">

        <div class="track-info">
          <div class="track-title">${track.title}</div>
          <div class="track-artist">${track.artist || "Unknown"}</div>
        </div>

        <button class="track-play"
          onclick="playTrackGlobal({
            title: '${track.title}',
            artist: '${track.artist}',
            cover: '${track.cover}',
            audioSrc: '${track.audio || ""}',
            soundcloud: '${track.soundcloud || ""}'
          })"
        >
          <i class="fa-solid fa-play"></i>
        </button>

      </div>
    `
  })

}

function addTrack(){

  const title = prompt("Название трека")
  if(!title) return

  const artist = prompt("Исполнитель")
  const audio = prompt("Ссылка на mp3 (или пусто)")
  const soundcloud = prompt("Ссылка на SoundCloud (или пусто)")
  const cover = prompt("Ссылка на обложку (или пусто)")

  fetch("/add-user-track",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:"Bearer "+token
    },
    body: JSON.stringify({
      title,
      artist,
      audio,
      soundcloud,
      cover
    })
  })
  .then(res=>res.json())
  .then(()=>{
    loadTracks()
  })

}

function initTrackModal() {
  const coverInput = document.getElementById("trackCoverInput");
  const coverPreview = document.getElementById("trackCoverPreview");
  const coverPlaceholder = document.getElementById("trackCoverPlaceholder");

  const audioInput = document.getElementById("trackAudioInput");
  const fileName = document.getElementById("trackFileName");
  const audioPlayer = document.getElementById("trackAudioPlayer");
  const preview = document.getElementById("trackPreview");

  if (coverInput) {
    coverInput.onchange = () => {
      const file = coverInput.files[0];
      if (!file) return;

      coverPreview.src = URL.createObjectURL(file);
      coverPreview.style.display = "block";
      coverPlaceholder.style.display = "none";
    };
  }

  if (audioInput) {
    audioInput.onchange = () => {
      const file = audioInput.files[0];
      if (!file) return;

      fileName.textContent = file.name;
      audioPlayer.src = URL.createObjectURL(file);
      preview.style.display = "block";
    };
  }
}

function resetTrackModal() {
  const title = document.getElementById("trackTitle");
  const artist = document.getElementById("trackArtist");
  const soundcloud = document.getElementById("trackSoundcloud");

  const coverInput = document.getElementById("trackCoverInput");
  const coverPreview = document.getElementById("trackCoverPreview");
  const coverPlaceholder = document.getElementById("trackCoverPlaceholder");

  const audioInput = document.getElementById("trackAudioInput");
  const fileName = document.getElementById("trackFileName");
  const audioPlayer = document.getElementById("trackAudioPlayer");
  const preview = document.getElementById("trackPreview");

  const status = document.getElementById("trackStatus");

  if (title) title.value = "";
  if (artist) artist.value = "";
  if (soundcloud) soundcloud.value = "";

  if (coverInput) coverInput.value = "";
  if (coverPreview) {
    coverPreview.src = "";
    coverPreview.style.display = "none";
  }
  if (coverPlaceholder) {
    coverPlaceholder.style.display = "flex";
  }

  if (audioInput) audioInput.value = "";
  if (fileName) fileName.textContent = "Файл не выбран";
  if (audioPlayer) {
    audioPlayer.src = "";
    audioPlayer.load();
  }
  if (preview) preview.style.display = "none";

  if (status) status.textContent = "";
}

async function submitUserTrack() {

  const title = document.getElementById("trackTitle")?.value.trim()
  const artist = document.getElementById("trackArtist")?.value.trim()

  const genre = document.getElementById("trackGenre")?.value || ""
  const producer = document.getElementById("trackProducer")?.value || ""
  const description = document.getElementById("trackDescription")?.value || ""

  const tags = window.getTrackTags ? window.getTrackTags() : []

  const coverFile = document.getElementById("trackCoverInput")?.files[0] || null
  const audioFile = document.getElementById("trackAudioInput")?.files[0] || null

  const status = document.getElementById("trackStatus")
  if (status) status.textContent = ""

  if (!title) {
    if (status) status.textContent = "Название обязательно"
    return
  }

  const formData = new FormData()

  formData.append("title", title)
  formData.append("artist", artist)
  formData.append("genre", genre)
  formData.append("producer", producer)
  formData.append("description", description)
  formData.append("tags", JSON.stringify(tags))

  if (coverFile) formData.append("cover", coverFile)
  if (audioFile) formData.append("audio", audioFile)

  try {

    const res = await fetch("/add-user-track", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (status) status.textContent = data.error || "Ошибка загрузки"
      return
    }

    // 🔥 УСПЕХ
    if (status) status.textContent = "Трек загружен 🚀"

    closeTrackModal()
    resetTrackModal()
    await loadTracks()

  } catch (err) {
    console.error(err)
    if (status) status.textContent = "Ошибка сети"
  }

}

function openTrackModal() {
  const modal = document.getElementById("trackModal");
  if (!modal) return;

  modal.style.display = "flex";
  resetTrackModal();
}

function closeTrackModal() {
  const modal = document.getElementById("trackModal");
  if (!modal) return;

  modal.style.display = "none";
}



function initTrackTags(){

  const container = document.getElementById("trackTagsContainer")
  const input = document.getElementById("trackTagsInput")

  if(!container || !input) return

  let tags = []

  input.addEventListener("keydown", (e) => {

    if(e.key === "Enter"){
      e.preventDefault()

      const value = input.value.trim().toLowerCase()
      if(!value || tags.includes(value)) return

      tags.push(value)

      const tag = document.createElement("div")
      tag.className = "tag"

      const span = document.createElement("span")
      span.textContent = value

      const remove = document.createElement("span")
      remove.textContent = "×"
      remove.className = "tag-remove"

      remove.onclick = () => {
        tag.remove()
        tags = tags.filter(t => t !== value)
      }

      tag.appendChild(span)
      tag.appendChild(remove)

      container.insertBefore(tag, input)

      input.value = ""
    }

  })

  // 👉 делаем доступ к тегам глобально
  window.getTrackTags = () => tags

}

function loadMentions() {

  const container = document.getElementById("mentionsContainer")
  if (!container) return

  const mentions = [
    "DJ Alex упомянул тебя в посте",
    "Producer123 оценил твой трек 🔥"
  ]

  container.innerHTML = ""

  mentions.forEach(text => {
    container.innerHTML += `
      <div class="mention-card">
        ${text}
      </div>
    `
  })

}

window.openEdit = openEdit
window.closeEdit = closeEdit
window.saveProfile = saveProfile

window.editUsername = editUsername
window.saveUsername = saveUsername
window.cancelUsernameEdit = cancelUsernameEdit

window.openTrackModal = openTrackModal
window.closeTrackModal = closeTrackModal
window.submitUserTrack = submitUserTrack