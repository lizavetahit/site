async function loadNavbar(){

const res = await fetch("/html/components/navbar.html")
const html = await res.text()

document.getElementById("navbar").innerHTML = html

initNavbar()

}

function initNavbar(){

const token = localStorage.getItem("token")

const authLinks = document.getElementById("authLinks")
const profileLinks = document.getElementById("profileLinks")

if(!authLinks || !profileLinks) return

if(token){
authLinks.style.display = "none"
profileLinks.style.display = "inline"
}else{
authLinks.style.display = "inline"
profileLinks.style.display = "none"
}

}

function logout(){
localStorage.removeItem("token")
window.location.href="/html/index.html"
}

loadNavbar()