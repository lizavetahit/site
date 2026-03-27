
let currentUser = {}

async function initTracks(){
  await loadCurrentUser()
  loadTracks()
}
async function loadCurrentUser(){

  try{

    const res = await fetch("/me", {
      headers:{
        Authorization:"Bearer "+localStorage.getItem("token")
      }
    })

    const data = await res.json()

    currentUser = data

  }catch(err){
    console.error("user load error", err)
  }

}

async function loadTracks(){

  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id");

  let url = "/user-tracks";

  if(profileId){
    url += "?id=" + profileId;
  }

  const res = await fetch(url, {
    headers:{
      Authorization:"Bearer "+localStorage.getItem("token")
    }
  })

  const tracks = await res.json()

  const container = document.getElementById("tracksContainer")
  if(!container) return

  container.innerHTML = ""

  tracks.forEach(track => {
    let cover = "/images/default-cover.jpg"

if(track.cover){
  if(track.cover.startsWith("http")){
    cover = track.cover
  }else{
    cover = "/" + track.cover.replace(/^\/+/, "")
  }
}

    container.innerHTML += `
    
<div class="track-card">

  <div class="track-main">

    <img src="${cover}" class="track-cover">

    <div class="track-info">

      <div class="track-top">

        <div>
          <div class="track-artist">${track.artist || "Unknown"}</div>
          <div class="track-title">${track.title}</div>
        </div>

        <div class="track-meta">
          <span class="track-genre">${track.genre || "—"}</span>
          <span class="track-date">
            ${track.createdAt ? new Date(track.createdAt).toLocaleDateString() : ""}
          </span>
        </div>

      </div>

      <div class="track-player">

        <button class="play-btn">
          <i class="fa-solid fa-play"></i>
        </button>

        <div class="track-progress">
          <div class="track-bar"></div>
        </div>

        <audio src="${track.audio || ""}"></audio>

      </div>

    </div>

  </div>

 

  <div class="track-comment">

    <img src="${currentUser.avatar || '/images/default-avatar.jpg'}" class="comment-avatar">

    <input placeholder="Написать комментарий...">

    <button>➤</button>

  </div>

   <div class="track-actions">

    <button><i class="fa-solid fa-heart"></i></button>
    <button><i class="fa-solid fa-retweet"></i></button>
    <button><i class="fa-solid fa-link"></i></button>
    <button><i class="fa-solid fa-ellipsis"></i></button>

  </div>

</div>

    `

  })

}

// ▶️ PLAY
document.addEventListener("click", (e)=>{

  const btn = e.target.closest(".play-btn")
  if(!btn) return

  const card = btn.closest(".track-card")
  const audio = card.querySelector("audio")
  const icon = btn.querySelector("i")

  if(!audio) return

  // ❗ стоп всех других треков
  document.querySelectorAll(".track-card audio").forEach(a=>{
    if(a !== audio){
      a.pause()
      a.currentTime = 0

      const otherBtn = a.closest(".track-card")?.querySelector(".play-btn i")
      if(otherBtn){
        otherBtn.className = "fa-solid fa-play"
      }
    }
  })

  if(audio.paused){

    audio.play().catch(err=>{
      console.log("play error", err)
    })

    icon.className = "fa-solid fa-pause"

  }else{

    audio.pause()
    icon.className = "fa-solid fa-play"

  }

})