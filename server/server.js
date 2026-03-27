require("dotenv").config()
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const pool = require("../database/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");
const { Resend } = require("resend");

const resend = new Resend("re_Xnoh7AHA_8WrQy8FK4qiEfNeK1THPTiL4");
const fs = require("fs")
const path = require("path")


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const postUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

const app = express();
function generateUsernameTag(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "no_token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    req.user = decoded; // 🔥 ВАЖНО

    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
  return decoded.id;
}

async function isAdmin(userId) {
  const result = await pool.query(
    "SELECT role FROM users WHERE id = $1",
    [userId]
  )

  return result.rows[0]?.role === "admin"
}

async function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    const result = await pool.query(
      "SELECT id, role, is_banned FROM users WHERE id = $1",
      [decoded.id]
    );

    return result.rows[0];
  } catch {
    return null;
  }
}

function requireRole(roles = []) {
  return async (req, res, next) => {
    const user = await getUserFromToken(req);

    if (!user) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "Ты забанен" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    req.user = user;
    next();
  };
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/index.html"));
});

app.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    const user = await pool.query(
  `SELECT 
  id,
  username,
  email,
  avatar,
  role,
  password IS NOT NULL as "hasPassword"
   FROM users 
   WHERE id = $1`,
  [decoded.id]
);

    res.json(user.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/check-email/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  const result = await pool.query(
    "SELECT 1 FROM users WHERE email = $1",
    [email]
  );

  res.json({ available: result.rows.length === 0 });
});

app.get("/check-tag/:tag", async (req, res) => {
  const { tag } = req.params;

  const result = await pool.query(
    "SELECT 1 FROM users WHERE username_tag = $1",
    [tag]
  );

  res.json({ available: result.rows.length === 0 });
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    let baseTag = generateUsernameTag(username);
let username_tag = baseTag;
let counter = 1;

while (true) {
  const check = await pool.query(
    "SELECT id FROM users WHERE LOWER(username_tag) = LOWER($1)",
    [username_tag]
  );

  if (check.rows.length === 0) break;

  username_tag = baseTag + counter;
  counter++;
}

const result = await pool.query(
  "INSERT INTO users (username,email,password,avatar,username_tag) VALUES ($1,$2,$3,$4,$5) RETURNING id,username,username_tag,email,avatar",
  [username, email, hash, "/images/default-avatar.jpg", username_tag]
);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Registration error");
  }
});

// ===== ОТПРАВКА КОДА =====
// ===== SEND CODE (RESEND) =====
app.post("/send-code", async (req, res) => {
  const { email } = req.body;

  const code = Math.floor(100000 + Math.random() * 900000);
  global.emailCodes = global.emailCodes || {};
  global.emailCodes[email] = code;

  console.log("EMAIL SENT:", email);
  console.log("CODE:", code);

  try {
    await resend.emails.send({
      from: "Rhytmoria <no-reply@ritmoria.com>",
      to: email, // 🔥 ВОТ ЭТО ГЛАВНОЕ
      subject: "Код подтверждения",
      html: `
<div style="background:#0b0b12;padding:40px 0;font-family:Arial,sans-serif;">
  <div style="max-width:500px;margin:auto;background:#111827;border-radius:16px;padding:30px;text-align:center;color:white;border:1px solid rgba(255,255,255,0.08);">

    <h1 style="margin-bottom:10px;">#РИТМОРИЯ 🎧</h1>

    <p style="color:#9ca3af;margin-bottom:20px;">
      Подтверди свою почту
    </p>

    <div style="
      font-size:32px;
      letter-spacing:6px;
      font-weight:bold;
      background:linear-gradient(135deg,#8b5cf6,#6d28d9);
      padding:15px;
      border-radius:12px;
      display:inline-block;
      margin-bottom:20px;
    ">
      ${code}
    </div>

    <p style="color:#9ca3af;font-size:14px;">
      Код действует 10 минут
    </p>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;">

    <p style="color:#6b7280;font-size:12px;">
      Если это были не вы — просто проигнорируйте это письмо
    </p>

  </div>
</div>
`
    });

    res.json({ success: true });

  } catch (err) {
    console.log("EMAIL ERROR:", err);
    res.status(500).json({ error: "Ошибка отправки" });
  }
});

app.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  if (global.emailCodes[email] == code) {
    return res.json({ success: true });
  }

  res.status(400).json({ error: "Неверный код" });
});

app.post("/change-password", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { currentPassword, newPassword } = req.body;

    const user = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [userId]
    );

    if (!user.rows[0].password) {
      return res.status(400).json({ error: "No password set" });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.rows[0].password
    );

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hash, userId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/change-email-send-code", async (req, res) => {
  const { newEmail } = req.body;
  const existing = await pool.query(
  "SELECT id FROM users WHERE email = $1",
  [newEmail]
);

if (existing.rows.length > 0) {
  return res.status(400).json({ error: "Email уже используется" });
}

  const code = Math.floor(100000 + Math.random() * 900000);

  global.emailChangeCodes = global.emailChangeCodes || {};
  global.emailChangeCodes[newEmail] = code;

  try {
    await resend.emails.send({
      from: "Rhytmoria <no-reply@ritmoria.com>",
      to: newEmail,
      subject: "Смена почты",
      html: `
        <div style="background:#0b0b12;padding:40px;text-align:center;color:white;">
          <h2>Смена почты</h2>
          <p>Ваш код:</p>
          <h1>${code}</h1>
        </div>
      `
    });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Email error" });
  }
});

app.post("/change-email-confirm", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { newEmail, code } = req.body;

    if (global.emailChangeCodes?.[newEmail] != code) {
      return res.status(400).json({ error: "Wrong code" });
    }

    await pool.query(
      "UPDATE users SET email = $1 WHERE id = $2",
      [newEmail, userId]
    );

    delete global.emailChangeCodes[newEmail];

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.post("/set-password", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { password } = req.body;

    if(!password){
      return res.status(400).json({ error: "Нет пароля" });
    }

    const bcrypt = require("bcrypt");
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hash, userId]
    );

    res.json({ success: true });

  } catch(err){
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});


app.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Нет данных" });
    }

    let cleanLogin = login.trim();

if (cleanLogin.startsWith("@")) {
  cleanLogin = cleanLogin.slice(1);
}

// если это email → ищем только по email
let result;

if (cleanLogin.includes("@")) {
  result = await pool.query(
    "SELECT * FROM users WHERE LOWER(email)=LOWER($1)",
    [cleanLogin]
  );
} else {
  result = await pool.query(
    "SELECT * FROM users WHERE LOWER(username_tag)=LOWER($1)",
    [cleanLogin]
  );
}

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Неверный пароль" });
    }

    const token = jwt.sign(
  {
    id: user.id,
    username: user.username,
    avatar: user.avatar
  },
  process.env.JWT_SECRET || "secret",
  { expiresIn: "7d" }
);

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/profile", async (req, res) => {
  try {

    let userId;

    // 🔥 если есть id в URL → открываем чужой профиль
    if (req.query.id) {
      userId = req.query.id;
    } 
    // 🔥 если нет → открываем свой
    else {
      userId = getUserIdFromToken(req);
    }

    const user = await pool.query(
      `SELECT username,username_tag,email,bio,avatar,soundcloud,instagram,twitter,telegram,website
       FROM users
       WHERE id=$1`,
      [userId]
    );

    res.json(user.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(401).send("Unauthorized");
  }
});



app.get("/my-tracks", async (req, res) => {
  res.json([{ title: "My track 1" }, { title: "My track 2" }]);
});

app.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);

    const currentResult = await pool.query(
      `SELECT username, username_tag, bio, avatar, soundcloud, instagram, twitter, telegram, website
       FROM users
       WHERE id=$1`,
      [userId]
    );

    console.log("BODY:", req.body);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const current = currentResult.rows[0];

    const username =
      req.body.username !== undefined ? String(req.body.username).trim() : current.username;

    const username_tag =
      req.body.username_tag !== undefined
        ? String(req.body.username_tag).trim()
        : current.username_tag;

    const bio = req.body.bio !== undefined ? req.body.bio : current.bio;
    const avatar = req.body.avatar !== undefined ? req.body.avatar : current.avatar;
    const soundcloud = req.body.soundcloud !== undefined ? req.body.soundcloud : current.soundcloud;
    const instagram = req.body.instagram !== undefined ? req.body.instagram : current.instagram;
    const twitter = req.body.twitter !== undefined ? req.body.twitter : current.twitter;
    const telegram = req.body.telegram !== undefined ? req.body.telegram : current.telegram;
    const website = req.body.website !== undefined ? req.body.website : current.website;

    if (!username) {
      return res.status(400).json({ error: "username_required" });
    }

    const check = await pool.query(
      "SELECT id FROM users WHERE username=$1 AND id != $2",
      [username, userId]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: "username_taken" });
    }

    const tagCheck = await pool.query(
      "SELECT id FROM users WHERE LOWER(username_tag) = LOWER($1) AND id != $2",
      [username_tag, userId]
    );

    if (tagCheck.rows.length > 0) {
      return res.status(400).json({ error: "username_tag_taken" });
    }

    const result = await pool.query(
      `UPDATE users
       SET
         username = $1,
         username_tag = $2,
         bio = $3,
         avatar = $4,
         soundcloud = $5,
         instagram = $6,
         twitter = $7,
         telegram = $8,
         website = $9
       WHERE id = $10
       RETURNING username, username_tag, bio, avatar, soundcloud, instagram, telegram, website`,
      [
        username,
        username_tag,
        bio,
        avatar,
        soundcloud,
        instagram,
        twitter,
        telegram,
        website,
        userId
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "update_profile_failed" });
  }
});

app.put("/api/users/:id/role", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req)
    if (!userId) return res.status(401).json({ error: "Нет токена" })

    const admin = await isAdmin(userId)
    if (!admin) return res.status(403).json({ error: "Нет доступа" })

    const targetId = req.params.id
    const { role } = req.body

    if (!["user", "judge", "admin"].includes(role)) {
      return res.status(400).json({ error: "Неверная роль" })
    }

    await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2",
      [role, targetId]
    )

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Ошибка сервера" })
  }
})

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {

  try {

    const userId = getUserIdFromToken(req);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const avatarPath = `public/uploads/avatars/user-${userId}.webp`;

    await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 90 })
      .toFile(avatarPath);

    const avatarUrl = `/uploads/avatars/user-${userId}.webp`;

    await pool.query(
      "UPDATE users SET avatar=$1 WHERE id=$2",
      [avatarUrl, userId]
    );

    res.json({ avatar: avatarUrl });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Avatar upload failed" });

  }

});



app.post("/create-post", postUpload.single("media"), async (req,res)=>{

try{

const userId = getUserIdFromToken(req);

const content = req.body.content || "";
let mediaUrl = null;
let mediaType = "text";

if (req.file) {

  const timestamp = Date.now();

  if (req.file.mimetype.startsWith("image")) {

    const fileName = `post-${timestamp}.webp`;
    const filePath = `public/uploads/posts/images/${fileName}`;

    await sharp(req.file.buffer)
      .resize(1200)
      .webp({ quality: 90 })
      .toFile(filePath);

    mediaUrl = `/uploads/posts/images/${fileName}`;
    mediaType = "image";

  }

  else if (req.file.mimetype.startsWith("video")) {

    const fileName = `post-${timestamp}.mp4`;
    const filePath = `public/uploads/posts/videos/${fileName}`;

    require("fs").writeFileSync(filePath, req.file.buffer);

    mediaUrl = `/uploads/posts/videos/${fileName}`;
    mediaType = "video";

  }

}



const result = await pool.query(
`INSERT INTO posts(user_id,content,media_url,media_type)
VALUES($1,$2,$3,$4)
RETURNING *`,
[userId,content,mediaUrl,mediaType]
);

res.json(result.rows[0]);

}catch(err){

console.error(err);
res.status(500).json({error:"post_create_failed"});

}

});
app.post("/update-post/:id", postUpload.single("media"), async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const postId = req.params.id;

    const content = req.body.content || "";

    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {

      const timestamp = Date.now();

      if (req.file.mimetype.startsWith("image")) {

        const fileName = `post-${timestamp}.webp`;
        const filePath = `public/uploads/posts/images/${fileName}`;

        await sharp(req.file.buffer)
          .resize(1200)
          .webp({ quality: 90 })
          .toFile(filePath);

        mediaUrl = `/uploads/posts/images/${fileName}`;
        mediaType = "image";

      }

      else if (req.file.mimetype.startsWith("video")) {

        const fileName = `post-${timestamp}.mp4`;
        const filePath = `public/uploads/posts/videos/${fileName}`;

        fs.writeFileSync(filePath, req.file.buffer);

        mediaUrl = `/uploads/posts/videos/${fileName}`;
        mediaType = "video";

      }

    }

    await pool.query(
      `
      UPDATE posts
      SET 
        content = $1,
        media_url = COALESCE($2, media_url),
        media_type = COALESCE($3, media_type)
      WHERE id = $4 AND user_id = $5
      `,
      [content, mediaUrl, mediaType, postId, userId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "update_failed" });
  }
});

app.delete("/delete-post/:id", async (req,res)=>{

try{

const userId = getUserIdFromToken(req)
const postId = req.params.id

const result = await pool.query(
"SELECT media_url FROM posts WHERE id=$1 AND user_id=$2",
[postId,userId]
)

if(result.rows.length === 0){
return res.status(404).json({error:"Post not found"})
}

const mediaUrl = result.rows[0].media_url

if(mediaUrl){

const cleanPath = mediaUrl.replace(/^\/+/,"")

const filePath = path.join(__dirname,"..","public",cleanPath)

console.log("Deleting:",filePath)

fs.unlink(filePath,(err)=>{
if(err){
console.log("Delete error:",err)
}else{
console.log("File deleted")
}
})

}

await pool.query(
"DELETE FROM posts WHERE id=$1 AND user_id=$2",
[postId,userId]
)

res.json({success:true})

}catch(err){

console.error(err)
res.status(500).json({error:"Server error"})


}

})



app.get("/my-posts", async (req,res)=>{

try{

const userId = getUserIdFromToken(req);

const posts = await pool.query(
`
SELECT 
posts.*,
users.username,
users.avatar
FROM posts
JOIN users ON posts.user_id = users.id
WHERE posts.user_id=$1 AND COALESCE(posts.is_archived,false)=false
ORDER BY posts.created_at DESC
`,
[userId]
);

res.json(posts.rows);

}catch(err){

console.error("MY POSTS ERROR:", err);  // 👈 ВОТ ЭТО ГЛАВНОЕ
res.status(500).send("error");

}

});

app.get("/posts/:id", async (req, res) => {
  try {

    const userId = req.params.id;

    const posts = await pool.query(
      `
      SELECT 
      posts.*,
      users.username,
      users.avatar
      FROM posts
      JOIN users ON posts.user_id = users.id
      WHERE posts.user_id = $1
      AND COALESCE(posts.is_archived,false)=false
      ORDER BY posts.created_at DESC
      `,
      [userId]
    );

    res.json(posts.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "posts_load_error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req)
    if (!await isAdmin(userId)) {
      return res.status(403).json({ error: "Нет доступа" })
    }

    const users = await pool.query(`
      SELECT id, username, username_tag, role
      FROM users
      ORDER BY id ASC
    `)

    res.json(users.rows)

  } catch (err) {
    res.status(401).json({ error: "Unauthorized" })
  }
})

app.get("/archived-posts", async (req,res)=>{
  try{

    const userId = getUserIdFromToken(req);

    const posts = await pool.query(
      `
      SELECT 
      posts.*,
      users.username,
      users.avatar
      FROM posts
      JOIN users ON posts.user_id = users.id
      WHERE posts.user_id=$1 AND COALESCE(posts.is_archived,false)=true
      ORDER BY posts.created_at DESC
      `,
      [userId]
    );

    res.json(posts.rows);

  }catch(err){
    console.error(err);
    res.status(500).json({error:"archived_posts_error"});
  }
});

app.get("/feed", async (req,res)=>{

const posts = await pool.query(`
SELECT posts.*, users.username, users.avatar
FROM posts
JOIN users ON users.id = posts.user_id
ORDER BY created_at DESC
LIMIT 50
`)

res.json(posts.rows)

})

app.put("/archive-post/:id", async (req,res)=>{

try{

const userId = getUserIdFromToken(req)
const postId = req.params.id

await pool.query(
"UPDATE posts SET is_archived = NOT COALESCE(is_archived,false) WHERE id=$1 AND user_id=$2",
[postId,userId]
)

res.json({success:true})

}catch(err){

console.error(err)
res.status(500).json({error:"archive_failed"})

}

})

// ======================
// 🔥 SOUNDCLOUD API
// ======================
app.get("/api/soundcloud", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ message: "Нет ссылки" });
  }

  try {
    // 🔥 получаем HTML страницы трека
    const response = await fetch(url);
    const html = await response.text();

    // 🔥 вытаскиваем JSON из страницы
    const jsonMatch = html.match(/window\.__sc_hydration = (\[.*?\]);/);

    if (!jsonMatch) {
      return res.status(500).json({ message: "Не удалось распарсить SoundCloud" });
    }

    const data = JSON.parse(jsonMatch[1]);

    // 🔥 ищем трек
    const trackData = data.find(item => item.hydratable === "sound");

    if (!trackData) {
      return res.status(500).json({ message: "Трек не найден" });
    }

    const track = trackData.data;

    const artist = track.user?.username || "";
    const title = track.title || "";

    const artwork =
      track.artwork_url?.replace("-large", "-t500x500") ||
      track.user?.avatar_url;

    res.json({
      artist,
      title,
      artwork
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка SoundCloud" });
  }
});


// ======================
// 🔥 TRACKS API
// ======================

// ➕ создать трек
app.post("/api/tracks", requireRole(["user", "judge", "admin"]), upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]), async (req, res) => {
  try {
    const q = await pool.query(
  "SELECT value FROM system_settings WHERE key = 'queue_state'"
);

const state = q.rows[0]?.value || "open";

if (state !== "open") {
  return res.status(403).json({ message: "Очередь закрыта или на паузе" });
}

    const { artist, title, soundcloud, coverUrl } = req.body;

    let audioPath = null;
    let cover = coverUrl || null;

    // 🎵 audio
    if (req.files?.audio) {
      const file = req.files.audio[0];
      const fileName = `track-${Date.now()}.mp3`;
      const filePath = `public/uploads/tracks/${fileName}`;

      fs.writeFileSync(filePath, file.buffer);
      audioPath = `/uploads/tracks/${fileName}`;
    }

    // 🖼 cover
    if (req.files?.cover) {
      const file = req.files.cover[0];
      const fileName = `cover-${Date.now()}.webp`;
      const filePath = `public/uploads/tracks/covers/${fileName}`;

      await sharp(file.buffer)
        .resize(500, 500)
        .webp({ quality: 90 })
        .toFile(filePath);

      cover = `/uploads/tracks/covers/${fileName}`;
    }

    const user = req.user;

const result = await pool.query(
  `INSERT INTO tracks (artist, title, soundcloud, cover, audio, createdAt, user_id)
   VALUES ($1,$2,$3,$4,$5,NOW(),$6)
   RETURNING *`,
  [artist, title, soundcloud, cover, audioPath, user.id]
);

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка создания трека" });
  }
});


// 📥 очередь
app.get("/api/tracks/queue", async (req, res) => {
  try {
    const result = await pool.query(`
SELECT 
  t.*,

  (
    SELECT ROUND(AVG(score))
    FROM track_ratings
    WHERE track_id = t.id AND type = 'user'
  ) as user_score,

  (
    SELECT ROUND(AVG(score))
    FROM track_ratings
    WHERE track_id = t.id AND type = 'judge'
  ) as judge_score

FROM tracks t
ORDER BY t.createdAt ASC
`);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка загрузки очереди" });
  }
});


// ❌ удалить трек
app.delete("/api/tracks/:id", requireRole(["judge", "admin"]), async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query("DELETE FROM tracks WHERE id = $1", [id]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка удаления" });
  }
});

// 🔥 получить один трек
app.get("/api/tracks/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await pool.query(`
  SELECT 
    t.*,

    (
      SELECT ROUND(AVG(score))
      FROM track_ratings
      WHERE track_id = t.id AND type = 'user'
    ) as user_score,

    (
      SELECT ROUND(AVG(score))
      FROM track_ratings
      WHERE track_id = t.id AND type = 'judge'
    ) as judge_score,

    (
      SELECT ROUND(AVG(rhymes)::numeric, 3)
      FROM track_rating_details
      WHERE track_id = t.id AND rating_type = 'judge'
    ) as rhymes_avg,

    (
      SELECT ROUND(AVG(structure)::numeric, 3)
      FROM track_rating_details
      WHERE track_id = t.id AND rating_type = 'judge'
    ) as structure_avg,

    (
      SELECT ROUND(AVG(style)::numeric, 3)
      FROM track_rating_details
      WHERE track_id = t.id AND rating_type = 'judge'
    ) as style_avg,

    (
      SELECT ROUND(AVG(charisma)::numeric, 3)
      FROM track_rating_details
      WHERE track_id = t.id AND rating_type = 'judge'
    ) as charisma_avg,

    (
      SELECT ROUND(AVG(vibe)::numeric, 3)
      FROM track_rating_details
      WHERE track_id = t.id AND rating_type = 'judge'
    ) as vibe_avg,

    (
      SELECT ROUND(AVG(memory)::numeric, 3)
      FROM track_rating_details
      WHERE track_id = t.id AND rating_type = 'judge'
    ) as memory_avg

  FROM tracks t
  WHERE t.id = $1
`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Трек не найден" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.get("/api/tracks/:id/judges", async (req, res) => {
  try {
    const trackId = req.params.id;

    const result = await pool.query(`
      SELECT
        u.username,
        d.total,
        d.rhymes,
        d.structure,
        d.style,
        d.charisma,
        d.vibe,
        d.memory
      FROM track_rating_details d
      JOIN users u ON u.id = d.user_id
      WHERE d.track_id = $1
        AND d.rating_type = 'judge'
      ORDER BY d.created_at ASC
    `, [trackId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "judges_load_failed" });
  }
});

app.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.toLowerCase() || "";

    if (!q) {
      return res.json({ users: [], tracks: [] });
    }

    // 🔥 USERS
    const users = await pool.query(
      `
      SELECT id, username, username_tag, avatar, role
      FROM users
      WHERE LOWER(username) LIKE $1
         OR LOWER(username_tag) LIKE $1
      LIMIT 5
      `,
      [`%${q}%`]
    );

    // 🔥 TRACKS
    const tracks = await pool.query(
      `
      SELECT id, title, artist, cover, audio, soundcloud
      FROM tracks
      WHERE LOWER(title) LIKE $1
         OR LOWER(artist) LIKE $1
      LIMIT 5
      `,
      [`%${q}%`]
    );

    res.json({
      users: users.rows,
      tracks: tracks.rows
    });

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).send("error");
  }
});

// ======================
// ⭐ ОЦЕНКИ
// ======================

// 👥 USER ОЦЕНКА
app.post("/api/rate/user", requireRole(["user", "judge", "admin"]), async (req, res) => {
  try {
    const {
      track_id,
      score,
      rhymes,
      structure,
      style,
      charisma,
      vibe,
      memory
    } = req.body;

    const user = req.user;

    await pool.query(`
      INSERT INTO track_ratings (track_id, user_id, type, score)
      VALUES ($1, $2, 'user', $3)
      ON CONFLICT (track_id, user_id, type)
      DO UPDATE SET score = EXCLUDED.score
    `, [track_id, user.id, score]);

    await pool.query(`
      INSERT INTO track_rating_details
      (track_id, user_id, rhymes, structure, style, charisma, vibe, memory, total, rating_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'user')
      ON CONFLICT (track_id, user_id, rating_type)
      DO UPDATE SET
        rhymes = EXCLUDED.rhymes,
        structure = EXCLUDED.structure,
        style = EXCLUDED.style,
        charisma = EXCLUDED.charisma,
        vibe = EXCLUDED.vibe,
        memory = EXCLUDED.memory,
        total = EXCLUDED.total
    `, [
      track_id,
      user.id,
      rhymes,
      structure,
      style,
      charisma,
      vibe,
      memory,
      score
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "rate_failed" });
  }
});


// 🎧 JUDGE ОЦЕНКА
app.post("/api/rate/judge", requireRole(["judge", "admin"]), async (req, res) => {
  try {
    const {
      track_id,
      score,
      rhymes,
      structure,
      style,
      charisma,
      vibe,
      memory
    } = req.body;

    const user = req.user;

    await pool.query(`
      INSERT INTO track_ratings (track_id, user_id, type, score)
      VALUES ($1, $2, 'judge', $3)
      ON CONFLICT (track_id, user_id, type)
      DO UPDATE SET score = EXCLUDED.score
    `, [track_id, user.id, score]);

    await pool.query(`
      INSERT INTO track_rating_details
      (track_id, user_id, rhymes, structure, style, charisma, vibe, memory, total, rating_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'judge')
      ON CONFLICT (track_id, user_id, rating_type)
      DO UPDATE SET
        rhymes = EXCLUDED.rhymes,
        structure = EXCLUDED.structure,
        style = EXCLUDED.style,
        charisma = EXCLUDED.charisma,
        vibe = EXCLUDED.vibe,
        memory = EXCLUDED.memory,
        total = EXCLUDED.total
    `, [
      track_id,
      user.id,
      rhymes,
      structure,
      style,
      charisma,
      vibe,
      memory,
      score
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "rate_failed" });
  }
});


app.post("/add-user-track", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);

    const { title, artist, soundcloud } = req.body;

let audioPath = null;
let coverPath = null;

// 🎵 AUDIO
if (req.files?.audio) {
  const file = req.files.audio[0];
  const fileName = `user-track-${Date.now()}.mp3`;
  const filePath = `public/uploads/tracks/${fileName}`;

  fs.writeFileSync(filePath, file.buffer);
  audioPath = `/uploads/tracks/${fileName}`;
}

// 🖼 COVER
if (req.files?.cover) {
  const file = req.files.cover[0];
  const fileName = `user-cover-${Date.now()}.webp`;
  const filePath = `public/uploads/tracks/covers/${fileName}`;

  await sharp(file.buffer)
    .resize(500, 500)
    .webp({ quality: 90 })
    .toFile(filePath);

  coverPath = `/uploads/tracks/covers/${fileName}`;
}

const result = await pool.query(
  `
  INSERT INTO user_tracks (user_id, title, artist, cover, audio, soundcloud)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
  `,
  [userId, title, artist, coverPath, audioPath, soundcloud]
);

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/user-tracks", async (req, res) => {
  try {
    const userId = req.query.id || getUserIdFromToken(req);

    const result = await pool.query(
      `
      SELECT * FROM user_tracks
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// ======================
// 🔥 QUEUE CONTROL (ADMIN)
// ======================

// получить состояние
app.get("/api/queue/state", async (req, res) => {
  const q = await pool.query(
    "SELECT value FROM system_settings WHERE key = 'queue_state'"
  );

  res.json({ state: q.rows[0]?.value || "open" });
});


// изменить состояние
app.post("/api/queue/state", requireRole(["admin"]), async (req, res) => {
  const { state } = req.body;

  if (!["open", "paused", "closed"].includes(state)) {
    return res.status(400).json({ error: "Invalid state" });
  }

  await pool.query(
    `
    INSERT INTO system_settings (key, value)
    VALUES ('queue_state', $1)
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value
    `,
    [state]
  );

  // 🔥 если открываем после closed → очищаем очередь
  if (state === "open") {
    const prev = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'queue_prev_state'"
    );

    if (prev.rows[0]?.value === "closed") {
      await pool.query("DELETE FROM tracks");
    }
  }

  // сохраняем прошлое состояние
  await pool.query(
    `
    INSERT INTO system_settings (key, value)
    VALUES ('queue_prev_state', $1)
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value
    `,
    [state]
  );

  res.json({ success: true });
});


app.get("/api/rate/check/:trackId", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.json({ rated: false });

    const trackId = req.params.trackId;

    const result = await pool.query(
      `
      SELECT 1
      FROM track_ratings
      WHERE track_id = $1 AND user_id = $2
      `,
      [trackId, user.id]
    );

    res.json({ rated: result.rows.length > 0 });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "check_failed" });
  }
});

app.get("/api/rate/my/:trackId", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { trackId } = req.params;

    const result = await pool.query(
      `SELECT rhymes, structure, style, charisma, vibe, memory
       FROM track_rating_details
       WHERE user_id = $1 
         AND track_id = $2 
         AND rating_type = 'judge'`,
      [userId, trackId]
    );

    if (!result.rows.length) {
      return res.json(null);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

app.post("/telegram-login", async (req, res) => {
  const { id, first_name, username, photo_url } = req.body;

  try {
    // ищем пользователя
    let user = await pool.query(
      "SELECT * FROM users WHERE telegram_id = $1",
      [id]
    );

    // 🟢 ЕСЛИ НОВЫЙ ПОЛЬЗОВАТЕЛЬ
    if (user.rows.length === 0) {

      // генерация уникального username_tag
      let baseTag = generateUsernameTag(username || first_name || "user");
      let username_tag = baseTag;
      let counter = 1;

      while (true) {
        const check = await pool.query(
          "SELECT id FROM users WHERE LOWER(username_tag) = LOWER($1)",
          [username_tag]
        );

        if (check.rows.length === 0) break;

        username_tag = baseTag + counter;
        counter++;
      }

      user = await pool.query(
        `
        INSERT INTO users (telegram_id, username, username_tag, avatar)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          id,
          first_name || "user",
          username_tag,
          photo_url || "/images/default-avatar.jpg"
        ]
      );

    } else {
      // 🔵 УЖЕ СУЩЕСТВУЕТ → НИЧЕГО НЕ МЕНЯЕМ
      user = user;
    }

    // создаём токен
    const token = jwt.sign(
  {
    id: user.rows[0].id,
    username: user.rows[0].username,
    avatar: user.rows[0].avatar
  },
  process.env.JWT_SECRET || "secret",
  { expiresIn: "7d" }
);

    res.json({ token });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Telegram auth error" });
  }
});
