function switchTab(tab){

document.querySelectorAll(".tab-content").forEach(el=>{
el.classList.remove("active")
})

document.querySelectorAll(".tab-btn").forEach(el=>{
el.classList.remove("active")
})

if(tab==="posts"){
document.getElementById("postsTab").classList.add("active")
document.querySelectorAll(".tab-btn")[0].classList.add("active")
}

if(tab==="tracks"){
document.getElementById("tracksTab").classList.add("active")
document.querySelectorAll(".tab-btn")[1].classList.add("active")
}

if(tab==="mentions"){
document.getElementById("mentionsTab").classList.add("active")
document.querySelectorAll(".tab-btn")[2].classList.add("active")
}
togglePostButton(tab)
console.log("SWITCH TAB:", tab)
handleProfileUI();
}

function initTabs(){

  // убираем всё
  document.querySelectorAll(".tab-content").forEach(el=>{
    el.classList.remove("active")
  })

  document.querySelectorAll(".tab-btn").forEach(el=>{
    el.classList.remove("active")
  })

  // включаем posts
  switchTab("posts")

}

function togglePostButton(tab){

  const btn = document.querySelector("#postsTab .create-post-btn")

  if(!btn) return

  if(tab === "posts"){
    btn.style.display = ""
  }else{
    btn.style.display = "none"
  }

}

window.switchTab = switchTab