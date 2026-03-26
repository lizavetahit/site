const form=document.getElementById("loginForm")
const error=document.getElementById("error")

form.addEventListener("submit",async(e)=>{

e.preventDefault()

const login=document.getElementById("email").value.trim()
const password=document.getElementById("password").value

const res=await fetch("/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({login,password})

})

if(!res.ok){

error.innerText="Неверный email или пароль"
return

}

const data=await res.json()

localStorage.setItem("token",data.token)

window.location.href="/html/index.html"

})

function loginWithTelegram() {

  window.Telegram.Login.auth(
    {
      bot_id: "ТВОЙ_BOT_ID",
      request_access: true
    },
    async (data) => {

      if (!data) return;

      // 👉 МЕНЯЕМ КНОПКУ КАК НА СКРИНЕ
      const text = document.getElementById("tgLoginText");
      const avatar = document.getElementById("tgAvatar");

      if (text) {
        text.innerText = "Войти как " + (data.first_name || data.username);
      }

      if (avatar && data.photo_url) {
        avatar.src = data.photo_url;
        avatar.classList.remove("hidden");
      }

      // 👉 отправка на сервер
      const res = await fetch("/telegram-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (result.token) {
        localStorage.setItem("token", result.token);
        window.location.href = "/html/profile.html";
      }

    }
  );

}

async function onTelegramAuth(user) {
  try {
    const res = await fetch("/telegram-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data);
      return;
    }

    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "/html/profile.html";
    }
  } catch (err) {
    console.error("Telegram login error:", err);
  }
}

window.onTelegramAuth = onTelegramAuth;