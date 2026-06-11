const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Routes
const authRoutes = require('./routes/auth');
const invRoutes = require('./routes/investments');

app.use('/api/auth', authRoutes);
app.use('/api/investments', invRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
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
