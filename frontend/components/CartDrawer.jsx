'use client';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, total } = useCart();
  const router = useRouter();

  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        width: '340px', height: '100vh',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 201,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 700 }}>🛒 Your Cart</h2>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
              <p>Your cart is empty</p>
            </div>
          ) : cart.map(c => (
            <div key={c.item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <img src={c.item.image} alt={c.item.name} style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.item.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>×{c.quantity} — ₹{(c.item.price * c.quantity).toFixed(0)}</div>
              </div>
              <button onClick={() => removeFromCart(c.item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', padding: '4px' }}>🗑</button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
              <span>Total</span><span style={{ color: 'var(--primary)' }}>₹{total.toFixed(0)}</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}
              onClick={() => { onClose(); router.push('/checkout'); }}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
