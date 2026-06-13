const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATABASE_URL=process.env.DATABASE_URL;

let db, mode;

if (DATABASE_URL) {
  // PostgreSQL mode (Neon)
  mode = 'postgres';
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10000,
  });
  const query = async (sql, params) => {
    const result = await pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  };
  db = { pool, query, mode: 'postgres' };
  console.log('✓ Database: PostgreSQL (Neon)');
} else {
  // SQLite fallback
  mode = 'sqlite';
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
  console.log('⚠ No DATABASE_URL, using SQLite:', dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const query = (sql, params) => {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                     sql.trim().toUpperCase().startsWith('RETURNING');
    const converted = sql.replace(/\$(\d+)/g, '?');
    if (isSelect) {
      const rows = sqlite.prepare(converted).all(...(params || []));
      return { rows, rowCount: rows.length };
    } else {
      const info = sqlite.prepare(converted).run(...(params || []));
      return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
    }
  };
  db = { sqlite, query, mode: 'sqlite' };
}

async function initDb() {
  // Test PostgreSQL connection if applicable
  if (db.mode === 'postgres') {
    try {
      await db.query('SELECT 1');
    } catch (e) {
      console.warn('⚠ PostgreSQL connection failed:', e.message);
      console.warn('  Falling back to SQLite');
      mode = 'sqlite';
      const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
      const sqlite = new Database(dbPath);
      sqlite.pragma('journal_mode = WAL');
      const query = (sql, params) => {
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                         sql.trim().toUpperCase().startsWith('RETURNING');
        const converted = sql.replace(/\$(\d+)/g, '?');
        if (isSelect) {
          const rows = sqlite.prepare(converted).all(...(params || []));
          return { rows, rowCount: rows.length };
        } else {
          const info = sqlite.prepare(converted).run(...(params || []));
          return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
        }
      };
      db = { sqlite, query, mode: 'sqlite' };
    }
  }

  // Create tables
  const serialType = db.mode === 'postgres' ? 'SERIAL' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  await db.query(`CREATE TABLE IF NOT EXISTS investments (
    id ${serialType},
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
    created_at TEXT DEFAULT ${db.mode === 'postgres' ? "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')" : "(datetime('now'))"}
  )`);

  // Add primary key for postgres (SERIAL doesn't auto-create PK)
  if (db.mode === 'postgres') {
    try { await db.query('ALTER TABLE investments ADD PRIMARY KEY (id)'); } catch(e) {}
  }

  await db.query(`CREATE TABLE IF NOT EXISTS returns_tbl (
    id ${db.mode === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
    invest_id INTEGER NOT NULL REFERENCES investments(id),
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('interest_earned','commission')),
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT ${db.mode === 'postgres' ? "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')" : "(datetime('now'))"}
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    name TEXT,
    view_all INTEGER DEFAULT 0,
    blocked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT ${db.mode === 'postgres' ? "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')" : "(datetime('now'))"}
  )`);

  // === Migration: adapt old schema to new ===
  if (db.mode === 'postgres') {
    // Detect old investments schema (camelCase columns)
    try {
      const { rows: chk } = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='investments' AND column_name='investorName'"
      );
      if (chk.length > 0) {
        // Old schema: drop and recreate investments table with new column names
        // First, drop returns_tbl (has FK dependency)
        await db.query('DROP TABLE IF EXISTS returns_tbl CASCADE');
        await db.query('DROP TABLE IF EXISTS investments CASCADE');
        await db.query(`CREATE TABLE investments (
          id SERIAL PRIMARY KEY,
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
          created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
        )`);
        await db.query(`CREATE TABLE returns_tbl (
          id SERIAL PRIMARY KEY,
          invest_id INTEGER NOT NULL REFERENCES investments(id),
          date TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('interest_earned','commission')),
          amount REAL NOT NULL,
          note TEXT DEFAULT '',
          created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
        )`);
        console.log('✓ Migrated: investments + returns_tbl schema');
      }
    } catch(e) { /* tables may not exist */ }

    // Detect old users schema (column named `password`)
    try {
      const { rows: chk } = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password'"
      );
      if (chk.length > 0) {
        // Old schema: migrate plain text passwords to bcrypt hashes
        const { rows: oldUsers } = await db.query('SELECT username, password FROM users');
        for (const u of oldUsers) {
          const hash = bcrypt.hashSync(u.password, 10);
          await db.query('UPDATE users SET password = $1 WHERE username = $2', [hash, u.username]);
        }
        await db.query('ALTER TABLE users RENAME COLUMN password TO password_hash');
        console.log('✓ Migrated: password → password_hash (bcrypt)');
      }
    } catch(e) { /* table may not exist yet */ }
    // Add missing columns
    try { await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked INTEGER DEFAULT 0'); } catch(e) {}
    try { await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS view_all INTEGER DEFAULT 0'); } catch(e) {}
  }

  // Seed users
  const { rows } = await db.query('SELECT COUNT(*) as cnt FROM users');
  const count = db.mode === 'postgres' ? parseInt(rows[0].cnt) : rows[0].cnt;
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
  }
}

module.exports = { db, initDb };
