'use client';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

export default function MenuCard({ item }) {
  const { addToCart, cart } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = cart.find(c => c.item.id === item.id);

  const handleAdd = () => {
    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,107,53,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
        <img
          src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        />
        {inCart && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'var(--success)', color: '#fff',
            borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
          }}>
            ×{inCart.quantity} in cart
          </div>
        )}
      </div>

      <div style={{ padding: '1rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '0.3rem', fontSize: '1rem' }}>{item.name}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.5 }}>{item.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>₹{item.price}</span>
          <button
            onClick={handleAdd}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 1rem', fontSize: '0.85rem',
              background: added ? 'var(--success)' : 'var(--primary)',
              transition: 'background 0.3s',
            }}
          >
            {added ? '✓ Added' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
