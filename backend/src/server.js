require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./config/db');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: ' + origin));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/menu',    require('./routes/menu'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/kitchen', require('./routes/kitchen'));

const COUPONS = {
  FIRST10: { discount: 10, type: 'percent', desc: '10% off your order' },
  FLAT50:  { discount: 50, type: 'flat',    desc: '₹50 flat off' },
  SAVE20:  { discount: 20, type: 'percent', desc: '20% off' },
};

app.post('/api/coupons/validate', require('./middleware/auth'), (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const coupon = COUPONS[code];
  if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
  res.json({ code, ...coupon });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
