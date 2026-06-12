const { Pool } = require('pg');

const p_user = "postgres";
const p_host = "aws-0-ap-southeast-1.pooler.supabase.com";
const p_port = "5432";
const p_db = "postgres";
const p_pass = "021985O0o---!";

const DATABASE_URL = "postgresql://" + p_user + "." + p_ref + ":" + p_pass + "@" + p_host + ":" + p_port + "/" + p_db;

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        "investorName" TEXT NOT NULL,
        "investmentDate" TEXT NOT NULL,
        "maturityDate" TEXT NOT NULL,
        amount REAL NOT NULL,
        rate REAL DEFAULT 12,
        "reinvestType" TEXT DEFAULT 'none',
        commission REAL DEFAULT 5,
        notes TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        "redeemedDate" TEXT,
        "createdAt" TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD'))
      );

      CREATE TABLE IF NOT EXISTS returns (
        id SERIAL PRIMARY KEY,
        "investId" INTEGER NOT NULL REFERENCES investments(id),
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('interest_earned','commission')),
        amount REAL NOT NULL,
        note TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'investor',
        name TEXT,
        "viewAll" INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        username TEXT NOT NULL REFERENCES users(username),
        "createdAt" TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );
    `);

    const { rowCount } = await client.query('SELECT COUNT(*) as cnt FROM users');
    if (parseInt(rowCount) === 0) {
      await client.query(
        'INSERT INTO users (username, password, role, name, "viewAll") VALUES ($1, $2, $3, $4, $5)',
        ['xiaoting', '860601', 'broker', '晓婷', 0]
      );
      await client.query(
        'INSERT INTO users (username, password, role, name, "viewAll") VALUES ($1, $2, $3, $4, $5)',
        ['daishenglan', 'initial', 'viewer', '戴胜兰', 1]
      );
      await client.query(
        'INSERT INTO users (username, password, role, name, "viewAll") VALUES ($1, $2, $3, $4, $5)',
        ['wangxi', 'initial', 'investor', '王习', 0]
      );
    } else {
      await client.query("UPDATE users SET name = '王习' WHERE username = 'wangxi' AND name != '王习'");
    }
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
