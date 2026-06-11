const db = require('../db');

const router = require('express').Router();

// Middleware: require auth
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, error: '请先登录' });

  const session = db.prepare(`
    SELECT s.username, u.role, u.name, u.viewAll
    FROM sessions s JOIN users u ON s.username = u.username
    WHERE s.token = ?
  `).get(token);

  if (!session) return res.status(401).json({ ok: false, error: '登录已过期' });
  req.auth = session;
  next();
}

// ── Investments ──

// GET /api/investments
router.get('/', requireAuth, (req, res) => {
  let rows;
  if (req.auth.role === 'investor' && !req.auth.viewAll) {
    rows = db.prepare('SELECT * FROM investments WHERE investorName = ? ORDER BY id DESC')
      .all(req.auth.name);
  } else {
    rows = db.prepare('SELECT * FROM investments ORDER BY id DESC').all();
  }
  res.json({ ok: true, data: rows });
});

// POST /api/investments
router.post('/', requireAuth, (req, res) => {
  if (req.auth.role !== 'broker') {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  const { investorName, investmentDate, maturityDate, amount, rate, reinvestType, commission, notes } = req.body;
  if (!investorName || !investmentDate || !maturityDate || !amount) {
    return res.json({ ok: false, error: '参数不完整' });
  }
  const result = db.prepare(`
    INSERT INTO investments (investorName, investmentDate, maturityDate, amount, rate, reinvestType, commission, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(investorName, investmentDate, maturityDate, amount, rate || 12, reinvestType || 'none', commission || 5, notes || '');

  res.json({ ok: true, id: result.lastInsertRowid });
});

// PUT /api/investments/:id
router.put('/:id', requireAuth, (req, res) => {
  if (req.auth.role !== 'broker') {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  const { investorName, investmentDate, maturityDate, amount, rate, notes, commission } = req.body;
  db.prepare(`
    UPDATE investments SET investorName=?, investmentDate=?, maturityDate=?, amount=?, rate=?, notes=?, commission=?
    WHERE id=?
  `).run(investorName, investmentDate, maturityDate, amount, rate, notes || '', commission || 5, req.params.id);

  res.json({ ok: true });
});

// DELETE /api/investments/:id
router.delete('/:id', requireAuth, (req, res) => {
  if (req.auth.role !== 'broker') {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  db.prepare('DELETE FROM returns WHERE investId = ?').run(req.params.id);
  db.prepare('DELETE FROM investments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/investments/:id/redeem
router.patch('/:id/redeem', requireAuth, (req, res) => {
  if (req.auth.role !== 'broker') {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  const { status, redeemedDate } = req.body;
  db.prepare('UPDATE investments SET status=?, redeemedDate=? WHERE id=?')
    .run(status || 'redeemed', redeemedDate || '', req.params.id);
  res.json({ ok: true });
});

// ── Returns ──

// GET /api/returns
router.get('/returns/list', requireAuth, (req, res) => {
  let rows;
  if (req.auth.role === 'investor' && !req.auth.viewAll) {
    rows = db.prepare(`
      SELECT r.* FROM returns r
      JOIN investments i ON r.investId = i.id
      WHERE i.investorName = ?
      ORDER BY r.date DESC
    `).all(req.auth.name);
  } else {
    rows = db.prepare('SELECT * FROM returns ORDER BY date DESC').all();
  }
  res.json({ ok: true, data: rows });
});

// POST /api/returns
router.post('/returns/add', requireAuth, (req, res) => {
  if (req.auth.role !== 'broker') {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  const { investId, date, type, amount, note } = req.body;
  if (!investId || !date || !type || !amount) {
    return res.json({ ok: false, error: '参数不完整' });
  }
  db.prepare('INSERT INTO returns (investId, date, type, amount, note) VALUES (?, ?, ?, ?, ?)')
    .run(investId, date, type, amount, note || '');
  res.json({ ok: true });
});

module.exports = router;
