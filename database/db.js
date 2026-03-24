require('dotenv').config();
const { Pool } = require("pg");

// Перевіряємо, чи ми на сервері (Render) чи локально.
// На Render зазвичай встановлена змінна NODE_ENV=production
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL потрібен ТІЛЬКИ для Render. Для локалки він зазвичай заважає.
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = pool;