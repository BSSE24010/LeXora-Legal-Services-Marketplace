const { Pool } = require("pg");

if (!process.env.DB_URL) {
  throw new Error("Missing DB_URL in environment");
}

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

module.exports = pool;

