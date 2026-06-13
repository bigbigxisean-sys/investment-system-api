const { Router } = require('express');
const { db } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nameToPinyin } = require('../pinyin');

const router = Router();
const JWT_SECRET=process.env.JWT_SECRET || 'investment-system-jwt-secret';
const DEFAULT_PASSWORD='***';

function requireAdmin(req, res, next) {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ ok: false, error: '未登录' });
  try {
    const decoded = jwt.verify(auth, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ ok: false, error: '仅管理员可操作' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token无效' });
  }
}
router.use(requireAdmin);

// GET /api/admin/users - list all users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT username, role, name, view_all, blocked, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ ok: true, users: rows.map(u => ({
      ...u,
      viewAll: !!u.view_all,
      blocked: !!u.blocked
    })) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/admin/users - create user (name → auto pinyin username)
router.post('/users', async (req, res) => {
  try {
    const { name, role, viewAll } = req.body;
    if (!name || !name.trim()) return res.json({ ok: false, error: '请输入姓名' });

    const userName = name.trim();
    let baseUsername = nameToPinyin(userName);
    if (!baseUsername) return res.json({ ok: false, error: '无法生成用户名' });

    let username = baseUsername;
    let suffix = 1;
    while (true) {
      const existing = await db.query('SELECT username FROM users WHERE username = $1', [username]);
      if (existing.rows.length === 0) break;
      username = baseUsername + suffix;
      suffix++;
    }

    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    const userRole = role || 'investor';
    const ua = viewAll !== undefined ? (viewAll ? 1 : 0) : 0;

    await db.query(
      'INSERT INTO users (username, password_hash, role, name, view_all) VALUES ($1,$2,$3,$4,$5)',
      [username, hash, userRole, userName, ua]
    );

    res.json({
      ok: true,
      user: { username, name: userName, role: userRole, viewAll: !!ua, blocked: false, initialPassword: DEFAULT_PASSWORD }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/admin/users/:username - update user (password, role, block, name)
router.put('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role, name, viewAll, blocked } = req.body;

    const existing = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length === 0) return res.json({ ok: false, error: '用户不存在' });

    const updates = [];
    const params = [];

    if (password) {
      updates.push('password_hash = $' + (params.length + 1));
      params.push(bcrypt.hashSync(password, 10));
    }
    if (role !== undefined) {
      updates.push('role = $' + (params.length + 1));
      params.push(role);
    }
    if (name !== undefined) {
      updates.push('name = $' + (params.length + 1));
      params.push(name);
    }
    if (viewAll !== undefined) {
      updates.push('view_all = $' + (params.length + 1));
      params.push(viewAll ? 1 : 0);
    }
    if (blocked !== undefined) {
      updates.push('blocked = $' + (params.length + 1));
      params.push(blocked ? 1 : 0);
    }

    if (updates.length === 0) return res.json({ ok: false, error: '没有要更新的字段' });

    params.push(username);
    await db.query(
      'UPDATE users SET ' + updates.join(', ') + ' WHERE username = $' + (params.length),
      params
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/admin/users/:username
router.delete('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (username === 'admin') return res.json({ ok: false, error: '不能删除管理员账号' });

    const existing = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length === 0) return res.json({ ok: false, error: '用户不存在' });

    await db.query('DELETE FROM users WHERE username = $1', [username]);
    res.json({ ok: true, message: `用户 ${username} 已删除` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
