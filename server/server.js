const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const pool = require("../database/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const app = express();

app.use(cors());
app.use(bodyParser.json());
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
      "INSERT INTO users (username,email,password) VALUES ($1,$2,$3) RETURNING id,username,email",
      [username, email, hash]
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

app.get("/my-posts", async (req, res) => {
  res.json([{ content: "Мой первый пост" }, { content: "Работаю над новым треком" }]);
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
       SET username=$1,
           bio=$2,
           avatar=$3,
           soundcloud=$4,
           instagram=$5,
           twitter=$6,
           telegram=$7,
           website=$8
       WHERE id=$9
       RETURNING username,bio,avatar,soundcloud,instagram,twitter,telegram,website`,
      [username, bio, avatar, soundcloud, instagram, twitter, telegram, website, userId]
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});