// ── MENU ROUTE ────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/menu — full menu grouped by category
router.get('/', (req, res) => {
  const items = db.get('menu').filter({ available: true }).value();
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  res.json({ menu: grouped, total_items: items.length });
});

// GET /api/menu/all — all items including unavailable (admin)
router.get('/all', verifyToken, (req, res) => {
  const { category } = req.query;
  let items = db.get('menu').value();
  if (category) items = items.filter(i => i.category === category);
  res.json({ items, total: items.length });
});

// GET /api/menu/featured
router.get('/featured', (req, res) => {
  const items = db.get('menu').filter({ available: true, featured: true }).value();
  res.json({ items });
});

// POST /api/menu — add item (admin)
router.post('/', verifyToken, (req, res) => {
  const { name, category, sub, price, label, emoji, featured } = req.body;
  if (!name || !category)
    return res.status(400).json({ error: 'Name and category are required.' });

  const existing = db.get('menu').value();
  const newId    = existing.length > 0 ? Math.max(...existing.map(i => i.id)) + 1 : 1;

  const item = {
    id       : newId,
    name     : name.trim(),
    category,
    sub      : sub || 'veg',
    price    : price ? parseFloat(price) : null,
    label    : label || (price ? `₹${price}` : 'Ask'),
    emoji    : emoji || '🍽️',
    available: true,
    featured : featured === true || featured === 'true'
  };

  db.get('menu').push(item).write();
  res.status(201).json({ success: true, item, message: `"${name}" added to menu!` });
});

// PUT /api/menu/:id — update item (admin)
router.put('/:id', verifyToken, (req, res) => {
  const id   = parseInt(req.params.id);
  const item = db.get('menu').find({ id }).value();
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  db.get('menu').find({ id }).assign(req.body).write();
  res.json({ success: true, message: 'Item updated.' });
});

// PUT /api/menu/:id/toggle — toggle availability (admin)
router.put('/:id/toggle', verifyToken, (req, res) => {
  const id   = parseInt(req.params.id);
  const item = db.get('menu').find({ id }).value();
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  const newVal = !item.available;
  db.get('menu').find({ id }).assign({ available: newVal }).write();
  res.json({
    success     : true,
    is_available: newVal,
    message     : `"${item.name}" is now ${newVal ? 'available ✅' : 'unavailable ❌'}`
  });
});

// DELETE /api/menu/:id — delete item (admin)
router.delete('/:id', verifyToken, (req, res) => {
  const id = parseInt(req.params.id);
  const item = db.get('menu').find({ id }).value();
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  db.get('menu').remove({ id }).write();
  res.json({ success: true, message: 'Item deleted.' });
});

module.exports = router;
