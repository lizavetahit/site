document.addEventListener("DOMContentLoaded", ()=>{

const commentInput = document.getElementById("comment-input")
const sendBtn = document.getElementById("send-comment")
const commentsBlock = document.getElementById("comments")

let comments=[]

function renderComments(){

commentsBlock.innerHTML=""

comments.forEach((c,index)=>{

const div=document.createElement("div")
div.className="comment"

div.innerHTML=`

<div class="comment-header">

<div class="comment-user">${c.user}</div>

<div class="comment-actions">

<button class="comment-btn edit">Редактировать</button>

<button class="comment-btn delete">Удалить</button>

</div>

</div>

<div class="comment-text">${c.text}</div>

<div class="comment-reactions">

<div class="comment-like">
👍 <span>${c.likes}</span>
</div>

<div class="comment-dislike">
👎 <span>${c.dislikes}</span>
</div>

</div>

`

const like=div.querySelector(".comment-like")
const edit=div.querySelector(".edit")
const del=div.querySelector(".delete")
const text=div.querySelector(".comment-text")

like.onclick=()=>{
c.likes++
renderComments()
}

edit.onclick=()=>{

const newText=prompt("Изменить комментарий",c.text)

if(newText){
c.text=newText
renderComments()
}

}

del.onclick=()=>{

comments.splice(index,1)
renderComments()

}

commentsBlock.appendChild(div)

})

}

sendBtn.onclick=()=>{

const text=commentInput.value.trim()

if(!text) return

comments.unshift({
user:"You",
text:text,
likes:0,
dislikes:0,
reaction:null
})

commentInput.value=""

renderComments()

}

})

function calculateScore(){

const values=document.querySelectorAll(".bar-value")

let sum=0

values.forEach(v=>{
sum+=parseInt(v.textContent)
})

const score=(sum/values.length).toFixed(1)

document.getElementById("track-score").textContent=score

}

calculateScore()

function calculateScore(){

const rhymes = 7
const structure = 8
const style = 6
const charisma = 9
const vibe = 8
const memory = 7

const base = rhymes + structure + style + charisma

const vibeMultiplier = 1 + vibe*0.1
const memoryMultiplier = 1 + memory*0.1

let result = base * vibeMultiplier
result = result * memoryMultiplier

result = Math.round(result)

document.getElementById("track-score").textContent = result

}

calculateScore()

const like=div.querySelector(".comment-like")
const dislike=div.querySelector(".comment-dislike")

like.onclick=()=>{

if(c.reaction==="like") return

if(c.reaction==="dislike"){
c.dislikes--
}

c.likes++
c.reaction="like"

renderComments()

}

dislike.onclick=()=>{

if(c.reaction==="dislike") return

if(c.reaction==="like"){
c.likes--
}

c.dislikes++
c.reaction="dislike"

renderComments()

}