
document.addEventListener("DOMContentLoaded", () => {



if (!token) {
  window.location.href = "/html/login.html"
  return
}

initProfileUser()
initAvatarCrop()
initCropControls()
initPosts()
initPostEditor()
initTabs()
initSettings()

})