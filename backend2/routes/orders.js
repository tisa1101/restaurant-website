// ── ORDERS ROUTE ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { generateOrderNumber, buildWhatsAppMessage } = require('../models/orderHelpers');
require('dotenv').config();

// POST /api/orders — Place new order
router.post('/', (req, res) => {
  try {
    const { customer_name, customer_phone, items, order_type, notes } = req.body;

    // Validate
    if (!customer_name || customer_name.trim().length < 2)
      return res.status(400).json({ error: 'Please enter your name.' });

    if (!customer_phone || !/^[6-9]\d{9}$/.test(customer_phone.trim()))
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Please add at least one item.' });

    // Validate each item against menu
    const menu = db.get('menu').value();
    const validatedItems = [];
    let total = 0;

    for (const item of items) {
      const menuItem = menu.find(m => m.id === item.menu_item_id && m.available);
      if (!menuItem) return res.status(400).json({ error: `"${item.name}" is not available.` });

      const qty = parseInt(item.quantity) || 1;
      const price = menuItem.price || 0;
      validatedItems.push({
        menu_item_id : menuItem.id,
        name         : menuItem.name,
        price,
        label        : menuItem.label,
        quantity     : qty,
        subtotal     : price * qty,
        emoji        : menuItem.emoji
      });
      total += price * qty;
    }

    // Save order
    const order = {
      id           : Date.now(),
      order_number : generateOrderNumber(),
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      items        : validatedItems,
      total_amount : total,
      status       : 'pending',
      order_type   : order_type || 'pickup',
      notes        : notes || '',
      created_at   : new Date().toISOString()
    };

    db.get('orders').push(order).write();

    // Update stats
    db.update('stats', s => ({
      ...s,
      total_orders : (s.total_orders || 0) + 1,
      total_revenue: (s.total_revenue || 0) + total
    })).write();

    // Build WA link
    const waMsg  = buildWhatsAppMessage(order);
    const waLink = `https://wa.me/${process.env.OWNER_WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

    res.status(201).json({
      success       : true,
      order_number  : order.order_number,
      order_id      : order.id,
      total_amount  : total,
      whatsapp_link : waLink,
      message       : `Order #${order.order_number} placed successfully!`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

// GET /api/orders — All orders (admin)
router.get('/', verifyToken, (req, res) => {
  const { status, date } = req.query;
  let orders = db.get('orders').value();

  if (status && status !== 'all')
    orders = orders.filter(o => o.status === status);

  if (date === 'today') {
    const today = new Date().toISOString().slice(0, 10);
    orders = orders.filter(o => o.created_at.slice(0, 10) === today);
  }

  orders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ orders, total: orders.length });
});

// GET /api/orders/:id — Single order
router.get('/:id', (req, res) => {
  const order = db.get('orders').find(
    o => String(o.id) === req.params.id || o.order_number === req.params.id
  ).value();

  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
});

// PUT /api/orders/:id/status — Update status (admin)
router.put('/:id/status', verifyToken, (req, res) => {
  const allowed = ['pending','confirmed','preparing','ready','delivered','cancelled'];
  const { status } = req.body;

  if (!allowed.includes(status))
    return res.status(400).json({ error: `Invalid status. Use: ${allowed.join(', ')}` });

  const order = db.get('orders').find(o => String(o.id) === req.params.id);
  if (!order.value()) return res.status(404).json({ error: 'Order not found.' });

  order.assign({ status, updated_at: new Date().toISOString() }).write();
  res.json({ success: true, message: `Order updated to "${status}"` });
});

// DELETE /api/orders/:id — Delete order (admin)
router.delete('/:id', verifyToken, (req, res) => {
  const exists = db.get('orders').find(o => String(o.id) === req.params.id).value();
  if (!exists) return res.status(404).json({ error: 'Order not found.' });

  db.get('orders').remove(o => String(o.id) === req.params.id).write();
  res.json({ success: true, message: 'Order deleted.' });
});

module.exports = router;
