async function openSettings(type){

  const modal = document.getElementById("settingsModal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  modal.style.display = "flex"

  if(type === "archive"){
    title.innerText = "Архив"
    body.innerHTML = "<p>Тут будут архивированные посты и треки</p>"
  }

  if(type === "privacy"){

  title.innerText = "Конфиденциальность"

  const token = localStorage.getItem("token");

  const res = await fetch("/me?ts=" + Date.now(), {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const user = await res.json();
  console.log("hasPassword:", user.hasPassword);

  // 🔥 ЕСЛИ НЕТ ПАРОЛЯ (Telegram)
  console.log("USER:", user)
  if(!user.hasPassword){

    const token = localStorage.getItem("token");

let user = null;

try {
  const res = await fetch("/me", {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  user = await res.json();
} catch (e) {
  console.log("me error", e);
}
    body.innerHTML = `
      <h3>Установить пароль</h3>

      <input id="newPassword" type="password" placeholder="Новый пароль">
      <input id="newPassword2" type="password" placeholder="Повторите пароль">

      <button onclick="setPassword()" class="main-btn">Установить пароль</button>

      <p id="privacyError" class="error"></p>
    `

  } else {

  body.innerHTML = `
  <div class="privacy-block">

    <div class="privacy-section">
      <h3>🔒 Смена пароля</h3>

      <input id="currentPassword" type="password" placeholder="Текущий пароль">
      <input id="newPassword" type="password" placeholder="Новый пароль">
      <input id="newPassword2" type="password" placeholder="Повторите пароль">

      <button onclick="changePassword()" class="main-btn">
        Сменить пароль
      </button>

      <p id="passwordError" class="privacy-error"></p>
      <p id="passwordSuccess" class="privacy-success"></p>
    </div>

    <div class="privacy-divider"></div>

    <div class="privacy-section">
      <h3>📧 Смена почты</h3>
      <p class="current-email">
  ${
    user?.email
      ? `Текущая почта: <span>${user.email}</span>`
      : "Почта не привязана"
  }
</p>

      <input id="newEmail" type="email" placeholder="Новая почта">

      <button onclick="sendEmailCode()" class="secondary-btn">
        Отправить код
      </button>

      <div id="emailCodeBlock" class="hidden">
        <input id="emailCode" placeholder="Код из письма">

        <button onclick="confirmEmailChange()" class="main-btn">
          Подтвердить
        </button>
      </div>

      <p id="emailError" class="privacy-error"></p>
      <p id="emailSuccess" class="privacy-success"></p>
    </div>

  </div>
`
}

}

  if(type === "saved"){
    title.innerText = "Сохранённые"
    body.innerHTML = "<p>Сохранённые посты и треки</p>"
  }

  

}

function closeSettings(){
  document.getElementById("settingsModal").style.display = "none"
}

async function changePassword(){
  const token = localStorage.getItem("token");

  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const newPassword2 = document.getElementById("newPassword2").value.trim();

  const passwordError = document.getElementById("passwordError");
  const passwordSuccess = document.getElementById("passwordSuccess");

  passwordError.innerText = "";
  passwordSuccess.innerText = "";

  if (!currentPassword) {
    passwordError.innerText = "Введи текущий пароль";
    return;
  }

  if (!newPassword) {
    passwordError.innerText = "Введи новый пароль";
    return;
  }

  if (newPassword.length < 8) {
    passwordError.innerText = "Новый пароль должен быть минимум 8 символов";
    return;
  }

  if (newPassword !== newPassword2) {
    passwordError.innerText = "Пароли не совпадают";
    return;
  }

  const res = await fetch("/change-password",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + token
    },
    body: JSON.stringify({
      currentPassword,
      newPassword
    })
  });

  const data = await res.json().catch(() => ({}));

  if(!res.ok){
    passwordError.innerText = data.error === "Wrong password"
      ? "Неверный текущий пароль"
      : "Ошибка смены пароля";
    return;
  }

  passwordSuccess.innerText = "Пароль изменён";
  document.getElementById("currentPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("newPassword2").value = "";
}

async function sendEmailCode(){
  const newEmail = document.getElementById("newEmail").value.trim();

  const emailError = document.getElementById("emailError");
  const emailSuccess = document.getElementById("emailSuccess");

  emailError.innerText = "";
  emailSuccess.innerText = "";

  if (!newEmail) {
    emailError.innerText = "Введи новую почту";
    return;
  }

  if (!newEmail.includes("@")) {
    emailError.innerText = "Неверный формат почты";
    return;
  }

  const res = await fetch("/change-email-send-code",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({ newEmail })
  });

  const data = await res.json().catch(() => ({}));

  if(!res.ok){
    emailError.innerText = data.error === "Email уже используется"
      ? "Эта почта уже занята"
      : "Не удалось отправить код";
    return;
  }

  document.getElementById("emailCodeBlock").classList.remove("hidden");
  emailSuccess.innerText = "Код отправлен на почту";
}

async function confirmEmailChange(){
  const token = localStorage.getItem("token");

  const newEmail = document.getElementById("newEmail").value.trim();
  const code = document.getElementById("emailCode").value.trim();

  const emailError = document.getElementById("emailError");
  const emailSuccess = document.getElementById("emailSuccess");

  emailError.innerText = "";
  emailSuccess.innerText = "";

  if (!newEmail) {
    emailError.innerText = "Введи новую почту";
    return;
  }

  if (!code) {
    emailError.innerText = "Введи код из письма";
    return;
  }

  const res = await fetch("/change-email-confirm",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + token
    },
    body: JSON.stringify({
      newEmail,
      code
    })
  });

  const data = await res.json().catch(() => ({}));

  if(!res.ok){
    emailError.innerText = data.error === "Wrong code"
      ? "Неверный код"
      : "Не удалось изменить почту";
    return;
  }

  emailSuccess.innerText = "Почта изменена";
  document.getElementById("newEmail").value = "";
  document.getElementById("emailCode").value = "";
  document.getElementById("emailCodeBlock").classList.add("hidden");
}

async function setPassword(){
  const token = localStorage.getItem("token");

  const pass1 = document.getElementById("newPassword").value.trim();
  const pass2 = document.getElementById("newPassword2").value.trim();

  const error = document.getElementById("privacyError");
  error.innerText = "";

  if(!pass1){
    error.innerText = "Введи пароль";
    return;
  }

  if(pass1.length < 8){
    error.innerText = "Пароль должен быть минимум 8 символов";
    return;
  }

  if(pass1 !== pass2){
    error.innerText = "Пароли не совпадают";
    return;
  }

  const res = await fetch("/set-password",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + token
    },
    body: JSON.stringify({
      password: pass1
    })
  });

  if(!res.ok){
    error.innerText = "Ошибка";
    return;
  }

  openSettings("privacy");
}