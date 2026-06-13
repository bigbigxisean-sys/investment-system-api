const { Router } = require('express');
const { db } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'investment-system-jwt-secret';

router.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = req.body.password || '';
    if (!username || !password) return res.json({ ok: false, error: '请输入用户名和密码' });

    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password_hash)) {
      return res.json({ ok: false, error: '用户名或密码错误' });
    }
    const user = rows[0];
    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      ok: true, token,
      user: { name: user.name, username: user.username, role: user.role, viewAll: !!user.view_all }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    if (!auth) return res.json({ ok: false });
    const decoded = jwt.verify(auth, JWT_SECRET);
    res.json({
      ok: true,
      user: { name: decoded.name, username: decoded.username, role: decoded.role }
    });
  } catch {
    res.json({ ok: false });
  }
});

router.post('/logout', async (req, res) => {
  res.json({ ok: true });
});

router.post('/change-password', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const { oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) return res.json({ ok: false, error: '参数不完整' });
    if (newPassword.length < 6) return res.json({ ok: false, error: '新密码至少6位' });

    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0 || !bcrypt.compareSync(oldPassword, rows[0].password_hash)) {
      return res.json({ ok: false, error: '用户名或当前密码错误' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
