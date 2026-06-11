const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

async function getAuthUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const { rows } = await pool.query(
    'SELECT s.username, u.role, u.name, u."viewAll" FROM sessions s JOIN users u ON s.username = u.username WHERE s.token = $1',
    [token]
  );
  return rows.length ? rows[0] : null;
}

// GET /api/investments
router.get('/', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });
    let rows;
    if (user.role === 'investor' && !user.viewAll) {
      ({ rows } = await pool.query('SELECT * FROM investments WHERE "investorName" = $1 ORDER BY id DESC', [user.name]));
    } else {
      ({ rows } = await pool.query('SELECT * FROM investments ORDER BY id DESC'));
    }
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/investments
router.post('/', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });
    if (user.role !== 'broker') return res.status(403).json({ ok: false, error: '无权限' });
    const d = req.body;
    if (!d.investorName || !d.investmentDate || !d.maturityDate || !d.amount) {
      return res.json({ ok: false, error: '参数不完整' });
    }
    const { rows } = await pool.query(
      `INSERT INTO investments ("investorName", "investmentDate", "maturityDate", amount, rate, "reinvestType", commission, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [d.investorName, d.investmentDate, d.maturityDate, d.amount, d.rate || 12, d.reinvestType || 'none', d.commission || 5, d.notes || '']
    );
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PUT /api/investments/:id
router.put('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'broker') return res.status(403).json({ ok: false, error: '无权限' });
    const d = req.body;
    await pool.query(
      `UPDATE investments SET "investorName"=$1, "investmentDate"=$2, "maturityDate"=$3, amount=$4, rate=$5, notes=$6, commission=$7 WHERE id=$8`,
      [d.investorName, d.investmentDate, d.maturityDate, d.amount, d.rate || 12, d.notes || '', d.commission || 5, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/investments/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'broker') return res.status(403).json({ ok: false, error: '无权限' });
    await pool.query('DELETE FROM returns WHERE "investId" = $1', [req.params.id]);
    await pool.query('DELETE FROM investments WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/investments/:id/redeem
router.patch('/:id/redeem', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'broker') return res.status(403).json({ ok: false, error: '无权限' });
    await pool.query('UPDATE investments SET status=$1, "redeemedDate"=$2 WHERE id=$3',
      [req.body.status || 'redeemed', req.body.redeemedDate || '', req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/investments/returns/list
router.get('/returns/list', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });
    let rows;
    if (user.role === 'investor' && !user.viewAll) {
      ({ rows } = await pool.query(
        'SELECT r.* FROM returns r JOIN investments i ON r."investId" = i.id WHERE i."investorName" = $1 ORDER BY r.date DESC',
        [user.name]
      ));
    } else {
      ({ rows } = await pool.query('SELECT * FROM returns ORDER BY date DESC'));
    }
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/investments/returns/add
router.post('/returns/add', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'broker') return res.status(403).json({ ok: false, error: '无权限' });
    const d = req.body;
    if (!d.investId || !d.date || !d.type || d.amount == null) {
      return res.json({ ok: false, error: '参数不完整' });
    }
    await pool.query('INSERT INTO returns ("investId", date, type, amount, note) VALUES ($1,$2,$3,$4,$5)',
      [d.investId, d.date, d.type, d.amount, d.note || '']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
