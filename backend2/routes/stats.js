// ── STATS ROUTE ───────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/stats/dashboard
router.get('/dashboard', verifyToken, (req, res) => {
  const allOrders = db.get('orders').value();
  const today     = new Date().toISOString().slice(0, 10);

  const todayOrders = allOrders.filter(o => o.created_at.slice(0, 10) === today);
  const weekAgo     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekOrders  = allOrders.filter(o => o.created_at.slice(0, 10) >= weekAgo && o.status !== 'cancelled');
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthOrders = allOrders.filter(o => o.created_at.slice(0, 7) === monthPrefix && o.status !== 'cancelled');

  const sum  = arr => arr.reduce((s, o) => s + (o.total_amount || 0), 0);
  const byStatus = status => todayOrders.filter(o => o.status === status).length;

  const recent = [...allOrders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  const menuStats = db.get('menu').value();

  res.json({
    today: {
      total_orders: todayOrders.length,
      total_revenue: sum(todayOrders.filter(o => o.status !== 'cancelled')),
      pending  : byStatus('pending'),
      confirmed: byStatus('confirmed'),
      preparing: byStatus('preparing'),
      ready    : byStatus('ready'),
      delivered: byStatus('delivered'),
      cancelled: byStatus('cancelled')
    },
    week : { orders: weekOrders.length,  revenue: sum(weekOrders)  },
    month: { orders: monthOrders.length, revenue: sum(monthOrders) },
    recent_orders: recent,
    menu: {
      total    : menuStats.length,
      available: menuStats.filter(i => i.available).length,
      featured : menuStats.filter(i => i.featured).length
    }
  });
});

// GET /api/stats/top-items
router.get('/top-items', verifyToken, (req, res) => {
  const allOrders = db.get('orders')
    .filter(o => ['delivered','ready','confirmed'].includes(o.status)).value();

  const counts = {};
  allOrders.forEach(order => {
    order.items.forEach(item => {
      counts[item.name] = (counts[item.name] || 0) + item.quantity;
    });
  });

  const top = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({ top_items: top });
});

// GET /api/stats/revenue — last 7 days
router.get('/revenue', verifyToken, (req, res) => {
  const allOrders = db.get('orders').filter(o => o.status !== 'cancelled').value();
  const days = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days[d] = { date: d, orders: 0, revenue: 0 };
  }

  allOrders.forEach(o => {
    const d = o.created_at.slice(0, 10);
    if (days[d]) {
      days[d].orders++;
      days[d].revenue += o.total_amount || 0;
    }
  });

  res.json({ data: Object.values(days) });
});

// GET /api/stats/today
router.get('/today', verifyToken, (req, res) => {
  const today  = new Date().toISOString().slice(0, 10);
  const orders = db.get('orders').filter(o => o.created_at.slice(0, 10) === today).value();
  const revenue= orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0);
  res.json({ date: today, count: orders.length, revenue, orders });
});

module.exports = router;
