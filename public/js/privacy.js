const token = localStorage.getItem("token")


async function changePassword(){

const currentPassword = document.getElementById("currentPassword").value
const newPassword = document.getElementById("newPassword").value

const res = await fetch("/change-password",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},
body:JSON.stringify({
currentPassword,
newPassword
})
})

if(res.ok){

alert("Пароль успешно изменён")

}else{

alert("Ошибка смены пароля")

}

}



async function changeEmail(){

const newEmail = document.getElementById("newEmail").value

const res = await fetch("/change-email",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},
body:JSON.stringify({
email:newEmail
})
})

if(res.ok){

alert("Почта изменена")

}else{

alert("Ошибка")

}

}



async function deleteAccount(){

if(!confirm("Вы точно хотите удалить аккаунт?")) return

const res = await fetch("/delete-account",{
method:"DELETE",
headers:{
Authorization:"Bearer "+token
}
})

if(res.ok){

localStorage.removeItem("token")

window.location.href="/html/register.html"

}else{

alert("Ошибка удаления аккаунта")

}

}