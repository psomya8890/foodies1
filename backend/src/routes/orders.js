const router = require('express').Router();
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

const RESTAURANT_LAT = 23.0225;
const RESTAURANT_LNG = 72.5714;

const COUPONS = {
  FIRST10: { discount: 10, type: 'percent' },
  FLAT50:  { discount: 50, type: 'flat' },
  SAVE20:  { discount: 20, type: 'percent' },
};

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function trafficMultiplier() {
  const h = new Date().getHours();
  if ((h>=8&&h<=10)||(h>=12&&h<=14)||(h>=18&&h<=21)) return 1.6;
  if (h>=22||h<=6) return 0.9;
  return 1.2;
}

function calcRiderTime(lat, lng) {
  if (!lat || !lng) return 15;
  const dist = distanceKm(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
  return Math.max(5, Math.round((dist / 25) * 60 * trafficMultiplier()));
}

async function calcPrepTime() {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM orders WHERE status IN ('pending','confirmed','preparing')`
  );
  const activeCount = parseInt(rows[0].count);
  return 10 + Math.max(0, activeCount - 3) * 5;
}

async function getOrderWithItems(orderId) {
  const { rows: [order] } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!order) return null;
  const { rows: items } = await pool.query(`
    SELECT oi.*, m.name AS item_name, m.image, m.description
    FROM order_items oi
    LEFT JOIN menu_items m ON m.id = oi.menu_item_id
    WHERE oi.order_id = $1
  `, [orderId]);
  return { ...order, order_items: items };
}

// Get all orders for logged-in user
router.get('/', auth, async (req, res) => {
  const { rows: orders } = await pool.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  const result = await Promise.all(orders.map(async o => {
    const { rows: items } = await pool.query(`
      SELECT oi.*, m.name AS item_name, m.image
      FROM order_items oi
      LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE oi.order_id = $1
    `, [o.id]);
    return { ...o, order_items: items };
  }));
  res.json(result);
});

// Place order
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, address, contactName, contactPhone, latitude, longitude, couponCode, specialNote } = req.body;

    let total = 0;
    const enriched = await Promise.all(items.map(async i => {
      const { rows } = await client.query('SELECT * FROM menu_items WHERE id = $1', [i.menuItemId]);
      const item = rows[0];
      if (!item) throw new Error(`Item ${i.menuItemId} not found`);
      total += parseFloat(item.price) * i.quantity;
      return { menuItemId: i.menuItemId, quantity: i.quantity, price: item.price, note: i.note || '' };
    }));

    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = COUPONS[couponCode.toUpperCase()];
      if (coupon) {
        discount = coupon.type === 'percent' ? (total * coupon.discount / 100) : coupon.discount;
        discount = Math.min(discount, total);
        appliedCoupon = couponCode.toUpperCase();
      }
    }

    const finalTotal = Math.max(0, total - discount);
    const prepTime   = await calcPrepTime();
    const riderTime  = calcRiderTime(latitude, longitude);

    await client.query('BEGIN');
    const { rows: [order] } = await client.query(`
      INSERT INTO orders
        (user_id, total, address, contact_name, contact_phone, latitude, longitude,
         prep_time, rider_time, coupon_code, discount, special_note, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
      RETURNING *
    `, [req.user.id, finalTotal, address, contactName, contactPhone, latitude, longitude,
        prepTime, riderTime, appliedCoupon, discount, specialNote]);

    for (const e of enriched) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price, special_instructions)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, e.menuItemId, e.quantity, e.price, e.note]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: e.message });
  } finally {
    client.release();
  }
});

// Track order
router.get('/:id', auth, async (req, res) => {
  const { rows: [order] } = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  const { rows: items } = await pool.query(`
    SELECT oi.*, m.name AS item_name, m.image
    FROM order_items oi LEFT JOIN menu_items m ON m.id = oi.menu_item_id
    WHERE oi.order_id = $1
  `, [order.id]);
  res.json({ ...order, order_items: items });
});

// Cancel order
router.patch('/:id/cancel', auth, async (req, res) => {
  const { rows: [order] } = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  if (!['pending', 'confirmed'].includes(order.status))
    return res.status(400).json({ message: 'Cannot cancel order at this stage' });
  const { rows: [updated] } = await pool.query(
    `UPDATE orders SET status='cancelled', cancelled_at=NOW() WHERE id=$1 RETURNING *`,
    [order.id]
  );
  res.json(updated);
});

// Rate & review
router.patch('/:id/review', auth, async (req, res) => {
  const { rows: [order] } = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!order) return res.status(404).json({ message: 'Not found' });
  if (order.status !== 'delivered') return res.status(400).json({ message: 'Can only review delivered orders' });
  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
  const { rows: [updated] } = await pool.query(
    'UPDATE orders SET rating=$1, review=$2 WHERE id=$3 RETURNING *',
    [rating, review, order.id]
  );
  res.json(updated);
});

// Reorder
router.post('/:id/reorder', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: [prev] } = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!prev) return res.status(404).json({ message: 'Not found' });

    const { rows: prevItems } = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1', [prev.id]
    );

    let total = 0;
    const valid = [];
    for (const oi of prevItems) {
      const { rows } = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND available = true', [oi.menu_item_id]
      );
      if (!rows[0]) continue;
      total += parseFloat(rows[0].price) * oi.quantity;
      valid.push({ menuItemId: oi.menu_item_id, quantity: oi.quantity, price: rows[0].price });
    }
    if (!valid.length) return res.status(400).json({ message: 'No available items to reorder' });

    const prepTime  = await calcPrepTime();
    const riderTime = calcRiderTime(prev.latitude, prev.longitude);

    await client.query('BEGIN');
    const { rows: [order] } = await client.query(`
      INSERT INTO orders
        (user_id, total, address, contact_name, contact_phone, latitude, longitude, prep_time, rider_time, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *
    `, [req.user.id, total, prev.address, prev.contact_name, prev.contact_phone,
        prev.latitude, prev.longitude, prepTime, riderTime]);

    for (const e of valid) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [order.id, e.menuItemId, e.quantity, e.price]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
