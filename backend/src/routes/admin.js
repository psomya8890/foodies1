const router  = require('express').Router();
const auth    = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const pool    = require('../config/db');

router.use(auth, isAdmin);

const COUPONS = {
  FIRST10: { discount: 10, type: 'percent', desc: '10% off your order' },
  FLAT50:  { discount: 50, type: 'flat',    desc: '₹50 flat off' },
  SAVE20:  { discount: 20, type: 'percent', desc: '20% off' },
};

// ── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  const { search, status } = req.query;
  let query = `
    SELECT o.*, u.name AS user_name, u.email AS user_email
    FROM orders o LEFT JOIN users u ON u.id = o.user_id
  `;
  const params = [];
  if (status && status !== 'all') {
    params.push(status);
    query += ` WHERE o.status = $${params.length}`;
  }
  query += ' ORDER BY o.created_at DESC';

  const { rows: orders } = await pool.query(query, params);

  const result = await Promise.all(orders.map(async o => {
    const { rows: items } = await pool.query(`
      SELECT oi.*, m.name AS item_name, m.image
      FROM order_items oi LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE oi.order_id = $1
    `, [o.id]);
    return { ...o, order_items: items };
  }));

  if (search) {
    const q = search.toLowerCase();
    return res.json(result.filter(o =>
      String(o.id).includes(q) ||
      o.user_name?.toLowerCase().includes(q) ||
      o.contact_name?.toLowerCase().includes(q)
    ));
  }
  res.json(result);
});

router.patch('/orders/:id', async (req, res) => {
  const { status } = req.body;
  const tsMap = {
    confirmed:        'confirmed_at',
    preparing:        'preparing_at',
    out_for_delivery: 'out_for_delivery_at',
    delivered:        'delivered_at',
    cancelled:        'cancelled_at',
  };
  const tsCol = tsMap[status];
  const { rows: [order] } = await pool.query(
    `UPDATE orders SET status=$1 ${tsCol ? `, ${tsCol}=NOW()` : ''} WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
});

// ── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    { rows: [{ count: totalOrders }] },
    { rows: [{ count: todayOrders }] },
    { rows: [{ count: weekOrders }] },
    { rows: [{ count: monthOrders }] },
    { rows: allOrders },
    { rows: topItems },
    { rows: [{ count: customers }] },
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM orders WHERE status != 'cancelled'`),
    pool.query(`SELECT COUNT(*) FROM orders WHERE status != 'cancelled' AND created_at >= $1`, [startOfDay]),
    pool.query(`SELECT COUNT(*) FROM orders WHERE status != 'cancelled' AND created_at >= $1`, [startOfWeek]),
    pool.query(`SELECT COUNT(*) FROM orders WHERE status != 'cancelled' AND created_at >= $1`, [startOfMonth]),
    pool.query(`SELECT total, created_at FROM orders WHERE status != 'cancelled'`),
    pool.query(`
      SELECT oi.menu_item_id, SUM(oi.quantity)::int AS total_qty,
             m.name, m.image, m.price
      FROM order_items oi
      LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      GROUP BY oi.menu_item_id, m.name, m.image, m.price
      ORDER BY total_qty DESC LIMIT 5
    `),
    pool.query(`SELECT COUNT(*) FROM users WHERE role = 'customer'`),
  ]);

  const revenue = {
    today: allOrders.filter(o => new Date(o.created_at) >= startOfDay).reduce((s, o) => s + parseFloat(o.total), 0),
    week:  allOrders.filter(o => new Date(o.created_at) >= startOfWeek).reduce((s, o) => s + parseFloat(o.total), 0),
    month: allOrders.filter(o => new Date(o.created_at) >= startOfMonth).reduce((s, o) => s + parseFloat(o.total), 0),
    total: allOrders.reduce((s, o) => s + parseFloat(o.total), 0),
  };

  const dailyRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfDay); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayOrders = allOrders.filter(o => new Date(o.created_at) >= d && new Date(o.created_at) < next);
    dailyRevenue.push({
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: dayOrders.reduce((s, o) => s + parseFloat(o.total), 0),
      orders: dayOrders.length,
    });
  }

  res.json({
    totalOrders: parseInt(totalOrders), todayOrders: parseInt(todayOrders),
    weekOrders: parseInt(weekOrders), monthOrders: parseInt(monthOrders),
    revenue, topItems, customers: parseInt(customers), dailyRevenue,
  });
});

// ── Menu management ──────────────────────────────────────────────────────────
router.get('/menu', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT m.*, c.name AS category_name
    FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
    ORDER BY m.created_at DESC
  `);
  res.json(rows);
});

router.post('/menu', async (req, res) => {
  try {
    const { name, description, price, image, available, category_id } = req.body;
    const { rows: [item] } = await pool.query(
      `INSERT INTO menu_items (name, description, price, image, available, category_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, price, image, available ?? true, category_id]
    );
    res.status(201).json(item);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/menu/:id', async (req, res) => {
  const { name, description, price, image, available, category_id } = req.body;
  const { rows: [item] } = await pool.query(
    `UPDATE menu_items SET name=$1, description=$2, price=$3, image=$4, available=$5, category_id=$6
     WHERE id=$7 RETURNING *`,
    [name, description, price, image, available, category_id, req.params.id]
  );
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.delete('/menu/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM menu_items WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

// ── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', async (req, res) => {
  const { rows: customers } = await pool.query(
    `SELECT id, name, email, created_at FROM users WHERE role='customer' ORDER BY created_at DESC`
  );
  const result = await Promise.all(customers.map(async c => {
    const { rows: orders } = await pool.query(
      'SELECT id, total, status, created_at FROM orders WHERE user_id=$1', [c.id]
    );
    return { ...c, orders };
  }));
  res.json(result);
});

// ── Coupons ──────────────────────────────────────────────────────────────────
router.post('/coupons/validate', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const coupon = COUPONS[code];
  if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
  res.json({ code, ...coupon });
});

module.exports = router;
