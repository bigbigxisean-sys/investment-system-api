const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// =============================================================================
// Database Abstraction — PostgreSQL (Neon) with SQLite fallback
// =============================================================================
const DATABASE_URL = process.env.DATABASE_URL;
let db, mode;

if (DATABASE_URL) {
  // --- PostgreSQL mode (Render + Neon) ---
  mode = 'postgres';
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
  });
  const query = (sql, params) => pool.query(sql, params);
  db = { pool, query, mode: 'postgres' };
  console.log('✓ Database: PostgreSQL (Neon)');
} else {
  // --- SQLite mode (fallback — no env vars needed) ---
  mode = 'sqlite';
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
  console.log('⚠ No DATABASE_URL set, using SQLite fallback:', dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  const query = (sql, params) => {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                     sql.trim().toUpperCase().startsWith('RETURNING');
    // Convert $1,$2,... to ? for SQLite
    const converted = sql.replace(/\$(\d+)/g, '?');
    try {
      if (isSelect) {
        const rows = sqlite.prepare(converted).all(...(params || []));
        return { rows, rowCount: rows.length };
      } else {
        const info = sqlite.prepare(converted).run(...(params || []));
        return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
      }
    } catch (e) {
      throw e;
    }
  };

  db = { sqlite, query, mode: 'sqlite' };
}

async function initDb() {
  // Create tables (PostgreSQL syntax works for both with minor adjustments)
  await db.query(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY ${mode === 'postgres' ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      investor_name TEXT NOT NULL,
      investment_date TEXT NOT NULL,
      maturity_date TEXT NOT NULL,
      amount REAL NOT NULL,
      rate REAL DEFAULT 12,
      reinvest_type TEXT DEFAULT 'none',
      commission REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      redeemed_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS returns_tbl (
      id INTEGER PRIMARY KEY ${mode === 'postgres' ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      invest_id INTEGER NOT NULL REFERENCES investments(id),
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('interest_earned','commission')),
      amount REAL NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      name TEXT,
      view_all INTEGER DEFAULT 0
    )
  `);

  // Seed default users if empty
  const { rows } = await db.query('SELECT COUNT(*) as cnt FROM users');
  const count = mode === 'postgres' ? parseInt(rows[0].cnt) : rows[0].cnt;
  if (count === 0) {
    const users = [
      ['admin', bcrypt.hashSync('admin123', 10), 'admin', '管理员', 1],
      ['xiaoting', bcrypt.hashSync('860601', 10), 'broker', '晓婷', 0],
      ['daishenglan', bcrypt.hashSync('initial', 10), 'viewer', '戴胜兰', 1],
      ['wangxi', bcrypt.hashSync('initial', 10), 'investor', '王习', 0],
    ];
    for (const [u, p, r, n, v] of users) {
      await db.query(
        'INSERT INTO users (username, password_hash, role, name, view_all) VALUES ($1,$2,$3,$4,$5)',
        [u, p, r, n, v]
      );
    }
    console.log('✓ Default users seeded');
  } else {
    await db.query("UPDATE users SET name = '王习' WHERE username = 'wangxi' AND (name IS NULL OR name != '王习')");
  }
}

module.exports = { db, initDb };
