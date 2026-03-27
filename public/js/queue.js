const queueList = document.getElementById("queueList")

async function loadQueue() {
  try {
    const res = await fetch("/api/tracks/queue")
    const tracks = await res.json()

    queueList.innerHTML = ""

    tracks
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  .forEach((track, index) => {

      const trackCard = document.createElement("div")
      trackCard.className = "track-card"

      // 👉 переход по карточке
      trackCard.addEventListener("click", (e) => {

  // ❗ если клик по кнопке — НЕ переходим
  if (e.target.closest(".judge-btn") || e.target.closest(".delete-btn")) {
    return
  }

  window.location.href = `/html/track.html?id=${track.id}`
})

      // HTML без onclick
      trackCard.innerHTML = `
<div class="track-main">

  <div class="track-left">

    <div class="track-number">${index + 1}</div>

    <div class="cover-wrap">
      <img src="${track.cover || '/images/default-cover.jpg'}" class="track-cover">
    </div>

    <div class="track-info">
      <div class="track-artist">${track.artist}</div>
      <div class="track-title">${track.title}</div>
    </div>

  </div>

  <div class="track-right">
    <button class="judge-btn">
      <i class="fa-solid fa-play"></i>
      Оценить
    </button>

    <button class="delete-btn">
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>

</div>
`;

      // 👉 находим кнопки
      const judgeBtn = trackCard.querySelector(".judge-btn")
      const deleteBtn = trackCard.querySelector(".delete-btn")

      // 👉 стопаем всплытие (ВАЖНО)
      judgeBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        startJudge(track.id)
      })

      deleteBtn.addEventListener("click", async (e) => {
  e.preventDefault()
  e.stopPropagation()

  const confirmed = confirm("Удалить трек?")
  if (!confirmed) return

  try {
    const token = localStorage.getItem("token")

const res = await fetch(`/api/tracks/${track.id}`, {
  method: "DELETE",
  headers: {
    Authorization: "Bearer " + token
  }
})

    if (!res.ok) {
  const text = await res.text()
  console.log("DELETE ERROR:", text)
  throw new Error("Ошибка удаления")
}

    // 🔥 УДАЛЯЕМ ИЗ DOM БЕЗ ПЕРЕЗАГРУЗКИ
    trackCard.remove()

  } catch (err) {
    console.error(err)
    alert("Ошибка при удалении")
  }
})

      queueList.appendChild(trackCard)
    })

  } catch (err) {
    console.error("Ошибка загрузки очереди", err)
  }
}

function startJudge(trackId) {
  window.location.href = `/html/judge.html?track=${trackId}`
}



// первая загрузка
loadQueue()

// автообновление
setInterval(loadQueue, 5000)

async function initAdminControls() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch("/me", {
    headers: { Authorization: "Bearer " + token }
  });

  const user = await res.json();

  if (user.role !== "admin") return;

  const controls = document.getElementById("adminControls");
  controls.classList.remove("hidden");

  const openBtn = document.getElementById("openQueue");
  const pauseBtn = document.getElementById("pauseQueue");
  const resumeBtn = document.getElementById("resumeQueue");
  const closeBtn = document.getElementById("closeQueue");

  async function setState(state) {
  await fetch("/api/queue/state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ state })
  });

  loadQueue();
  loadQueueState(); // 🔥 ВОТ ЭТО ДОБАВИЛИ
}

  openBtn.onclick = () => setState("open");
  pauseBtn.onclick = () => setState("paused");
  resumeBtn.onclick = () => setState("open");
  closeBtn.onclick = () => setState("closed");
}

initAdminControls().catch(() => {}); // 👈 чтобы не ломало всё

async function loadQueueState() {
  try {
    const res = await fetch("/api/queue/state");

    if (!res.ok) {
      throw new Error("bad response");
    }

    let data;

    try {
      data = await res.json();
    } catch {
      data = { state: "open" };
    }

    console.log("STATE:", data);

    const el = document.getElementById("queueStatusText");
    if (!el) return;

    el.className = "queue-status " + data.state;

    if (data.state === "open") el.textContent = "Открыта";
    if (data.state === "closed") el.textContent = "Закрыта";
    if (data.state === "paused") el.textContent = "Приостановлена";

  } catch (err) {
    console.error("STATE ERROR:", err);

    const el = document.getElementById("queueStatusText");
    if (el) {
      el.textContent = "Ошибка";
      el.className = "queue-status closed";
    }
  }
}

loadQueueState();
setInterval(loadQueueState, 3000);