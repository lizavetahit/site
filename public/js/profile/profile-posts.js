async function loadPosts(){

const res = await fetch("/my-posts",{
headers:{
Authorization:"Bearer "+token
}
})

if(!res.ok){
    console.error("Ошибка загрузки постов")
    return
  }

const posts = await res.json()
window.currentPosts = posts

const container = document.getElementById("postsContainer")
if(!container) return

container.innerHTML=""

posts.forEach(post=>{

let mediaHTML = ""

if(post.media_type === "image"){

mediaHTML = `
<div class="post-media-wrapper">
<img src="${post.media_url}" class="post-media">
</div>
`

}

if(post.media_type === "video"){

mediaHTML = `
<div class="post-media-wrapper video-player">

  <video class="video-element" preload="metadata">
    <source src="${post.media_url}">
  </video>

  <div class="video-overlay">
    <i class="fa-solid fa-play"></i>
  </div>

  <div class="video-ui">

    <div class="video-progress">
      <div class="video-progress-bar"></div>
    </div>

    <div class="video-controls">

      <button class="video-btn play-btn">
        <i class="fa-solid fa-play"></i>
      </button>

      <div class="video-time">
        <span class="current">0:00</span>
        /
        <span class="duration">0:00</span>
      </div>

      <div class="video-spacer"></div>

      <button class="video-btn mute-btn">
        <i class="fa-solid fa-volume-high"></i>
      </button>

      <input class="volume" type="range" min="0" max="1" step="0.05" value="1">

      <button class="video-btn fullscreen-btn">
        <i class="fa-solid fa-expand"></i>
      </button>

    </div>

  </div>

</div>
`

}

container.innerHTML += `
<div class="post-card">

<div class="post-header">

<div class="post-user">

<img src="${post.avatar || "/images/default-avatar.jpg"}" class="post-avatar">

<div class="post-user-info">

<div class="post-username">${post.username || "User"}</div>

<div class="post-date">${post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}</div>

</div>

</div>

<div class="post-menu-container">

<button class="post-menu-btn" onclick="togglePostMenu(${post.id})">
<i class="fa-solid fa-ellipsis"></i>
</button>

<div id="postMenu-${post.id}" class="post-menu hidden">

<button class="danger" onclick="deletePost(${post.id})">
<i class="fa-solid fa-trash"></i>
Удалить
</button>

<button onclick="editPost(${post.id})">
<i class="fa-solid fa-pen"></i>
Редактировать
</button>

<button onclick="archivePost(${post.id})">
<i class="fa-solid fa-box-archive"></i>
Архив
</button>

<button onclick="pinPost(${post.id})">
<i class="fa-solid fa-thumbtack"></i>
Закрепить
</button>

</div>

</div>

</div> <!-- ВОТ ЭТОЙ СТРОКИ У ТЕБЯ НЕ ХВАТАЛО -->

<div class="post-text">
  <p>${post.content || ""}</p>
</div>

<!-- 🔥 МЕДИА НИЖЕ -->
${mediaHTML ? mediaHTML : ""}

</div>


`

})

document.querySelectorAll(".volume").forEach(slider=>{
updateVolumeSlider(slider)
})

const players = document.querySelectorAll(".video-player")

if(players.length){
  players.forEach(player => {

    if(!player) return

    const video = player.querySelector("video")
    const slider = player.querySelector(".volume")

    if(video && slider){
      video.volume = slider.value
    }

  })
}

}

const videos = document.querySelectorAll(".video-element")

if(videos.length){
  videos.forEach(video=>{
    if(video) videoObserver.observe(video)
  })
}



const videoObserver = new IntersectionObserver(entries => {

entries.forEach(entry => {

const video = entry.target

if(!entry.isIntersecting){
video.pause()
}

})

},{
threshold:0.4
})

function togglePostMenu(id){

const menu = document.getElementById("postMenu-"+id)
if(!menu) return

const isOpen = menu.style.display === "flex"

// закрываем все
document.querySelectorAll(".post-menu").forEach(m=>{
m.style.display = "none"
m.classList.add("hidden")
})

if(!isOpen){
menu.style.display = "flex"
menu.classList.remove("hidden")
}

document.querySelectorAll(".post-card").forEach(p=>{
p.classList.remove("active")
})

const card = menu.closest(".post-card")
if(card){
card.classList.add("active")
}

}

async function deletePost(id){

const confirmDelete = confirm("Удалить публикацию?")

if(!confirmDelete) return

try{

const res = await fetch("/delete-post/"+id,{
method:"DELETE",
headers:{ Authorization:"Bearer "+token }
})

if(!res.ok){
alert("Ошибка удаления")
return
}

loadPosts()

}catch(err){
console.error(err)
alert("Ошибка удаления")
}

}
function pinPost(id){
alert("Функция закрепления будет добавлена на сервере")
}

async function archivePost(id){

const token = localStorage.getItem("token")

try{

const res = await fetch("/archive-post/"+id,{
method:"PUT",
headers:{
Authorization:"Bearer "+token
}
})

if(!res.ok){
alert("Ошибка архивации")
return
}

loadPosts()

}catch(err){
console.error(err)
alert("Ошибка архивации")
}

}

function editPost(id){

  const post = window.currentPosts?.find(p => p.id === id)
  if(!post) return

  const modal = document.getElementById("postModal")
  if(!modal) return

  // 👉 включаем режим редактирования
  modal.dataset.editId = id

  // 👉 меняем заголовок
  const title = document.querySelector(".post-modal-title")
  if(title){
    title.innerText = "Редактировать публикацию"
  }

  // 👉 текст
  const text = document.getElementById("postText")
  if(text){
    text.value = post.content || ""
  }

  // 🔥 ВАЖНО: подгружаем медиа обратно
  if(post.media_type === "image"){
    loadImageFromUrl(post.media_url)
  }

  if(post.media_type === "video"){
    loadVideoFromUrl(post.media_url)
  }

  openPostModal()
}

function initPosts(){
loadPosts()
}

document.addEventListener("click",function(e){

const player = e.target.closest(".video-player")
if(!player) return

const video = player.querySelector("video")
const playIcon = player.querySelector(".play-btn i")

if(
e.target.closest(".play-btn") ||
e.target.closest(".video-overlay") ||
e.target.tagName === "VIDEO"
){

if(video.paused){

video.play()
player.classList.add("playing")
playIcon.className="fa-solid fa-pause"

}else{

video.pause()
player.classList.remove("playing")
playIcon.className="fa-solid fa-play"

}

}

})

document.addEventListener("timeupdate",function(e){

if(e.target.tagName!=="VIDEO") return

const video=e.target
const player = video.closest(".video-player")
if(!player) return

const bar = player.querySelector(".video-progress-bar")
if(!bar) return
const current=player.querySelector(".current")
const duration=player.querySelector(".duration")

if(video.duration){

bar.style.width=(video.currentTime/video.duration*100)+"%"

const cm=Math.floor(video.currentTime/60)
const cs=Math.floor(video.currentTime%60).toString().padStart(2,"0")

current.textContent=cm+":"+cs

const dm=Math.floor(video.duration/60)
const ds=Math.floor(video.duration%60).toString().padStart(2,"0")

duration.textContent=dm+":"+ds

}

},true)

document.addEventListener("click",function(e){

const progress=e.target.closest(".video-progress")
if(!progress) return

const player=progress.closest(".video-player")
const video=player.querySelector("video")

const rect=progress.getBoundingClientRect()
const percent=(e.clientX-rect.left)/rect.width

video.currentTime=percent*video.duration

})

document.addEventListener("input",function(e){

if(!e.target.classList.contains("volume")) return

const slider = e.target
const player = slider.closest(".video-player")
const video = player.querySelector("video")

video.volume = slider.value

updateVolumeSlider(slider)

})

document.addEventListener("click",function(e){

if(!e.target.closest(".fullscreen-btn")) return

const player = e.target.closest(".video-player")

if(!document.fullscreenElement){

player.requestFullscreen()

}else{

document.exitFullscreen()

}

})

let hideTimer=null

document.addEventListener("mousemove",function(e){

const player=e.target.closest(".video-player")
if(!player) return

player.classList.remove("hide-ui")

clearTimeout(hideTimer)

hideTimer=setTimeout(()=>{

player.classList.add("hide-ui")

},2000)

})

document.addEventListener("pause",function(e){

if(e.target.tagName!=="VIDEO") return

const player=e.target.closest(".video-player")

player.classList.remove("hide-ui")

},true)

function updateVolumeSlider(slider){

const percent = slider.value * 100

slider.style.background = `linear-gradient(
90deg,
#8b5cf6 0%,
#8b5cf6 ${percent}%,
rgba(255,255,255,.25) ${percent}%,
rgba(255,255,255,.25) 100%
)`


}

document.addEventListener("play", function(e){

if(e.target.tagName !== "VIDEO") return

const video = e.target
const player = video.closest(".video-player")

if(!player) return

const icon = player.querySelector(".play-btn i")

player.classList.add("playing")
icon.className = "fa-solid fa-pause"

}, true)


document.addEventListener("pause", function(e){

if(e.target.tagName !== "VIDEO") return

const video = e.target
const player = video.closest(".video-player")

if(!player) return

const icon = player.querySelector(".play-btn i")

player.classList.remove("playing")
icon.className = "fa-solid fa-play"

}, true)

document.addEventListener("click",function(e){

if(!e.target.closest(".post-menu-container")){

document.querySelectorAll(".post-menu").forEach(menu=>{
menu.classList.add("hidden")
})

}

})


window.togglePostMenu = togglePostMenu
window.deletePost = deletePost
window.archivePost = archivePost
window.editPost = editPost

function loadImageFromUrl(url) {
  fetch(url)
    .then(res => res.blob())
    .then(blob => {
      const file = new File([blob], "image.jpg", { type: blob.type });
      initImageEditor(file);
    });
}

function loadVideoFromUrl(url) {
  fetch(url)
    .then(res => res.blob())
    .then(blob => {
      const file = new File([blob], "video.mp4", { type: blob.type });
      initVideoEditor(file);
    });
}