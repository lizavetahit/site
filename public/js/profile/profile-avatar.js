let cropState = {
  file: null,
  image: null,
  scale: 1,
  minScale: 1,
  maxScale: 4,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0
};

function openCropModal() {
  const cropModal = document.getElementById("cropModal");
  if (cropModal) cropModal.style.display = "block";
}

function closeCropModal() {
  const cropModal = document.getElementById("cropModal");
  const avatarInput = document.getElementById("avatarInput");

  if (cropModal) cropModal.style.display = "none";
  if (avatarInput) avatarInput.value = "";

  cropState = {
    file: null,
    image: null,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0
  };
}

function updateCropImageTransform() {
  const cropImage = document.getElementById("cropImage");
  if (!cropImage || !cropState.image) return;

  const circleSize = 280;

  clampCropPosition();

  const scaledWidth = cropState.image.width * cropState.scale;
  const scaledHeight = cropState.image.height * cropState.scale;

  const left = (circleSize - scaledWidth) / 2 + cropState.x;
  const top = (circleSize - scaledHeight) / 2 + cropState.y;

  cropImage.style.width = `${scaledWidth}px`;
  cropImage.style.height = `${scaledHeight}px`;
  cropImage.style.left = `${left}px`;
  cropImage.style.top = `${top}px`;
}

function initCropImage(src, file) {

  const cropImage = document.getElementById("cropImage");
  const zoomRange = document.getElementById("zoomRange");

  const circleSize = 280;

  cropState.file = file;
  cropState.image = new Image();

  cropState.image.onload = function () {

    const coverScale = Math.max(
      circleSize / cropState.image.width,
      circleSize / cropState.image.height
    );

    cropState.minScale = coverScale;
    cropState.maxScale = coverScale * 4;
    cropState.scale = coverScale;
    cropState.x = 0;
    cropState.y = 0;

    cropImage.src = src;

    zoomRange.min = cropState.minScale;
    zoomRange.max = cropState.maxScale;
    zoomRange.value = cropState.scale;

    updateCropImageTransform();
    openCropModal();

  };

  cropState.image.src = src;
}

function startCropDrag(x, y) {
  cropState.dragging = true;
  cropState.startX = x - cropState.x;
  cropState.startY = y - cropState.y;
}

function moveCropDrag(x, y) {

  if (!cropState.dragging) return;

  cropState.x = x - cropState.startX;
  cropState.y = y - cropState.startY;

  updateCropImageTransform();

}

function endCropDrag() {
  cropState.dragging = false;
}

async function applyCrop() {

  if (!cropState.file || !cropState.image) {
    alert("Выберите изображение");
    return;
  }

  const circleSize = 280;
  const outputSize = 400;
  const ratio = outputSize / circleSize;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(outputSize/2, outputSize/2, outputSize/2, 0, Math.PI*2);
  ctx.clip();

  const scaledWidth = cropState.image.width * cropState.scale;
  const scaledHeight = cropState.image.height * cropState.scale;

  const left = (circleSize - scaledWidth)/2 + cropState.x;
  const top = (circleSize - scaledHeight)/2 + cropState.y;

  ctx.drawImage(
    cropState.image,
    left*ratio,
    top*ratio,
    scaledWidth*ratio,
    scaledHeight*ratio
  );

  canvas.toBlob(async blob => {

    const formData = new FormData();
    formData.append("avatar", blob, "avatar.png");

    const res = await fetch("/upload-avatar",{
      method:"POST",
      headers:{ Authorization:"Bearer "+token },
      body:formData
    });

    const data = await res.json();

    document.getElementById("avatar").src =
      data.avatar + "?t=" + Date.now();

    document.getElementById("editAvatar").value = data.avatar;

    closeCropModal();

  });

}

function clamp(value,min,max){
  return Math.min(Math.max(value,min),max);
}

function clampCropPosition(){

  if(!cropState.image) return;

  const circleSize = 280;

  const scaledWidth = cropState.image.width * cropState.scale;
  const scaledHeight = cropState.image.height * cropState.scale;

  const maxOffsetX = Math.max(0,(scaledWidth-circleSize)/2);
  const maxOffsetY = Math.max(0,(scaledHeight-circleSize)/2);

  cropState.x = clamp(cropState.x,-maxOffsetX,maxOffsetX);
  cropState.y = clamp(cropState.y,-maxOffsetY,maxOffsetY);

}

async function removeAvatar(){

  const defaultAvatar = "/images/default-avatar.jpg";

  await fetch("/update-profile",{
    method:"PUT",
    headers:{
      "Content-Type":"application/json",
      Authorization:"Bearer "+token
    },
    body:JSON.stringify({ avatar:defaultAvatar })
  });

  document.getElementById("avatar").src =
    defaultAvatar + "?t=" + Date.now();

}

function initAvatarCrop(){

  const avatarInput = document.getElementById("avatarInput");
  if(!avatarInput) return;

  avatarInput.addEventListener("change", e=>{

    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();

    reader.onload = ev=>{
      initCropImage(ev.target.result,file);
    };

    reader.readAsDataURL(file);

  });

}
function initCropControls() {

  const cropCircle = document.getElementById("cropCircle")
  const zoomRange = document.getElementById("zoomRange")

  if (!cropCircle || !zoomRange) return

  // 🖱 мышка
  cropCircle.addEventListener("mousedown", (e) => {
    startCropDrag(e.clientX, e.clientY)
  })

  window.addEventListener("mousemove", (e) => {
    moveCropDrag(e.clientX, e.clientY)
  })

  window.addEventListener("mouseup", () => {
    endCropDrag()
  })

  // 📱 тач
  cropCircle.addEventListener("touchstart", (e) => {
    if (!e.touches[0]) return
    startCropDrag(e.touches[0].clientX, e.touches[0].clientY)
  })

  window.addEventListener("touchmove", (e) => {
    if (!e.touches[0]) return
    moveCropDrag(e.touches[0].clientX, e.touches[0].clientY)
  })

  window.addEventListener("touchend", () => {
    endCropDrag()
  })

  // 🔍 зум
  zoomRange.addEventListener("input", () => {

    const oldScale = cropState.scale
    const newScale = Number(zoomRange.value)

    const ratio = newScale / oldScale

    cropState.x *= ratio
    cropState.y *= ratio

    cropState.scale = newScale

    updateCropImageTransform()
  })

}