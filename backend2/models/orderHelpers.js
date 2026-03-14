// Generates unique order number like YYH-20260314-4821
const generateOrderNumber = () => {
  const now    = new Date();
  const date   = now.toISOString().slice(0,10).replace(/-/g,'');
  const rand   = Math.floor(Math.random() * 9000 + 1000);
  return `YYH-${date}-${rand}`;
};

// Builds the WhatsApp message sent to the restaurant owner
const buildWhatsAppMessage = (order) => {
  const items = order.items.map(i =>
    `${i.emoji || '•'} ${i.name} x${i.quantity}  →  ${i.price > 0 ? '₹' + (i.price * i.quantity) : 'Ask price'}`
  ).join('\n');

  const total = order.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);

  return [
    `🔥 NEW ORDER — Yummy Yum Hot`,
    `─────────────────────`,
    `📋 Order #: ${order.order_number}`,
    `👤 Name   : ${order.customer_name}`,
    `📞 Phone  : ${order.customer_phone}`,
    `🍽️  Type   : ${order.order_type === 'pickup' ? 'Pickup' : 'Dine-in'}`,
    `─────────────────────`,
    `🛒 ITEMS:`,
    items,
    `─────────────────────`,
    `💰 Total  : ₹${total}`,
    order.notes ? `📝 Notes  : ${order.notes}` : '',
    `─────────────────────`,
    `⏰ Time   : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
  ].filter(Boolean).join('\n');
};

module.exports = { generateOrderNumber, buildWhatsAppMessage };
