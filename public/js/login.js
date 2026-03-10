const form=document.getElementById("loginForm")
const error=document.getElementById("error")

form.addEventListener("submit",async(e)=>{

e.preventDefault()

const email=document.getElementById("email").value
const password=document.getElementById("password").value

const res=await fetch("/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({email,password})

})

if(!res.ok){

error.innerText="Неверный email или пароль"
return

}

const data=await res.json()

localStorage.setItem("token",data.token)

window.location.href="/html/index.html"

})