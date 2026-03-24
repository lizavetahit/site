const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const pool = require("../database/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");

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

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, "SECRET_KEY");
  return decoded.id;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/index.html"));
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

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

const result = await pool.query(
  "INSERT INTO users (username,email,password,avatar) VALUES ($1,$2,$3,$4) RETURNING id,username,email,avatar",
  [username, email, hash, "/images/default-avatar.jpg"]
);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Registration error");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

    if (user.rows.length === 0) {
      return res.status(400).send("User not found");
    }

    const valid = await bcrypt.compare(password, user.rows[0].password);

    if (!valid) {
      return res.status(400).send("Wrong password");
    }

    const token = jwt.sign({ id: user.rows[0].id }, "SECRET_KEY", {
      expiresIn: "7d"
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});

app.get("/profile", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);

    const user = await pool.query(
      `SELECT username,email,bio,avatar,soundcloud,instagram,twitter,telegram,website
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

app.put("/update-profile", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);

    const currentResult = await pool.query(
      `SELECT username,bio,avatar,soundcloud,instagram,twitter,telegram,website
       FROM users
       WHERE id=$1`,
      [userId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const current = currentResult.rows[0];

    const username =
      req.body.username !== undefined ? String(req.body.username).trim() : current.username;

    const bio = req.body.bio !== undefined ? req.body.bio : current.bio;
    const avatar = req.body.avatar !== undefined ? req.body.avatar : current.avatar;
    const soundcloud =
      req.body.soundcloud !== undefined ? req.body.soundcloud : current.soundcloud;
    const instagram =
      req.body.instagram !== undefined ? req.body.instagram : current.instagram;
    const twitter = req.body.twitter !== undefined ? req.body.twitter : current.twitter;
    const telegram =
      req.body.telegram !== undefined ? req.body.telegram : current.telegram;
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

    const result = await pool.query(
`UPDATE users
SET
username = $1,
bio = $2,
avatar = $3,
soundcloud = $4,
instagram = $5,
twitter = $6,
telegram = $7,
website = $8
WHERE id = $9
RETURNING username,bio,avatar,soundcloud,instagram,twitter,telegram,website`,
[
username,
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
    res.status(500).send("Error updating profile");
  }
});

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
WHERE posts.user_id=$1
ORDER BY posts.created_at DESC
`,
[userId]
);

res.json(posts.rows);

}catch(err){

res.status(500).send("error");

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


const tracksFile = path.join(__dirname, "../data/tracks.json")

function readTracks() {
  if (!fs.existsSync(tracksFile)) return []
  return JSON.parse(fs.readFileSync(tracksFile))
}

function writeTracks(data) {
  fs.writeFileSync(tracksFile, JSON.stringify(data, null, 2))
}

// 🎧 загрузка трека
app.post("/api/tracks", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]), async (req, res) => {
  try {
    const tracks = readTracks();
    const id = Date.now();

    const audioFile = req.files?.audio?.[0] || null;
    const coverFile = req.files?.cover?.[0] || null;

    const artist = String(req.body.artist || "").trim();
    const title = String(req.body.title || "").trim();
    const soundcloudUrl = String(req.body.soundcloud || "").trim();
    const coverUrlFromClient = req.body.coverUrl || null;

    if (!audioFile && !soundcloudUrl) {
      return res.status(400).json({
        message: "Нужно добавить либо аудиофайл, либо ссылку SoundCloud"
      });
    }

    if (!artist || !title) {
      return res.status(400).json({
        message: "Заполни автора и название трека"
      });
    }

    let audioUrl = null;
    let coverUrl = null;

    // сохраняем аудио, только если файл реально есть
    if (audioFile) {
      const ext = path.extname(audioFile.originalname) || ".mp3";
      const audioName = `track-${id}${ext}`;
      const audioPath = path.join(__dirname, "../public/uploads/tracks/audio", audioName);

      fs.writeFileSync(audioPath, audioFile.buffer);
      audioUrl = `/uploads/tracks/audio/${audioName}`;
    }

    // сохраняем обложку, если загрузили файл
if (coverFile && coverFile.buffer) {
  try {
    const coverName = `cover-${id}.webp`;
    const coverDir = path.join(__dirname, "../public/uploads/tracks/covers");
    const coverPath = path.join(coverDir, coverName);

    // 🔥 создаём папку если нет
    if (!fs.existsSync(coverDir)) {
      fs.mkdirSync(coverDir, { recursive: true });
    }

    await sharp(coverFile.buffer)
      .resize(500, 500, { fit: "cover" })
      .webp({ quality: 90 })
      .toFile(coverPath);

    coverUrl = `/uploads/tracks/covers/${coverName}`;
  } catch (err) {
    console.error("Cover upload error:", err);
  }
}

// 🔥 ЕСЛИ ОБЛОЖКА С SOUNDCLOUD
else if (coverUrlFromClient) {
  coverUrl = coverUrlFromClient;
}

    const newTrack = {
      id,
      artist,
      title,
      cover: coverUrl,
      audio: audioUrl,
      soundcloud: soundcloudUrl || null,
      createdAt: new Date().toISOString()
    };

    tracks.push(newTrack);
    writeTracks(tracks);

    res.json({
      success: true,
      track: newTrack
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});


// 📜 очередь
app.get("/api/tracks/queue", (req, res) => {
  const tracks = readTracks()
  res.json(tracks)
})


// 🗑 удалить трек
app.delete("/api/tracks/:id", (req, res) => {

  const id = Number(req.params.id)
  let tracks = readTracks()

  const track = tracks.find(t => t.id === id)

  if (!track) {
    return res.status(404).json({ message: "Track not found" })
  }

  // удаляем файлы
 // удаляем аудио
if (track.audio) {
  const audioPath = path.join(__dirname, "../public", track.audio)

  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath)
  }
}

// удаляем обложку ТОЛЬКО если она локальная
if (track.cover && track.cover.startsWith("/uploads")) {
  const coverPath = path.join(__dirname, "../public", track.cover)

  if (fs.existsSync(coverPath)) {
    fs.unlinkSync(coverPath)
  }
}

  tracks = tracks.filter(t => t.id !== id)

  writeTracks(tracks)

  res.json({ success: true })

})

app.get("/api/soundcloud", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();

    if (!url) {
      return res.status(400).json({ message: "No URL" });
    }

    const oembedUrl =
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;

    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return res.status(400).json({ message: "SoundCloud link not recognized" });
    }

    const data = await response.json();

    let artist = data.author_name || "";
    let title = data.title || "";
    const artwork = data.thumbnail_url || null;

    // чистим title от мусора
    // пример: "Stream сладких снов(weizz) by хизаво"
    title = title.replace(/^Stream\s+/i, "").trim();
    title = title.replace(/\s+by\s+.+$/i, "").trim();
    title = title.replace(/\s*\|\s*Listen.*$/i, "").trim();

    res.json({
      artist,
      title,
      artwork
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error parsing SoundCloud" });
  }
});

app.get("/api/tracks/:id", (req, res) => {
  const id = Number(req.params.id)
  const tracks = readTracks()

  const track = tracks.find(t => t.id === id)

  if (!track) {
    return res.status(404).json({ message: "Track not found" })
  }

  res.json(track)
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});