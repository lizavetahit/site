const token = localStorage.getItem("token")

if(!token){
window.location.href="/html/login.html"
}

async function loadProfile(){

const res = await fetch("/profile",{
headers:{Authorization:"Bearer "+token}
})

const user = await res.json()

document.getElementById("username").innerText = user.username
document.getElementById("email").innerText = user.email
document.getElementById("bio").innerText = user.bio || ""

document.getElementById("avatar").src =
user.avatar || "https://i.pravatar.cc/150"

document.getElementById("socialLinks").innerHTML=`

${user.soundcloud?`<a href="${user.soundcloud}" target="_blank">🎧</a>`:""}

${user.instagram?`<a href="${user.instagram}" target="_blank">📸</a>`:""}

${user.telegram?`<a href="https://t.me/${user.telegram}" target="_blank">✈</a>`:""}

${user.website?`<a href="${user.website}" target="_blank">🌐</a>`:""}

`

document.getElementById("socialLinks").innerHTML=`

${user.soundcloud?`<a href="${user.soundcloud}" target="_blank">SoundCloud</a>`:""}
${user.instagram?`<a href="${user.instagram}" target="_blank">Instagram</a>`:""}
${user.twitter?`<a href="${user.twitter}" target="_blank">Twitter</a>`:""}
${user.telegram?`<a href="https://t.me/${user.telegram}" target="_blank">Telegram</a>`:""}
${user.website?`<a href="${user.website}" target="_blank">Website</a>`:""}

`

document.getElementById("editUsername").value=user.username||""
document.getElementById("editBio").value=user.bio||""
document.getElementById("editAvatar").value=user.avatar||""
document.getElementById("editSoundcloud").value=user.soundcloud||""
document.getElementById("editInstagram").value=user.instagram||""
document.getElementById("editTwitter").value=user.twitter||""
document.getElementById("editTelegram").value=user.telegram||""
document.getElementById("editWebsite").value=user.website||""

}

function openEdit(){
document.getElementById("editModal").style.display="block"
}

function closeEdit(){
document.getElementById("editModal").style.display="none"
}

async function saveProfile(){

const username=document.getElementById("editUsername").value
const bio=document.getElementById("editBio").value
const avatar=document.getElementById("editAvatar").value
const soundcloud=document.getElementById("editSoundcloud").value
const instagram=document.getElementById("editInstagram").value
const twitter=document.getElementById("editTwitter").value
const telegram=document.getElementById("editTelegram").value
const website=document.getElementById("editWebsite").value

const res=await fetch("/update-profile",{

method:"PUT",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
username,
bio,
avatar,
soundcloud,
instagram,
twitter,
telegram,
website
})

})

const data=await res.json()

if(data.error==="username_taken"){
document.getElementById("profileError").innerText="Этот ник уже занят"
return
}

closeEdit()
loadProfile()

}

function createPost(){
window.location.href="/html/create-post.html"
}

function addTrack(){
window.location.href="/html/submit.html"
}

loadProfile()

document.getElementById("avatarInput").addEventListener("change",async function(){

const file=this.files[0]

const formData=new FormData()

formData.append("avatar",file)

const res=await fetch("/upload-avatar",{
method:"POST",
body:formData
})

const data=await res.json()

await fetch("/update-profile",{

method:"PUT",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
avatar:data.avatar
})

})

loadProfile()

})

function editUsername(){

const newName=prompt("Введите новый ник")

if(!newName)return

updateField("username",newName)

}

function addLink(type){

const link=prompt("Вставьте ссылку")

if(!link)return

updateField(type,link)

}

async function updateField(field,value){

const body={}
body[field]=value

await fetch("/update-profile",{

method:"PUT",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify(body)

})

loadProfile()

}