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

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "Нет токена" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Неверный токен" });
  }
}


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

    const userId = getUserIdFromToken(req);

    const user = await pool.query(
  `
  SELECT 
    id,
    username,
    username_tag,
    avatar,
    role,
    email,
    CASE 
      WHEN password IS NULL THEN false 
      ELSE true 
    END as has_password
  FROM users 
  WHERE id = $1
  `,
  [userId]
);

    if (!user.rows.length) {
      return res.status(404).json({ error: "user_not_found" });
    }

    res.json(user.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
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
  const userId = getUserIdFromToken(req);

global.emailChangeCodes[newEmail] = {
  code,
  userId
};

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

    const record = global.emailChangeCodes?.[newEmail];

if (!record || record.code != code || record.userId != userId) {
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

app.get("/api/profile", async (req, res) => {
  try {
    const tag = req.query.tag;

    // 🔥 1. ЕСЛИ ЕСТЬ TAG → НЕ ТРОГАЕМ JWT ВООБЩЕ
    if (tag) {
      const result = await pool.query(
        "SELECT id, username, username_tag, avatar, bio FROM users WHERE username_tag = $1",
        [tag]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(result.rows[0]);
    }

    // 🔥 2. ЕСЛИ TAG НЕТ → ЭТО МОЙ ПРОФИЛЬ
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const result = await pool.query(
      "SELECT id, username, username_tag, avatar, bio FROM users WHERE id = $1",
      [payload.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ error: "Server error" });
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
  users.avatar,
  (
    SELECT COUNT(*)::int
    FROM post_views
    WHERE post_views.post_id = posts.id
  ) AS views_count
FROM posts
JOIN users ON posts.user_id = users.id
WHERE posts.user_id=$1 AND COALESCE(posts.is_archived,false)=false
ORDER BY posts.created_at DESC
`,
[userId]
);

res.json(posts.rows);

}catch(err){

console.error("MY POSTS ERROR:", err);
res.status(500).send("error");

}

});

app.get("/posts", async (req, res) => {
  try {
    const tag = req.query.tag;

    let userId;

    if (tag) {
      const user = await pool.query(
        "SELECT id FROM users WHERE username_tag = $1",
        [tag]
      );

      if (user.rows.length === 0) {
        return res.json([]);
      }

      userId = user.rows[0].id;
    } else {
      userId = getUserIdFromToken(req);
    }

    const posts = await pool.query(
      `
      SELECT 
        posts.*,
        users.username,
        users.avatar,
        (
          SELECT COUNT(*)::int
          FROM post_views
          WHERE post_views.post_id = posts.id
        ) AS views_count
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

app.get("/archived-tracks", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);

    const result = await pool.query(
      `
      SELECT user_tracks.*, users.username_tag
      FROM user_tracks
      JOIN users ON users.id = user_tracks.user_id
      WHERE user_tracks.user_id = $1
        AND COALESCE(user_tracks.is_archived, false) = true
      ORDER BY user_tracks.created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ARCHIVED TRACKS ERROR:", err);
    res.status(500).json({ error: "archived_tracks_error" });
  }
});

app.put("/archive-track/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const trackId = req.params.id;

    await pool.query(
      `
      UPDATE user_tracks
      SET is_archived = NOT COALESCE(is_archived, false)
      WHERE id = $1 AND user_id = $2
      `,
      [trackId, userId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("ARCHIVE TRACK ERROR:", err);
    res.status(500).json({ error: "archive_track_failed" });
  }
});

app.delete("/delete-track/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const trackId = req.params.id;

    // проверка что это ТВОЙ трек
    const check = await pool.query(
      "SELECT audio, cover FROM user_tracks WHERE id = $1 AND user_id = $2",
      [trackId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Track not found" });
    }

    const track = check.rows[0];

    // удалить файлы
    if (track.audio) {
      const pathAudio = path.join(__dirname, "..", "public", track.audio);
      fs.unlink(pathAudio, () => {});
    }

    if (track.cover) {
      const pathCover = path.join(__dirname, "..", "public", track.cover);
      fs.unlink(pathCover, () => {});
    }

    // удалить из БД
    await pool.query(
      "DELETE FROM user_tracks WHERE id = $1 AND user_id = $2",
      [trackId, userId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE TRACK ERROR:", err);
    res.status(500).json({ error: "server_error" });
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

    // 🔥 получаем статус
    const q = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'queue_state'"
    );

    const state = q.rows[0]?.value || "open";

    let query = "";

    if(state === "closed"){

      // 🏆 СОРТИРОВКА ПО РЕЙТИНГУ
      query = `
        SELECT 
          t.*,

          (
            SELECT COALESCE(ROUND(AVG(score)),0)
            FROM track_ratings
            WHERE track_id = t.id AND type = 'user'
          ) as user_score,

          (
            SELECT COALESCE(ROUND(AVG(score)),0)
            FROM track_ratings
            WHERE track_id = t.id AND type = 'judge'
          ) as judge_score,

          (
            COALESCE((
              SELECT AVG(score)
              FROM track_ratings
              WHERE track_id = t.id AND type = 'user'
            ),0)
            +
            COALESCE((
              SELECT AVG(score)
              FROM track_ratings
              WHERE track_id = t.id AND type = 'judge'
            ),0)
          ) as total_score

        FROM tracks t

        ORDER BY total_score DESC
      `;

    }else{

      // 🧾 ОБЫЧНАЯ ОЧЕРЕДЬ
      query = `
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
      `;
    }

    const result = await pool.query(query);

    res.json({
      state,
      tracks: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка загрузки очереди" });
  }
});


// ❌ удалить трек
app.delete("/api/tracks/:id", requireRole(["judge", "admin"]), async (req, res) => {
  try {
    const tag = req.query.tag;

let userId;

if(tag){
  const user = await pool.query(
    "SELECT id FROM users WHERE username_tag = $1",
    [tag]
  );

  if(user.rows.length === 0){
    return res.json([]);
  }

  userId = user.rows[0].id;
}else{
  userId = req.user.id;
}

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

app.get("/api/search", async (req, res) => {
  const q = req.query.q?.toLowerCase();

  if (!q) {
    return res.json({ users: [] });
  }

  try {
    const users = await pool.query(`
  SELECT 
    u.id,
    u.username,
    u.username_tag,
    u.avatar
  FROM users u
  WHERE 
    LOWER(u.username_tag) LIKE $1

  UNION

  SELECT 
    u.id,
    u.username,
    u.username_tag,
    u.avatar
  FROM users u
  WHERE 
    LOWER(u.username) LIKE $1

  LIMIT 10
`, [`%${q}%`]);

    res.json({
      users: users.rows
    });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ users: [] });
  }
});


app.post("/api/track-like", auth, async (req, res) => {
  const { trackId } = req.body;
  const userId = req.user.id;

  const existing = await pool.query(
    `SELECT * FROM track_likes WHERE user_id=$1 AND track_id=$2`,
    [userId, trackId]
  );

  if (existing.rows.length > 0) {
    // удалить лайк
    await pool.query(
      `DELETE FROM track_likes WHERE user_id=$1 AND track_id=$2`,
      [userId, trackId]
    );
    return res.json({ liked: false });
  }

  // поставить лайк
  await pool.query(
    `INSERT INTO track_likes (user_id, track_id) VALUES ($1,$2)`,
    [userId, trackId]
  );

  res.json({ liked: true });
});

app.get("/api/track-likes/:id", async (req, res) => {
  const trackId = req.params.id;
  const token = req.headers.authorization?.split(" ")[1];

  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }

  const count = await pool.query(
    `SELECT COUNT(*) FROM track_likes WHERE track_id=$1`,
    [trackId]
  );

  let liked = false;

  if (userId) {
    const check = await pool.query(
      `SELECT 1 FROM track_likes WHERE user_id=$1 AND track_id=$2`,
      [userId, trackId]
    );
    liked = check.rows.length > 0;
  }

  res.json({
    count: Number(count.rows[0].count),
    liked
  });
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
    const {
  title,
  artist,
  producer,
  genre,
  tags,
  description,
  soundcloud
} = req.body;
const slug = slugify(title);
    

    if (!title) {
  return res.status(400).json({ error: "title_required" });
}

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
  INSERT INTO user_tracks 
  (user_id, title, artist, producer, genre, tags, description, cover, audio, soundcloud, slug)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  RETURNING *
  `,
  [
    userId,
    title,
    artist,
    producer,
    genre,
    tags,
    description,
    coverPath,
    audioPath,
    soundcloud,
    slug
  ]
);

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

app.put("/update-track/:id", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]), async (req, res) => {
  try {

    const userId = getUserIdFromToken(req)
    const trackId = req.params.id

    const {
      title,
      artist,
      producer,
      genre,
      tags,
      description
    } = req.body

    let audioPath = null
    let coverPath = null

    // 🎵 AUDIO
    if (req.files?.audio) {
      const file = req.files.audio[0]
      const fileName = `user-track-${Date.now()}.mp3`
      const filePath = `public/uploads/tracks/${fileName}`

      fs.writeFileSync(filePath, file.buffer)
      audioPath = `/uploads/tracks/${fileName}`
    }

    // 🖼 COVER
    if (req.files?.cover) {
      const file = req.files.cover[0]
      const fileName = `user-cover-${Date.now()}.webp`
      const filePath = `public/uploads/tracks/covers/${fileName}`

      await sharp(file.buffer)
        .resize(500, 500)
        .webp({ quality: 90 })
        .toFile(filePath)

      coverPath = `/uploads/tracks/covers/${fileName}`
    }

    await pool.query(`
      UPDATE user_tracks SET
        title = $1,
        artist = $2,
        producer = $3,
        genre = $4,
        tags = $5,
        description = $6,
        audio = COALESCE($7, audio),
        cover = COALESCE($8, cover)
      WHERE id = $9 AND user_id = $10
    `, [
      title,
      artist,
      producer,
      genre,
      tags,
      description,
      audioPath,
      coverPath,
      trackId,
      userId
    ])

    res.json({ success: true })

  } catch (err) {
    console.error("UPDATE TRACK ERROR:", err)
    res.status(500).json({ error: "update_failed" })
  }
})

app.get("/user-tracks", async (req, res) => {
  try {
    const tag = req.query.tag;

    let userId;

    if (tag) {
      const user = await pool.query(
        "SELECT id FROM users WHERE username_tag = $1",
        [tag]
      );

      if (user.rows.length === 0) {
        return res.json([]);
      }

      userId = user.rows[0].id;
    } else {
      userId = getUserIdFromToken(req);
    }

    const result = await pool.query(
      `
      SELECT 
        user_tracks.*,
        users.username_tag,
        (
          SELECT COUNT(*)::int
          FROM track_listens
          WHERE track_listens.track_id = user_tracks.id
        ) AS listens_count
      FROM user_tracks
      JOIN users ON users.id = user_tracks.user_id
      WHERE user_tracks.user_id = $1
        AND COALESCE(user_tracks.is_archived, false) = false
      ORDER BY user_tracks.created_at DESC
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

app.post("/follow/:id", async (req, res) => {
  const userId = getUserIdFromToken(req);
  const targetId = parseInt(req.params.id);

  if (!userId || userId === targetId) {
    return res.status(400).json({ error: "invalid" });
  }

  try {
    const exists = await pool.query(
      "SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2",
      [userId, targetId]
    );

    if (exists.rows.length > 0) {
      // отписка
      await pool.query(
        "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
        [userId, targetId]
      );

      return res.json({ following: false });
    } else {
      // подписка
      await pool.query(
        "INSERT INTO follows (follower_id, following_id) VALUES ($1,$2)",
        [userId, targetId]
      );

      return res.json({ following: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/follow-status/:id", async (req, res) => {
  const userId = getUserIdFromToken(req);
  const targetId = parseInt(req.params.id);

  if (!userId) return res.json({ following: false });

  const result = await pool.query(
    "SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2",
    [userId, targetId]
  );

  res.json({ following: result.rows.length > 0 });
});

app.get("/followers-count/:id", async (req, res) => {
  const userId = req.params.id;

  const result = await pool.query(
    "SELECT COUNT(*) FROM follows WHERE following_id = $1",
    [userId]
  );

  res.json({ count: Number(result.rows[0].count) });
});

app.get("/following-count/:id", async (req, res) => {
  const userId = req.params.id;

  const result = await pool.query(
    "SELECT COUNT(*) FROM follows WHERE follower_id = $1",
    [userId]
  );

  res.json({ count: Number(result.rows[0].count) });
});

app.get("/followers/:id", async (req, res) => {
  const id = parseInt(req.params.id)

  const result = await pool.query(`
    SELECT users.id, users.username, users.username_tag, users.avatar
    FROM follows
    JOIN users ON users.id = follows.follower_id
    WHERE follows.following_id = $1
  `, [id])

  res.json(result.rows)
})

app.get("/following/:id", async (req, res) => {
  const id = parseInt(req.params.id)

  const result = await pool.query(`
    SELECT users.id, users.username, users.username_tag, users.avatar
    FROM follows
    JOIN users ON users.id = follows.following_id
    WHERE follows.follower_id = $1
  `, [id])

  res.json(result.rows)
})

app.get("/api/track/:tag/:slug", async (req, res) => {
  try {
    const { tag, slug } = req.params;

    const userRes = await pool.query(
      `SELECT id FROM users WHERE LOWER(username_tag) = LOWER($1)`,
      [tag]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const userId = userRes.rows[0].id;

    const trackRes = await pool.query(
      `
      SELECT
        t.*,
        u.username,
        u.username_tag,
        COALESCE((
          SELECT COUNT(*)::int
          FROM track_likes tl
          WHERE tl.track_id = t.id
        ), 0) AS likes_count,
        COALESCE((
          SELECT COUNT(*)::int
          FROM track_comments tc
          WHERE tc.track_id = t.id
        ), 0) AS comments_count,
        COALESCE((
          SELECT COUNT(*)::int
          FROM track_listens tls
          WHERE tls.track_id = t.id
        ), 0) AS listens_count
      FROM user_tracks t
      JOIN users u ON u.id = t.user_id
      WHERE t.user_id = $1
        AND t.slug = $2
        AND COALESCE(t.is_archived, false) = false
      LIMIT 1
      `,
      [userId, slug]
    );

    if (!trackRes.rows.length) {
      return res.status(404).json({ error: "track_not_found" });
    }

    res.json(trackRes.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});





function slugify(text) {
  return text
    .toLowerCase()

    // рус → транслит
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/ё/g, "e")
    .replace(/ж/g, "zh")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/й/g, "y")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "c")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sh")
    .replace(/ы/g, "y")
    .replace(/э/g, "e")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya")

    // всё остальное
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}




app.get("/track-comments/:trackId", async (req, res) => {
  const { trackId } = req.params;

  const result = await pool.query(`
    SELECT c.*, u.username,
      (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes
    FROM track_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.track_id = $1
    ORDER BY c.created_at DESC
  `, [trackId]);

  res.json(result.rows);
});


app.post("/add-track-comment", auth, async (req, res) => {
  const { trackId, text } = req.body;

  await pool.query(`
    INSERT INTO track_comments (track_id, user_id, text)
    VALUES ($1,$2,$3)
  `, [trackId, req.user.id, text]);

  res.json({ ok: true });
});

app.post("/comment-like", auth, async (req, res) => {
  const { commentId } = req.body;
  const userId = req.user.id;

  const exists = await pool.query(
    "SELECT * FROM comment_likes WHERE comment_id=$1 AND user_id=$2",
    [commentId, userId]
  );

  if (exists.rows.length) {
    await pool.query(
      "DELETE FROM comment_likes WHERE comment_id=$1 AND user_id=$2",
      [commentId, userId]
    );
    return res.json({ liked: false });
  }

  await pool.query(
    "INSERT INTO comment_likes (comment_id,user_id) VALUES ($1,$2)",
    [commentId, userId]
  );

  res.json({ liked: true });
});

app.get("/discover-tracks", auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.title,
        t.artist,
        t.genre,
        t.tags,
        t.cover,
        t.audio AS "audioSrc",
        t.soundcloud,
        u.username,
        u.username_tag
      FROM user_tracks t
      JOIN users u ON u.id = t.user_id
      WHERE COALESCE(t.is_archived, false) = false
        AND (t.audio IS NOT NULL OR t.soundcloud IS NOT NULL)
      ORDER BY RANDOM()
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("DISCOVER ERROR:", err);
    res.status(500).json({ error: "failed" });
  }
});

app.post("/track-action", auth, async (req, res) => {
  try {
    const { trackId, action } = req.body;

    if (!trackId || !["like", "dislike"].includes(action)) {
      return res.status(400).json({ error: "invalid_data" });
    }

    await pool.query(
      `DELETE FROM track_actions WHERE user_id = $1 AND track_id = $2`,
      [req.user.id, trackId]
    );

    await pool.query(
      `INSERT INTO track_actions (user_id, track_id, action)
       VALUES ($1, $2, $3)`,
      [req.user.id, trackId, action]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("TRACK ACTION ERROR:", err);
    res.status(500).json({ error: "action error" });
  }
});

app.use((req, res, next) => {
  // НЕ ТРОГАЕМ API
  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "../public/index.html"));
});
app.post("/api/posts/:id/view", auth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.user.id;

    const postRes = await pool.query(
      "SELECT id, user_id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postRes.rows.length) {
      return res.status(404).json({ error: "post_not_found" });
    }

    const post = postRes.rows[0];

    if (Number(post.user_id) !== Number(userId)) {
      await pool.query(
        `
        INSERT INTO post_views (post_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (post_id, user_id) DO NOTHING
        `,
        [postId, userId]
      );
    }

    const countRes = await pool.query(
      "SELECT COUNT(*)::int AS count FROM post_views WHERE post_id = $1",
      [postId]
    );

    res.json({
      success: true,
      views_count: countRes.rows[0].count
    });
  } catch (err) {
    console.error("POST VIEW ERROR:", err);
    res.status(500).json({ error: "post_view_failed" });
  }
});
app.post("/api/user-tracks/:id/listen", auth, async (req, res) => {
  try {
    const trackId = Number(req.params.id);
    const userId = req.user.id;

    const trackRes = await pool.query(
      "SELECT id, user_id FROM user_tracks WHERE id = $1",
      [trackId]
    );

    if (!trackRes.rows.length) {
      return res.status(404).json({ error: "track_not_found" });
    }

    const track = trackRes.rows[0];

    // ❌ НЕ считаем свои прослушивания
    if (Number(track.user_id) !== Number(userId)) {

      // ✅ ПРОСТО вставляем (БЕЗ ON CONFLICT)
      await pool.query(
        `
        INSERT INTO track_listens (track_id, user_id)
        VALUES ($1, $2)
        `,
        [trackId, userId]
      );
    }

    const countRes = await pool.query(
      "SELECT COUNT(*)::int AS count FROM track_listens WHERE track_id = $1",
      [trackId]
    );

    res.json({
      success: true,
      listens_count: countRes.rows[0].count
    });

  } catch (err) {
    console.error("TRACK LISTEN ERROR:", err);
    res.status(500).json({ error: "track_listen_failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
