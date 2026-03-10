const form = document.getElementById("registerForm")
const error = document.getElementById("error")

form.addEventListener("submit", async function(e){

e.preventDefault()

const username = document.getElementById("username").value.trim()
const email = document.getElementById("email").value.trim()
const password = document.getElementById("password").value
const password2 = document.getElementById("password2").value

error.innerText=""

if(username.length < 3){
error.innerText="Имя пользователя должно быть минимум 3 символа"
return
}

if(!email.includes("@")){
error.innerText="Введите корректный email"
return
}

if(password.length < 8){
error.innerText="Пароль должен быть минимум 8 символов"
return
}

if(password !== password2){
error.innerText="Пароли не совпадают"
return
}

try{

const res = await fetch("/register",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username,
email,
password
})

})

if(res.ok){

alert("Регистрация успешна!")
window.location.href="login.html"

}else{

error.innerText="Ошибка регистрации"

}

}catch(err){

error.innerText="Ошибка соединения с сервером"

}

})