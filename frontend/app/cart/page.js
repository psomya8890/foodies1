'use client';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CartPage() {
  const { cart, removeFromCart, addToCart, total } = useCart();
  const router = useRouter();

  if (cart.length === 0) return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '4rem' }}>🛒</div>
      <h2 style={{ fontWeight: 700 }}>Your cart is empty</h2>
      <p style={{ color: 'var(--text-muted)' }}>Add some delicious items to get started</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Browse Menu</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: '2rem' }}>Your Cart</h1>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1.5rem' }}>
        {cart.map((c, i) => (
          <div key={c.item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <img src={c.item.image} alt={c.item.name} style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{c.item.name}</div>
              <div style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '0.2rem' }}>₹{c.item.price}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => removeFromCart(c.item.id)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{c.quantity}</span>
              <button onClick={() => addToCart(c.item)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <div style={{ fontWeight: 700, minWidth: '70px', textAlign: 'right' }}>₹{(c.item.price * c.quantity).toFixed(0)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
          <span>Subtotal</span><span>₹{total.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
          <span>Delivery</span><span style={{ color: 'var(--success)' }}>Free</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <span>Total</span><span style={{ color: 'var(--primary)' }}>₹{total.toFixed(0)}</span>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1.25rem', fontSize: '1rem' }}
          onClick={() => router.push('/checkout')}>
          Proceed to Checkout →
        </button>
      </div>
    </div>
  );
}
