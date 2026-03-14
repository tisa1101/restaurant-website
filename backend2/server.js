// ============================================================
//  YUMMY YUM HOT — Main Server
//  Uses only pure-JS packages — works on Windows with no errors
// ============================================================

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
require('dotenv').config();

// Init DB first
require('./config/database');

const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const menuRoutes  = require('./routes/menu');
const statsRoutes = require('./routes/stats');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ── RATE LIMITING ────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Try again later.' }
}));

// ── ROUTES ───────────────────────────────────────────────────
app.use('/api/orders', orderRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/menu',   menuRoutes);
app.use('/api/stats',  statsRoutes);

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status    : 'OK ✅',
    restaurant: 'Yummy Yum Hot',
    location  : 'Ghatikia Food Court, Bhubaneswar',
    time      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  });
});

// ── SERVE FRONTEND ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log('\n🔥 ================================');
  console.log('🔥  YUMMY YUM HOT SERVER STARTED');
  console.log('🔥 ================================');
  console.log(`✅  URL     : http://localhost:${PORT}`);
  console.log(`✅  Admin   : http://localhost:${PORT}/admin.html`);
  console.log(`✅  Health  : http://localhost:${PORT}/api/health`);
  console.log(`📲  WA Num  : ${process.env.OWNER_WA_NUMBER}`);
  console.log('🔥 ================================\n');
});

module.exports = app;
