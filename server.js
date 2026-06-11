const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow GitHub Pages + dev origins
const ALLOWED_ORIGINS = [
  'https://bigbigxisean-sys.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://192.168.0.102:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, server-to-server, WeChat mini program)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Lazily allow all for now; tighten in production
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Routes
const authRoutes = require('./routes/auth');
const invRoutes = require('./routes/investments');

app.use('/api/auth', authRoutes);
app.use('/api/investments', invRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Investment System API running on port ${PORT}`);
});
