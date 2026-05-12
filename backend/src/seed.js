require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./config/db');

const seed = async () => {
  // Kitchen user
  const hash = await bcrypt.hash('kitchen123', 10);
  await pool.query(`
    INSERT INTO users (name, email, password, role)
    VALUES ('Kitchen Staff', 'kitchen@foodapp.com', $1, 'kitchen')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);
  console.log('Kitchen user: kitchen@foodapp.com / kitchen123');

  // Categories
  const categoryNames = ['Pizza', 'Burger', 'Sandwich', 'Drinks'];
  const catIds = {};
  for (const name of categoryNames) {
    const { rows: [cat] } = await pool.query(
      `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [name]
    );
    catIds[name] = cat.id;
  }

  const items = [
    { name: 'Margherita', description: 'Classic tomato, mozzarella & fresh basil', price: 299, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80', category: 'Pizza' },
    { name: 'Pepperoni Feast', description: 'Loaded with spicy pepperoni & cheese', price: 399, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80', category: 'Pizza' },
    { name: 'BBQ Chicken Pizza', description: 'Smoky BBQ sauce, grilled chicken, onions', price: 449, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', category: 'Pizza' },
    { name: 'Veggie Supreme', description: 'Bell peppers, mushrooms, olives & corn', price: 349, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80', category: 'Pizza' },
    { name: 'Classic Smash Burger', description: 'Double smash patty, cheddar, pickles & sauce', price: 249, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', category: 'Burger' },
    { name: 'Crispy Chicken Burger', description: 'Fried chicken fillet, coleslaw & mayo', price: 229, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&q=80', category: 'Burger' },
    { name: 'Mushroom Swiss Burger', description: 'Beef patty, sautéed mushrooms & Swiss cheese', price: 279, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80', category: 'Burger' },
    { name: 'Veggie Bean Burger', description: 'Spiced black bean patty, avocado & lettuce', price: 199, image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80', category: 'Burger' },
    { name: 'Club Sandwich', description: 'Triple-decker with chicken, bacon & egg', price: 199, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80', category: 'Sandwich' },
    { name: 'Grilled Cheese', description: 'Sourdough, three-cheese blend, butter-toasted', price: 149, image: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80', category: 'Sandwich' },
    { name: 'BLT Sub', description: 'Bacon, lettuce, tomato on a toasted sub roll', price: 179, image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80', category: 'Sandwich' },
    { name: 'Paneer Tikka Sandwich', description: 'Spiced paneer, mint chutney & onions', price: 169, image: 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=400&q=80', category: 'Sandwich' },
    { name: 'Mango Lassi', description: 'Thick, creamy mango yogurt drink', price: 99, image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80', category: 'Drinks' },
    { name: 'Cold Coffee', description: 'Chilled espresso blended with milk & ice cream', price: 129, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80', category: 'Drinks' },
    { name: 'Fresh Lime Soda', description: 'Zesty lime, soda water & a pinch of salt', price: 79, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80', category: 'Drinks' },
    { name: 'Strawberry Milkshake', description: 'Fresh strawberries blended with vanilla ice cream', price: 149, image: 'https://images.unsplash.com/photo-1568901839119-631418a3910d?w=400&q=80', category: 'Drinks' },
  ];

  for (const item of items) {
    await pool.query(
      `INSERT INTO menu_items (name, description, price, image, available, category_id)
       VALUES ($1,$2,$3,$4,true,$5)
       ON CONFLICT (name) DO NOTHING`,
      [item.name, item.description, item.price, item.image, catIds[item.category]]
    );
  }

  console.log('Seeded categories and menu items.');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
