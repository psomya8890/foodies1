'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import MenuCard from '@/components/MenuCard';

const CATEGORY_ICONS = { Pizza: '🍕', Burger: '🍔', Sandwich: '🥪', Drinks: '🥤' };

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/menu'), api.get('/menu/categories')]).then(([m, c]) => {
      setItems(m.data);
      setCategories(c.data);
      setLoading(false);
    });
  }, []);

  const filtered = items
    .filter(i => !activeCategory || (i.category_id || i.CategoryId) === activeCategory)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <main>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '5rem 2rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            🔥 HOT & FRESH
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem' }}>
            Cravings Delivered<br />
            <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Right to Your Door
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
            Pizzas, burgers, sandwiches & more — order in minutes.
          </p>
          {/* Search */}
          <div style={{ maxWidth: '420px', margin: '0 auto', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Search for food..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.8rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '1rem', borderRadius: '50px' }}
            />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCategory(null)}
            className="btn"
            style={{
              padding: '0.55rem 1.2rem',
              background: !activeCategory ? 'var(--primary)' : 'var(--surface)',
              color: !activeCategory ? '#fff' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: !activeCategory ? 'var(--primary)' : 'var(--border)',
              borderRadius: '50px',
            }}
          >
            🍽️ All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className="btn"
              style={{
                padding: '0.55rem 1.2rem',
                background: activeCategory === c.id ? 'var(--primary)' : 'var(--surface)',
                color: activeCategory === c.id ? '#fff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: activeCategory === c.id ? 'var(--primary)' : 'var(--border)',
                borderRadius: '50px',
              }}
            >
              {CATEGORY_ICONS[c.name] || '🍴'} {c.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            Loading menu...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😕</div>
            No items found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(item => <MenuCard key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </main>
  );
}
