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

const container = document.getElementById("postsContainer")
if(!container) return

container.innerHTML=""

posts.forEach(post=>{

let mediaHTML = ""

if(post.media_type === "image"){

mediaHTML = `<img src="${post.media_url}" class="post-media">`

}

if(post.media_type === "video"){

mediaHTML = `
<video controls class="post-media">
<source src="${post.media_url}">
</video>
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

<button class="post-menu-btn" onclick="togglePostMenu(${post.id})">
<i class="fa-solid fa-ellipsis"></i>
</button>

<div id="postMenu-${post.id}" class="post-menu hidden">

<button onclick="deletePost(${post.id})">
<i class="fa-solid fa-trash"></i> Удалить
</button>

<button onclick="archivePost(${post.id})">
<i class="fa-solid fa-box-archive"></i> Архивировать
</button>

<button onclick="editPost(${post.id})">
<i class="fa-solid fa-pen"></i> Редактировать
</button>

</div>

</div>

<div class="post-content">

${post.content ? `<p class="post-text">${post.content}</p>` : ""}

${mediaHTML ? `
<div class="post-media-wrapper">
${mediaHTML}
</div>
` : ""}

</div>

</div>
`

})

}

function togglePostMenu(id){

document.querySelectorAll(".post-menu").forEach(menu=>{
menu.classList.add("hidden")
})

const menu = document.getElementById("postMenu-"+id)

if(menu){
menu.classList.toggle("hidden")
}

}

async function deletePost(id){

if(!confirm("Удалить этот пост?")) return

try{

const res = await fetch("/delete-post/"+id,{
method:"DELETE",
headers:{
Authorization:"Bearer "+token
}
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

function archivePost(id){
alert("Архив будет добавлен позже")
}

function editPost(id){
alert("Редактирование будет добавлено позже")
}

function initPosts(){
loadPosts()
}

window.togglePostMenu = togglePostMenu
window.deletePost = deletePost
window.archivePost = archivePost
window.editPost = editPost