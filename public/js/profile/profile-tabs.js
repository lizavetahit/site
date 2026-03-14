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

}

function initTabs(){
  switchTab("posts")
}

window.switchTab = switchTab