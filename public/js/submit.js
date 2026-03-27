document.addEventListener("DOMContentLoaded", () => {

  async function checkQueueState() {
  try {
    const res = await fetch("/api/queue/state");
    const data = await res.json();

    const submitBtn = document.querySelector("button[type='submit']");

    if (data.state !== "open") {
      submitBtn.disabled = true;

      if (data.state === "closed") {
        setStatus("Очередь закрыта", "error");
      }

      if (data.state === "paused") {
        setStatus("Очередь временно приостановлена", "error");
      }
    }

  } catch (err) {
    console.error(err);
  }
}

  const coverInput = document.getElementById("coverInput");
  const coverPreview = document.getElementById("coverPreview");
  const coverPlaceholder = document.getElementById("coverPlaceholder");

  const audioInput = document.getElementById("audioInput");
  const audioPreview = document.getElementById("audioPreview");
  const audioPreviewWrap = document.getElementById("audioPreviewWrap");
  const audioFileName = document.getElementById("audioFileName");

  const soundcloudInput = document.getElementById("soundcloudInput");
  const artistInput = document.getElementById("artistInput");
  const titleInput = document.getElementById("titleInput");
  const fetchBtn = document.getElementById("fetchBtn");
  const statusText = document.getElementById("statusText");
  const trackForm = document.getElementById("trackForm");

  let externalCoverUrl = null;
  

  function setStatus(message, type = "") {
    statusText.textContent = message;
    statusText.className = "status";
    if (type) statusText.classList.add(type);
  }

  coverInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    externalCoverUrl = null;

    const imageUrl = URL.createObjectURL(file);
    coverPreview.src = imageUrl;
    coverPreview.style.display = "block";
    coverPlaceholder.style.display = "none";
  });

  audioInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) {
      audioFileName.textContent = "Файл не выбран";
      audioPreview.removeAttribute("src");
      audioPreviewWrap.style.display = "none";
      return;
    }

    audioFileName.textContent = file.name;
    audioPreview.src = URL.createObjectURL(file);
    audioPreviewWrap.style.display = "block";
  });

  fetchBtn.addEventListener("click", async () => {
    const url = soundcloudInput.value.trim();

    if (!url) {
      setStatus("Вставь ссылку SoundCloud", "error");
      return;
    }

    try {
      setStatus("Подтягиваю данные...");

      const response = await fetch(`/api/soundcloud?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка SoundCloud");
      }

      if (data.artist) {
        artistInput.value = data.artist;
      }

      if (data.title) {
        titleInput.value = data.title;
      }

      if (data.artwork) {
  coverPreview.src = data.artwork;
  coverPreview.style.display = "block";
  coverPlaceholder.style.display = "none";

  externalCoverUrl = data.artwork;
}

      setStatus("Данные подтянуты", "success");
    } catch (error) {
      console.error(error);
      setStatus("Не удалось подтянуть данные из SoundCloud", "error");
    }
  });

  trackForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const audioFile = audioInput.files[0];
    const coverFile = coverInput.files[0];
    const soundcloudUrl = soundcloudInput.value.trim();
    const artist = artistInput.value.trim();
    const title = titleInput.value.trim();

    if (!audioFile && !soundcloudUrl) {
      setStatus("Добавь аудиофайл или ссылку SoundCloud", "error");
      return;
    }

    if (!artist || !title) {
      setStatus("Заполни автора и название", "error");
      return;
    }

    const formData = new FormData();

formData.append("artist", artist);
formData.append("title", title);
formData.append("soundcloud", soundcloudUrl);

if (audioFile) formData.append("audio", audioFile);

// 🔥 ВАЖНАЯ ЛОГИКА
if (externalCoverUrl) {
  formData.append("coverUrl", externalCoverUrl);
} else if (coverFile) {
  formData.append("cover", coverFile);
}

    try {
      setStatus("Отправка...");

      const token = localStorage.getItem("token");

const res = await fetch("/api/tracks", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token
  },
  body: formData
});

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Ошибка отправки");
      }

      setStatus("Трек успешно отправлен", "success");

      trackForm.reset();
      externalCoverUrl = null;

      coverPreview.src = "";
      coverPreview.style.display = "none";
      coverPlaceholder.style.display = "flex";

      audioPreview.removeAttribute("src");
      audioPreviewWrap.style.display = "none";
      audioFileName.textContent = "Файл не выбран";

    } catch (err) {
      console.error(err);
      setStatus(err.message || "Ошибка отправки", "error");
    }
  });

  checkQueueState();
setInterval(checkQueueState, 3000);
});