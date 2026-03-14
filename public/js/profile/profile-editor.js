function openPostModal(){
  const modal = document.getElementById("postModal")
  if(modal) modal.style.display="flex"
}

function closePostModal(){

  const modal = document.getElementById("postModal")
  if(modal) modal.style.display="none"

  const text = document.getElementById("postText")
  const media = document.getElementById("postMedia")
  const preview = document.getElementById("editorPreview")
  const img = document.getElementById("editorImage")
  const video = document.getElementById("editorVideo")
  const zoom = document.getElementById("zoomSlider")

  if(text) text.value=""
  if(media) media.value=""

  if(preview) preview.classList.add("hidden")

  if(img) img.src=""
  if(video) video.src=""

  if(zoom) zoom.classList.add("hidden")

}

async function publishPost(){

  const text = document.getElementById("postText").value
  const file = document.getElementById("postMedia").files[0]

  const formData = new FormData()
  formData.append("content",text)

  if(file){
    formData.append("media",file)
  }

  const res = await fetch("/create-post",{
    method:"POST",
    headers:{
      Authorization:"Bearer "+localStorage.getItem("token")
    },
    body:formData
  })

  if(!res.ok){
    alert("Ошибка публикации")
    return
  }

  closePostModal()
  loadPosts()

}

function selectMedia(){
  const input = document.getElementById("postMedia")
  if(input) input.click()
}

function removeMedia(){

  const mediaInput = document.getElementById("postMedia")
  const preview = document.getElementById("editorPreview")
  const image = document.getElementById("editorImage")
  const video = document.getElementById("editorVideo")
  const zoom = document.getElementById("zoomSlider")

  if(mediaInput) mediaInput.value=""
  if(image) image.src=""
  if(video) video.src=""

  if(preview) preview.classList.add("hidden")
  if(zoom) zoom.classList.add("hidden")

}

function initPostEditor(){

  const mediaInput = document.getElementById("postMedia")
  if(!mediaInput) return

  mediaInput.addEventListener("change",(e)=>{

    const file = e.target.files[0]
    if(!file) return

    const preview = document.getElementById("editorPreview")
    const image = document.getElementById("editorImage")
    const video = document.getElementById("editorVideo")
    const zoom = document.getElementById("zoomSlider")

    preview.classList.remove("hidden")

    if(file.type.startsWith("image")){
      image.src = URL.createObjectURL(file)
      image.classList.remove("hidden")
      video.classList.add("hidden")
      zoom.classList.remove("hidden")
    }

    else if(file.type.startsWith("video")){
      video.src = URL.createObjectURL(file)
      video.classList.remove("hidden")
      image.classList.add("hidden")
      zoom.classList.add("hidden")
    }

  })

}

window.openPostModal = openPostModal
window.closePostModal = closePostModal
window.publishPost = publishPost
window.selectMedia = selectMedia
window.removeMedia = removeMedia