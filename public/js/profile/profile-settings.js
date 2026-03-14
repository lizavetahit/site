function openSettings(){

const modal = document.getElementById("settingsModal")

if(modal){
modal.style.display="block"
}

}

function closeSettings(){

const modal = document.getElementById("settingsModal")

if(modal){
modal.style.display="none"
}

}
function changeEmail(){
  alert("Функция изменения почты будет добавлена позже")
}

function changePassword(){
  alert("Функция изменения пароля будет добавлена позже")
}

function initSettings(){
}


window.openSettings = openSettings
window.closeSettings = closeSettings
window.changeEmail = changeEmail
window.changePassword = changePassword