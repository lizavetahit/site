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
      trackCard.addEventListener("click", () => {
        window.location.href = `/html/track.html?id=${track.id}`
      })

      // HTML без onclick
      trackCard.innerHTML = `
  <div class="track-left">

    <div class="track-number">${index + 1}</div>

    <div class="cover-wrap">
      <img src="${track.cover || '/images/cover-placeholder.jpg'}" class="track-cover">
    </div>

    <div class="track-info">
      <div class="track-artist">${track.artist}</div>
      <div class="track-title">${track.title}</div>
    </div>

  </div>

  <div class="track-actions">
    <button class="judge-btn">
      <i class="fa-solid fa-play"></i>
      Оценить
    </button>

    <button class="delete-btn">
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>
`

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
    const res = await fetch(`/api/tracks/${track.id}`, {
      method: "DELETE"
    })

    if (!res.ok) {
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