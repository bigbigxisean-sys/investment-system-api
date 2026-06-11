const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'investment.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investorName TEXT NOT NULL,
    investmentDate TEXT NOT NULL,
    maturityDate TEXT NOT NULL,
    amount REAL NOT NULL,
    rate REAL NOT NULL DEFAULT 12,
    reinvestType TEXT DEFAULT 'none',
    commission REAL DEFAULT 5,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    redeemedDate TEXT,
    createdAt TEXT DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investId INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('interest_earned','commission')),
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    FOREIGN KEY (investId) REFERENCES investments(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'investor',
    name TEXT,
    viewAll INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (username) REFERENCES users(username)
  );
`);

// ── Seed default users if empty ──
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
if (userCount === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, role, name, viewAll) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('xiaoting', '860601', 'broker', '晓婷', 0);
  insertUser.run('daishenglan', 'initial', 'viewer', '戴胜兰', 1);
  insertUser.run('wangxi', 'initial', 'investor', '王希', 0);
}

module.exports = db;
