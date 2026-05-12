const router = require('express').Router();
const pool   = require('../config/db');

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT m.*, c.name AS category_name
    FROM menu_items m
    LEFT JOIN categories c ON c.id = m.category_id
    WHERE m.available = true
    ORDER BY c.name, m.name
  `);
  res.json(rows);
});

router.get('/categories', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

module.exports = router;
