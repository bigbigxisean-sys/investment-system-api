const { Router } = require('express');
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = req.body.password || '';
    if (!username || !password) return res.json({ ok: false, error: '请输入用户名和密码' });

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0 || rows[0].password !== password) {
      return res.json({ ok: false, error: '用户名或密码错误' });
    }
    const user = rows[0];
    const token = uuidv4();
    await pool.query('INSERT INTO sessions (token, username) VALUES ($1, $2)', [token, username]);
    res.json({
      ok: true, token,
      user: { username: user.username, role: user.role, name: user.name, viewAll: !!user.viewAll }
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/change-password', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const { oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) return res.json({ ok: false, error: '参数不完整' });
    if (newPassword.length < 6) return res.json({ ok: false, error: '新密码至少6位' });

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0 || rows[0].password !== oldPassword) {
      return res.json({ ok: false, error: '用户名或当前密码错误' });
    }
    await pool.query('UPDATE users SET password = $1 WHERE username = $2', [newPassword, username]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/verify', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.json({ ok: false });

    const { rows } = await pool.query(
      'SELECT s.username, u.role, u.name, u."viewAll" FROM sessions s JOIN users u ON s.username = u.username WHERE s.token = $1',
      [token]
    );
    if (rows.length === 0) return res.json({ ok: false });
    const s = rows[0];
    res.json({ ok: true, user: { username: s.username, role: s.role, name: s.name, viewAll: !!s.viewAll } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/logout', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
