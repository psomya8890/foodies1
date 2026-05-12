'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCart } from '@/context/CartContext';

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [coords, setCoords] = useState(null);
  const [mapSearch, setMapSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const router = useRouter();

  const discount = couponData
    ? couponData.type === 'percent' ? (total * couponData.discount / 100) : couponData.discount
    : 0;
  const finalTotal = Math.max(0, total - discount);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  // Load Leaflet dynamically (no SSR issues)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    import('leaflet').then(L => {
      if (leafletMap.current || !mapRef.current) return;
      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const icon = L.divIcon({
        html: '<div style="font-size:2rem;line-height:1">📍</div>',
        className: '', iconAnchor: [16, 32],
      });

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        placeMarker(L, map, icon, lat, lng);
        await reverseGeocode(lat, lng);
      });

      leafletMap.current = { map, L, icon };
    });
  }, []);

  const placeMarker = (L, map, icon, lat, lng) => {
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    setCoords({ lat, lng });
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data.display_name) setForm(f => ({ ...f, address: data.display_name }));
    } catch (_) {}
  };

  const searchAddress = async () => {
    if (!mapSearch.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(mapSearch)}&format=json&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (_) {}
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const { L, map, icon } = leafletMap.current;
    placeMarker(L, map, icon, lat, lng);
    map.setView([lat, lng], 15);
    setForm(f => ({ ...f, address: result.display_name }));
    setSearchResults([]);
    setMapSearch('');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const { L, map, icon } = leafletMap.current;
      placeMarker(L, map, icon, lat, lng);
      map.setView([lat, lng], 15);
      await reverseGeocode(lat, lng);
      setLocating(false);
    }, () => setLocating(false));
  };

  const placeOrder = async () => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    if (!form.name.trim()) return setError('Please enter your name');
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) return setError('Enter a valid 10-digit mobile number');
    if (!form.address.trim()) return setError('Please enter or pick a delivery address');
    setLoading(true);
    try {
      const items = cart.map(c => ({ menuItemId: c.item.id, quantity: c.quantity }));
      const { data } = await api.post('/orders', {
        items, address: form.address, contactName: form.name, contactPhone: form.phone,
        latitude: coords?.lat || null, longitude: coords?.lng || null,
        couponCode: couponData?.code || null, specialNote,
      });
      clearCart();
      router.push(`/orders/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order.');
      setLoading(false);
    }
  };

  const applyCoupon = async () => {
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', { code: coupon });
      setCouponData(data);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon');
      setCouponData(null);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: '2rem' }}>Checkout</h1>

      {!isLoggedIn && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '10px', padding: '0.9rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>⚠️ You need to be logged in to place an order</span>
          <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => router.push('/login')}>Login</button>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem' }}>

        {/* Left — order summary + contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Order summary */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Summary</h3>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {cart.map((c, i) => (
                <div key={c.item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.88rem' }}>
                  <span>{c.item.name} <span style={{ color: 'var(--text-muted)' }}>×{c.quantity}</span></span>
                  <span style={{ fontWeight: 600 }}>₹{(c.item.price * c.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.9rem 1rem', fontWeight: 800, borderTop: '2px solid var(--border)', color: 'var(--primary)' }}>
                <span>Total</span><span>₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coupon Code</h3>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="FIRST10 / FLAT50 / SAVE20" value={coupon}
                  onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponData(null); setCouponError(''); }}
                  style={{ flex: 1, fontSize: '0.88rem' }} />
                <button className="btn btn-outline" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }} onClick={applyCoupon}>Apply</button>
              </div>
              {couponError && <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{couponError}</div>}
              {couponData && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#22c55e', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>✓ {couponData.desc}</span>
                  <span style={{ fontWeight: 700 }}>-₹{discount.toFixed(0)}</span>
                </div>
              )}
              {couponData && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', paddingTop: '0.25rem' }}>
                  <span>Final Total</span><span>₹{finalTotal.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Special note */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Special Instructions</h3>
            <textarea rows={2} placeholder="e.g. Extra spicy, no onions, ring doorbell..."
              value={specialNote} onChange={e => setSpecialNote(e.target.value)}
              style={{ resize: 'none', fontSize: '0.85rem' }} />
          </div>

          {/* Contact details */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Details</h3>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Full Name</label>
                <input type="text" placeholder="John Doe" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Mobile Number</label>
                <input type="tel" placeholder="10-digit number" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Delivery Address</label>
                <textarea rows={3} placeholder="Auto-filled when you pick on map, or type manually"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  style={{ resize: 'none', fontSize: '0.85rem' }} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
            onClick={placeOrder} disabled={loading || cart.length === 0}>
            {loading ? 'Placing Order...' : '🛵 Place Order'}
          </button>
        </div>

        {/* Right — map */}
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pick Delivery Location</h3>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

            {/* Search bar */}
            <div style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <input type="text" placeholder="Search location..." value={mapSearch}
                onChange={e => setMapSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchAddress()}
                style={{ flex: 1, fontSize: '0.88rem' }} />
              <button className="btn btn-outline" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }} onClick={searchAddress}>Search</button>
              <button className="btn btn-outline" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }} onClick={useMyLocation} disabled={locating}>
                {locating ? '...' : '📍 Me'}
              </button>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: '0.85rem', right: '0.85rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => selectSearchResult(r)}
                      style={{ padding: '0.65rem 0.9rem', fontSize: '0.82rem', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      📍 {r.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Map container */}
            <div ref={mapRef} style={{ height: '380px', width: '100%' }} />

            <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              Click anywhere on the map to set delivery location · Address auto-fills
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
