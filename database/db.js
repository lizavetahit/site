const { Pool } = require("pg")

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "music_platform",
    password: "11111111",
    port: 5432
})

module.exports = pool