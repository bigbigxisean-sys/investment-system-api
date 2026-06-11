const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = require('express').Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ ok: false, error: '请输入用户名和密码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
  if (!user || user.password !== password) {
    return res.json({ ok: false, error: '用户名或密码错误' });
  }

  // Create session token
  const token = uuidv4();
  db.prepare('INSERT INTO sessions (token, username) VALUES (?, ?)').run(token, user.username);

  res.json({
    ok: true,
    token,
    user: {
      username: user.username,
      role: user.role,
      name: user.name,
      viewAll: !!user.viewAll
    }
  });
});

// POST /api/auth/change-password
router.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) {
    return res.json({ ok: false, error: '参数不完整' });
  }
  if (newPassword.length < 6) {
    return res.json({ ok: false, error: '新密码至少6位' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
  if (!user || user.password !== oldPassword) {
    return res.json({ ok: false, error: '用户名或当前密码错误' });
  }

  db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newPassword, user.username);
  res.json({ ok: true });
});

// POST /api/auth/verify (verify token from header)
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.json({ ok: false });

  const session = db.prepare(`
    SELECT s.username, u.role, u.name, u.viewAll
    FROM sessions s JOIN users u ON s.username = u.username
    WHERE s.token = ?
  `).get(token);

  if (!session) return res.json({ ok: false });
  res.json({ ok: true, user: session });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ ok: true });
});

module.exports = router;
