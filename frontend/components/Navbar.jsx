'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { cart } = useCart();
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(15,15,26,0.95)' : 'transparent',
      backdropFilter: 'blur(12px)',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      padding: '0.9rem 2rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      transition: 'all 0.3s',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.3rem' }}>
        <span style={{ fontSize: '1.6rem' }}>🍔</span>
        <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          FoodApp
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Link href="/cart" className="btn btn-outline" style={{ position: 'relative', padding: '0.55rem 1.1rem' }}>
          🛒 Cart
          {itemCount > 0 && (
            <span style={{
              position: 'absolute', top: '-8px', right: '-8px',
              background: 'var(--primary)', color: '#fff',
              borderRadius: '50%', width: '20px', height: '20px',
              fontSize: '0.7rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{itemCount}</span>
          )}
        </Link>

        {user ? (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hi, {user.name.split(' ')[0]}</span>
            <Link href="/orders" className="btn btn-outline" style={{ padding: '0.55rem 1.1rem' }}>📦 My Orders</Link>
            {user.role === 'admin' && (
              <Link href="/admin" className="btn btn-outline" style={{ padding: '0.55rem 1.1rem' }}>⚙️ Admin</Link>
            )}
            <button onClick={logout} className="btn btn-outline" style={{ padding: '0.55rem 1.1rem' }}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-outline" style={{ padding: '0.55rem 1.1rem' }}>Login</Link>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.55rem 1.1rem' }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
