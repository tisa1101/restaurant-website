// ── ADMIN ROUTE ───────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/database');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  const admin = db.get('admins').find({ username: username.trim() }).value();

  if (!admin || !bcrypt.compareSync(password, admin.password_hash))
    return res.status(401).json({ error: 'Wrong username or password.' });

  // Update last login
  db.get('admins').find({ username }).assign({ last_login: new Date().toISOString() }).write();

  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    process.env.JWT_SECRET || 'yummyyumhot_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    success : true,
    token,
    admin   : { id: admin.id, username: admin.username, role: admin.role },
    message : `Welcome, ${admin.username}! 🔥`
  });
});

// GET /api/admin/me
router.get('/me', verifyToken, (req, res) => {
  const admin = db.get('admins').find({ id: req.admin.id }).value();
  if (!admin) return res.status(404).json({ error: 'Not found.' });
  res.json({ id: admin.id, username: admin.username, role: admin.role, last_login: admin.last_login });
});

// PUT /api/admin/password
router.put('/password', verifyToken, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const admin = db.get('admins').find({ id: req.admin.id }).value();
  if (!bcrypt.compareSync(current_password, admin.password_hash))
    return res.status(401).json({ error: 'Current password is wrong.' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.get('admins').find({ id: req.admin.id }).assign({ password_hash: hash }).write();
  res.json({ success: true, message: 'Password updated!' });
});

// POST /api/admin/logout
router.post('/logout', verifyToken, (req, res) => {
  res.json({ success: true, message: 'Logged out. Delete your token on the client.' });
});

module.exports = router;
