const queueList = document.getElementById("queueList")

async function loadQueue(){

try{

const res = await fetch("/api/tracks/queue")
const tracks = await res.json()

queueList.innerHTML=""

tracks.forEach(track=>{

const trackCard = document.createElement("div")
trackCard.className="track-card"

trackCard.innerHTML=`

<div class="track-left">

<img src="${track.cover || '/images/cover-placeholder.jpg'}" class="track-cover">

<div class="track-info">

<div class="track-artist">${track.artist}</div>
<div class="track-title">${track.title}</div>

</div>

</div>

<div class="track-actions">

<button class="judge-btn" onclick="startJudge(${track.id})">

<i class="fa-solid fa-play"></i>
Оценить

</button>

<button class="delete-btn" onclick="deleteTrack(${track.id})">

<i class="fa-solid fa-trash"></i>

</button>

</div>

`

queueList.appendChild(trackCard)

})

}catch(err){

console.error("Ошибка загрузки очереди",err)

}

}

function startJudge(trackId){

window.location.href = `/html/judge.html?track=${trackId}`

}

async function deleteTrack(trackId){

if(!confirm("Удалить трек?")) return

await fetch(`/api/tracks/${trackId}`,{
method:"DELETE"
})

loadQueue()

}

loadQueue()

setInterval(loadQueue,5000)