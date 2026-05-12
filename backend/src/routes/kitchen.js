const router    = require('express').Router();
const auth      = require('../middleware/auth');
const isKitchen = require('../middleware/isKitchen');
const pool      = require('../config/db');

router.use(auth, isKitchen);

async function getOrdersWithItems(where, params) {
  const { rows: orders } = await pool.query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email
     FROM orders o LEFT JOIN users u ON u.id = o.user_id
     ${where} ORDER BY o.created_at DESC`,
    params
  );
  return Promise.all(orders.map(async o => {
    const { rows: items } = await pool.query(`
      SELECT oi.*, m.name AS item_name, m.image
      FROM order_items oi LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE oi.order_id = $1
    `, [o.id]);
    return { ...o, order_items: items };
  }));
}

// All orders for kitchen
router.get('/orders', async (req, res) => {
  const { filter } = req.query;
  const activeStatuses = ['pending','confirmed','preparing','out_for_delivery'];
  const allStatuses    = [...activeStatuses, 'delivered', 'rejected'];
  const statuses = filter === 'all' ? allStatuses : activeStatuses;
  const placeholders = statuses.map((_, i) => `$${i+1}`).join(',');
  const result = await getOrdersWithItems(`WHERE o.status IN (${placeholders})`, statuses);
  res.json(result);
});

// New orders since timestamp
router.get('/orders/new', async (req, res) => {
  const { since } = req.query;
  const statuses = ['pending','confirmed','preparing','out_for_delivery'];
  const placeholders = statuses.map((_, i) => `$${i+1}`).join(',');
  let where = `WHERE o.status IN (${placeholders})`;
  const params = [...statuses];
  if (since) {
    params.push(new Date(since));
    where += ` AND o.created_at > $${params.length}`;
  }
  const result = await getOrdersWithItems(where, params);
  res.json(result);
});

// Extend prep time
router.patch('/orders/:id/extend', async (req, res) => {
  const by = parseInt(req.body.by) || 5;
  const { rows: [order] } = await pool.query(
    'UPDATE orders SET prep_time = prep_time + $1 WHERE id=$2 RETURNING *',
    [by, req.params.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
});

// Accept order
router.patch('/orders/:id/accept', async (req, res) => {
  const { rows: [order] } = await pool.query(
    `UPDATE orders SET status='confirmed', confirmed_at=NOW() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
});

// Reject order
router.patch('/orders/:id/reject', async (req, res) => {
  const reason = req.body.reason || 'Rejected by kitchen';
  const { rows: [order] } = await pool.query(
    `UPDATE orders SET status='rejected', rejection_reason=$1 WHERE id=$2 RETURNING *`,
    [reason, req.params.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
});

// Update status
router.patch('/orders/:id', async (req, res) => {
  const { status } = req.body;
  const tsMap = {
    confirmed:        'confirmed_at',
    preparing:        'preparing_at',
    out_for_delivery: 'out_for_delivery_at',
    delivered:        'delivered_at',
  };
  const tsCol = tsMap[status];
  const { rows: [order] } = await pool.query(
    `UPDATE orders SET status=$1 ${tsCol ? `, ${tsCol}=NOW()` : ''} WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
});

module.exports = router;
