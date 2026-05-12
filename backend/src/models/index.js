// No ORM — we use raw SQL via pg pool.
// This file is kept so existing require('./models') calls don't break.
// All DB access goes through db.js pool directly in routes.
const pool = require('../config/db');
module.exports = pool;
