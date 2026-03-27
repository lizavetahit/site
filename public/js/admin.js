// 🔐 ПРОВЕРКА ДОСТУПА

async function checkAdminAccess(){
  const token = localStorage.getItem("token")

  if(!token){
    denyAccess("Нет доступа")
    return false
  }

  try{
    const res = await fetch("/me", {
      headers:{
        Authorization: "Bearer " + token
      }
    })

    if(!res.ok){
      denyAccess("Нет доступа")
      return false
    }

    const user = await res.json()

    if(user.role !== "admin"){
      denyAccess("У вас нет доступа к этой странице")
      return false
    }

    return true

  }catch(err){
    denyAccess("Ошибка доступа")
    return false
  }
}

function denyAccess(text){
  document.body.innerHTML = `
    <div style="
      color:white;
      display:flex;
      justify-content:center;
      align-items:center;
      height:100vh;
      font-size:24px;
    ">
      ${text}
    </div>
  `
}

// 📦 ДАННЫЕ

let allUsers = []

// 📥 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ

async function loadUsers() {
  try{
    const res = await fetch("/api/users", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })

    if(!res.ok){
      console.error("Ошибка загрузки пользователей")
      return
    }

    const users = await res.json()

    allUsers = users

    renderUsers(users)

  }catch(err){
    console.error("Ошибка:", err)
  }
}

// 🎨 РЕНДЕР

function renderUsers(users){
  const container = document.getElementById("usersList")

  if(!users.length){
    container.innerHTML = "<div style='opacity:0.6'>Ничего не найдено</div>"
    return
  }

  container.innerHTML = users.map(u => `
    <div class="user-row">
      <div class="user-info">
        <div class="user-name">${u.username}</div>
        <div class="user-tag">@${u.username_tag}</div>
      </div>

      <select class="role-select" onchange="changeRole(${u.id}, this.value)">
        <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
        <option value="judge" ${u.role === "judge" ? "selected" : ""}>judge</option>
        <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
      </select>
    </div>
  `).join("")
}

// 🔄 СМЕНА РОЛИ

async function changeRole(userId, role){
  try{
    const res = await fetch(`/api/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ role })
    })

    if(!res.ok){
      alert("Ошибка смены роли")
      return
    }

    // обновляем локально
    const user = allUsers.find(u => u.id === userId)
    if(user) user.role = role

  }catch(err){
    console.error(err)
  }
}

// 🔍 ПОИСК С ПОДСКАЗКАМИ

function initAdminSearch(){
  const input = document.getElementById("adminSearch")
  const results = document.getElementById("adminSearchResults")

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim()

    if(!q){
      results.style.display = "none"
      renderUsers(allUsers)
      return
    }

    const filtered = allUsers.filter(u =>
      u.username_tag?.toLowerCase().includes(q)
    )

    // dropdown
    results.innerHTML = filtered.map(u => `
      <div class="admin-search-item" onclick="selectUser('${u.username_tag}')">
        @${u.username_tag}
      </div>
    `).join("")

    results.style.display = "block"

    renderUsers(filtered)
  })

  // закрытие
  document.addEventListener("click", (e)=>{
    if(!e.target.closest(".admin-search")){
      results.style.display = "none"
    }
  })
}

// 🎯 ВЫБОР ИЗ СПИСКА

function selectUser(tag){
  const input = document.getElementById("adminSearch")
  const results = document.getElementById("adminSearchResults")

  input.value = tag

  const filtered = allUsers.filter(u => u.username_tag === tag)

  renderUsers(filtered)

  results.style.display = "none"
}

// 🚀 СТАРТ

(async ()=>{
  const ok = await checkAdminAccess()
  if(!ok) return

  await loadUsers()
  initAdminSearch()
})()