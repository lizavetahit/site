const queueList = document.getElementById("queueList")

async function loadQueue(){

try{

const res = await fetch("/api/tracks/queue")

if(!res.ok) throw new Error("api error")

const tracks = await res.json()

renderTracks(tracks)

}catch(err){

// временные тестовые треки

const demoTracks = [

{
id:1,
artist:"Drake",
title:"Gods Plan",
cover:"https://i.scdn.co/image/ab67616d0000b273947f6b95c89e4c1f7c43a44b"
},

{
id:2,
artist:"Travis Scott",
title:"FE!N",
cover:"https://i.scdn.co/image/ab67616d0000b2739b7e6cba6e8c7c3d6c02ab73"
},

{
id:3,
artist:"Metro Boomin",
title:"Creepin",
cover:"https://i.scdn.co/image/ab67616d0000b2732e8a8d36c1c7b7a4c0e9f1a6"
}

]

renderTracks(demoTracks)

}

}

function renderTracks(tracks){

queueList.innerHTML=""

tracks.forEach(track=>{

const card=document.createElement("div")
card.className="track-card"

card.innerHTML=`

<div class="track-left">

<img src="${track.cover}" class="track-cover">

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

queueList.appendChild(card)

})

}

function startJudge(trackId){

window.location.href=`/html/judge.html?track=${trackId}`

}

async function deleteTrack(trackId){

if(!confirm("Удалить трек?")) return

await fetch(`/api/tracks/${trackId}`,{
method:"DELETE"
})

loadQueue()

}

loadQueue()