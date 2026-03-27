function isMyProfile(){
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id");

  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const myId = String(payload.id);

    // если нет id — это точно мой профиль
    if (!profileId) return true;

    return String(profileId) === myId;

  } catch {
    return false;
  }
}

function getMyIdFromToken(){
  const token = localStorage.getItem("token");
  if(!token) return null;

  try{
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.id);
  }catch{
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {

  setTimeout(() => {
    if (!isMyProfile()) {
      document.querySelectorAll(".avatar-upload")
  .forEach(el => el.remove());
    }
  }, 200);

  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id");
const myId = getMyIdFromToken();

if (profileId && profileId != myId) {
  document.body.classList.add("foreign-profile");
}

  if (!profileId && !localStorage.getItem("token")) {
    window.location.href = "/html/login.html";
    return;
  }

  handleProfileUI();
  initProfileUser();
  initAvatarCrop();
  initCropControls();
  initPosts();
  initPostEditor();
  initTabs();
  switchTab("posts");
  initSettings();
  initTrackModal();
  initTracks();
  initTrackTags();
});

function handleProfileUI() {

  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id");
  const myId = getMyIdFromToken();

  const avatarEdit = document.querySelector(".avatar-edit-btn");
  const createPostBtn = document.querySelector(".create-post-btn");
  const createTrackBtn = document.querySelector("#tracksTab .secondary-btn");

  const editBtn = document.querySelector(".profile-actions .main-btn");
  const settingsBtn = document.querySelector(".profile-actions .secondary-btn");

  // если это чужой профиль
  if (profileId && profileId != myId) {

    if (avatarEdit) avatarEdit.style.display = "none";
    if (createPostBtn) createPostBtn.style.display = "none";
    if (createTrackBtn) createTrackBtn.style.display = "none";
    if (editBtn) editBtn.style.display = "none";
    if (settingsBtn) settingsBtn.style.display = "none";

  }
}