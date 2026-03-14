document.addEventListener("DOMContentLoaded", () => {

const token = localStorage.getItem("token")

if (!token) {
  window.location.href = "/html/login.html"
  return
}

initProfileUser()
initAvatarCrop()
initPosts()
initPostEditor()
initTabs()
initSettings()

})