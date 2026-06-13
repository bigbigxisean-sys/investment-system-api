const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const invRoutes = require('./routes/investments');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/investments', invRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Debug: check DB status and reseed if needed
app.post('/api/debug/reseed', async (req, res) => {
  try {
    const { db, initDb } = require('./db');
    // Re-initialize (recreates tables + seeds)
    await initDb();
    res.json({ ok: true, message: 'Database re-initialized and users seeded' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Debug: check DB status
app.get('/api/debug/status', async (req, res) => {
  try {
    const { db } = require('./db');
    const mode = db.mode || 'unknown';
    let userCount = 0, invCount = 0, retCount = 0;
    try {
      const { rows: u } = await db.query('SELECT COUNT(*) as cnt FROM users');
      userCount = u[0].cnt;
    } catch(e) { /* table not exist */ }
    try {
      const { rows: i } = await db.query('SELECT COUNT(*) as cnt FROM investments');
      invCount = i[0].cnt;
    } catch(e) { /* table not exist */ }
    res.json({ ok: true, mode, dbUrl: !!process.env.DATABASE_URL, userCount: Number(userCount), invCount: Number(invCount) });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: '服务器内部错误' });
});

// Init DB then start
const { initDb } = require('./db');
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Investment System API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});
