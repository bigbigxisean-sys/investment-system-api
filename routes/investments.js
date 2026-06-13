const { Router } = require('express');
const { db } = require('../db');
const jwt = require('jsonwebtoken');

const router = Router();
const JWT_SECRET=process.env.JWT_SECRET || 'investment-system-jwt-secret';

function getAuthUser(req) {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return null;
  try { return jwt.verify(auth, JWT_SECRET); }
  catch { return null; }
}

// Helper: map DB snake_case to frontend camelCase
function toCamel(inv) {
  return {
    id: inv.id,
    investorName: inv.investor_name,
    investmentDate: inv.investment_date,
    maturityDate: inv.maturity_date,
    amount: inv.amount,
    rate: inv.rate,
    reinvestType: inv.reinvest_type,
    commission: inv.commission,
    status: inv.status,
    redeemedDate: inv.redeemed_date,
    notes: inv.notes,
    createdAt: inv.created_at
  };
}
function retCamel(r) {
  return {
    id: r.id,
    investId: r.invest_id,
    date: r.date,
    type: r.type,
    amount: r.amount,
    note: r.note,
    createdAt: r.created_at
  };
}

// GET /api/investments — returns BOTH investments and returns
router.get('/', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });

    let { rows } = await db.query('SELECT * FROM investments ORDER BY id DESC');
    const investments = rows.map(toCamel);

    let invIds = investments.map(i => i.id);
    let returns = [];
    if (invIds.length > 0) {
      // Get all returns
      let retRows;
      if (db.mode === 'postgres') {
        const placeholders = invIds.map((_, i) => `$${i + 1}`).join(',');
        ({ rows: retRows } = await db.query(`SELECT * FROM returns_tbl WHERE invest_id IN (${placeholders}) ORDER BY id DESC`, invIds));
      } else {
        const placeholders = invIds.map(() => '?').join(',');
        ({ rows: retRows } = await db.query(`SELECT * FROM returns_tbl WHERE invest_id IN (${placeholders}) ORDER BY id DESC`, invIds));
      }
      returns = retRows.map(retCamel);
    }
    res.json({ ok: true, investments, returns });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/investments
router.post('/', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });
    if (user.role !== 'broker' && user.role !== 'admin') return res.status(403).json({ ok: false, error: '无权限' });
    const d = req.body;
    if (!d.investorName || !d.investmentDate || !d.maturityDate || !d.amount) {
      return res.json({ ok: false, error: '参数不完整' });
    }
    const { rows } = await db.query(
      `INSERT INTO investments (investor_name, investment_date, maturity_date, amount, rate, reinvest_type, commission, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [d.investorName.trim(), d.investmentDate, d.maturityDate, d.amount,
       d.rate || 12, d.reinvestType || 'none', d.commission || 0, d.notes || '', d.status || 'active']
    );
    const { rows: created } = await db.query('SELECT * FROM investments WHERE id = $1', [rows[0].id]);
    res.json({ ok: true, investment: toCamel(created[0]) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PUT /api/investments/:id
router.put('/:id', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });
    if (user.role !== 'broker' && user.role !== 'admin') return res.status(403).json({ ok: false, error: '无权限' });
    const d = req.body;
    const id = req.params.id;

    // First get existing
    const { rows: existing } = await db.query('SELECT * FROM investments WHERE id = $1', [id]);
    if (existing.length === 0) return res.json({ ok: false, error: '记录不存在' });

    await db.query(
      `UPDATE investments SET investor_name=$1, investment_date=$2, maturity_date=$3, amount=$4, rate=$5, reinvest_type=$6, commission=$7, notes=$8 WHERE id=$9`,
      [d.investorName || existing[0].investor_name,
       d.investmentDate || existing[0].investment_date,
       d.maturityDate || existing[0].maturity_date,
       d.amount || existing[0].amount,
       d.rate || existing[0].rate,
       d.reinvestType !== undefined ? d.reinvestType : existing[0].reinvest_type,
       d.commission !== undefined ? d.commission : existing[0].commission,
       d.notes !== undefined ? d.notes : existing[0].notes,
       id]
    );
    const { rows: updated } = await db.query('SELECT * FROM investments WHERE id = $1', [id]);
    res.json({ ok: true, investment: toCamel(updated[0]) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/investments/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'broker' && user.role !== 'admin')) return res.status(403).json({ ok: false, error: '无权限' });
    const id = req.params.id;
    await db.query('DELETE FROM returns_tbl WHERE invest_id = $1', [id]);
    await db.query('DELETE FROM investments WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/investments/:id/redeem
router.patch('/:id/redeem', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'broker' && user.role !== 'admin')) return res.status(403).json({ ok: false, error: '无权限' });
    const id = req.params.id;
    await db.query('UPDATE investments SET status=$1, redeemed_date=$2 WHERE id=$3',
      [req.body.status || 'redeemed', req.body.redeemedDate || '', id]);
    const { rows } = await db.query('SELECT * FROM investments WHERE id = $1', [id]);
    res.json({ ok: true, investment: toCamel(rows[0]) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/investments/returns/list
router.get('/returns/list', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: '请先登录' });
    let rows;
    if (db.mode === 'postgres') {
      ({ rows } = await db.query(
        'SELECT r.*, i.investor_name FROM returns_tbl r JOIN investments i ON r.invest_id = i.id ORDER BY r.date DESC'));
    } else {
      ({ rows } = await db.query(
        'SELECT r.*, i.investor_name FROM returns_tbl r JOIN investments i ON r.invest_id = i.id ORDER BY r.date DESC'));
    }
    res.json({ ok: true, returns: rows.map(r => ({ ...retCamel(r), investorName: r.investor_name })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/investments/returns/add
router.post('/returns/add', async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'broker' && user.role !== 'admin')) return res.status(403).json({ ok: false, error: '无权限' });
    const d = req.body;
    if (!d.investId || !d.date || !d.type || d.amount == null) return res.json({ ok: false, error: '参数不完整' });
    const { rows } = await db.query(
      'INSERT INTO returns_tbl (invest_id, date, type, amount, note) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [d.investId, d.date, d.type, d.amount, d.note || '']);
    const { rows: created } = await db.query('SELECT * FROM returns_tbl WHERE id = $1', [rows[0].id]);
    res.json({ ok: true, return: retCamel(created[0]) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
