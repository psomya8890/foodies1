'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

const STATUS_META = {
  pending:          { label: 'Order Placed',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '📋' },
  confirmed:        { label: 'Confirmed',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '✅' },
  preparing:        { label: 'Preparing',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: '👨‍🍳' },
  out_for_delivery: { label: 'On the Way',    color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: '🛵' },
  delivered:        { label: 'Delivered',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: '🎉' },
  cancelled:        { label: 'Cancelled',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '❌' },
  rejected:         { label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🚫' },
};

const STEPS = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={() => onChange(s)}
          style={{ fontSize: '1.4rem', cursor: 'pointer', color: s <= value ? '#fbbf24' : 'var(--border)', transition: 'color 0.15s' }}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [reviewModal, setReviewModal] = useState(null); // order
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const router = useRouter();

  const fetchOrders = () => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    api.get('/orders').then(r => { setOrders(r.data); setLoading(false); }).catch(() => router.push('/login'));
  };

  useEffect(() => { fetchOrders(); }, []);

  const cancelOrder = async (id) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await api.patch(`/orders/${id}/cancel`);
      fetchOrders();
    } catch (err) { alert(err.response?.data?.message || 'Cannot cancel'); }
  };

  const reorder = async (id) => {
    try {
      const { data } = await api.post(`/orders/${id}/reorder`);
      router.push(`/orders/${data.id}`);
    } catch (err) { alert(err.response?.data?.message || 'Reorder failed'); }
  };

  const submitReview = async () => {
    setReviewLoading(true);
    try {
      await api.patch(`/orders/${reviewModal.id}/review`, reviewForm);
      setReviewModal(null);
      fetchOrders();
    } catch (err) { alert(err.response?.data?.message || 'Review failed'); }
    setReviewLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>⏳</div>Loading your orders...</div>
    </div>
  );

  if (orders.length === 0) return (
    <div style={{ minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
      <div style={{ fontSize:'4rem' }}>🍽️</div>
      <h2 style={{ fontWeight:700 }}>No orders yet</h2>
      <p style={{ color:'var(--text-muted)' }}>Looks like you haven't ordered anything yet.</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop:'0.5rem' }}>Browse Menu</Link>
    </div>
  );

  return (
    <div style={{ maxWidth:'780px', margin:'2.5rem auto', padding:'0 1.5rem' }}>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontWeight:800, fontSize:'1.8rem' }}>My Orders</h1>
        <p style={{ color:'var(--text-muted)', marginTop:'0.3rem' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
        {orders.map(order => {
          const meta = STATUS_META[order.status] || STATUS_META.pending;
          const step = STEPS.indexOf(order.status);
          const isOpen = expanded === order.id;
          const canCancel = ['pending','confirmed'].includes(order.status);
          const canReview = order.status === 'delivered' && !order.rating;

          return (
            <div key={order.id} style={{ background:'var(--surface)', border:`1px solid ${isOpen?'rgba(255,107,53,0.4)':'var(--border)'}`, borderRadius:'var(--radius)', overflow:'hidden', transition:'border-color 0.2s' }}>
              {/* Header */}
              <div onClick={() => setExpanded(isOpen ? null : order.id)}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', cursor:'pointer', userSelect:'none' }}>
                <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'10px', background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem' }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontWeight:700 }}>Order #{order.id}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginTop:'0.15rem' }}>
                      {new Date(order.created_at || order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                  <span style={{ fontWeight:800, color:'var(--primary)', fontSize:'1rem' }}>₹{order.total}</span>
                  <span style={{ background:meta.bg, color:meta.color, padding:'0.3rem 0.8rem', borderRadius:'20px', fontSize:'0.78rem', fontWeight:600, whiteSpace:'nowrap' }}>{meta.label}</span>
                  <span style={{ color:'var(--text-muted)', fontSize:'1rem', transition:'transform 0.2s', transform:isOpen?'rotate(180deg)':'rotate(0deg)' }}>▾</span>
                </div>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ borderTop:'1px solid var(--border)', padding:'1.25rem' }}>
                  {/* Progress */}
                  {!['cancelled','rejected'].includes(order.status) && (
                    <div style={{ marginBottom:'1.5rem', display:'flex', justifyContent:'space-between' }}>
                      {STEPS.map((s, i) => {
                        const m = STATUS_META[s];
                        return (
                          <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.3rem', flex:1, position:'relative' }}>
                            {i < STEPS.length - 1 && <div style={{ position:'absolute', top:'14px', left:'50%', width:'100%', height:'2px', background:i<step?'var(--primary)':'var(--border)', zIndex:0 }} />}
                            <div style={{ width:'28px', height:'28px', borderRadius:'50%', zIndex:1, background:i<=step?'var(--primary)':'var(--surface2)', border:`2px solid ${i<=step?'var(--primary)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', boxShadow:i===step?'0 0 0 3px rgba(255,107,53,0.25)':'none' }}>
                              {m.icon}
                            </div>
                            <span style={{ fontSize:'0.65rem', color:i<=step?'var(--text)':'var(--text-muted)', textAlign:'center', fontWeight:i===step?700:400 }}>{m.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Rejection reason */}
                  {order.status === 'rejected' && (order.rejection_reason || order.rejectionReason) && (
                    <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color:'#f87171', fontSize:'0.85rem' }}>
                      🚫 Rejected: {order.rejection_reason || order.rejectionReason}
                    </div>
                  )}

                  {/* Items */}
                  <div style={{ background:'var(--surface2)', borderRadius:'10px', overflow:'hidden', marginBottom:'1rem' }}>
                    {order.order_items?.map((oi, i) => (
                      <div key={oi.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 1rem', borderBottom:i<order.order_items.length-1?'1px solid var(--border)':'none' }}>
                        {oi.image && <img src={oi.image} alt={oi.item_name} style={{ width:'40px', height:'40px', borderRadius:'8px', objectFit:'cover' }} />}
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{oi.item_name}</div>
                          <div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>×{oi.quantity} @ ₹{oi.price} each</div>
                        </div>
                        <div style={{ fontWeight:700, fontSize:'0.9rem' }}>₹{(oi.price * oi.quantity).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon / discount */}
                  {order.discount > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem', color:'#22c55e', marginBottom:'0.5rem' }}>
                      <span>🎟 Coupon ({order.coupon_code || order.couponCode})</span><span>-₹{parseFloat(order.discount).toFixed(0)}</span>
                    </div>
                  )}

                  {/* Special note */}
                  {(order.special_note || order.specialNote) && (
                    <div style={{ background:'rgba(255,107,53,0.08)', borderRadius:'8px', padding:'0.6rem 0.85rem', marginBottom:'1rem', fontSize:'0.82rem', color:'var(--text-muted)' }}>
                      📝 {order.special_note || order.specialNote}
                    </div>
                  )}

                  {/* Rating display */}
                  {order.rating && (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem', fontSize:'0.85rem' }}>
                      <span style={{ color:'var(--text-muted)' }}>Your rating:</span>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ color:s<=order.rating?'#fbbf24':'var(--border)' }}>★</span>)}
                      {order.review && <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>"{order.review}"</span>}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem' }}>
                    <div style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>📍 {order.address?.slice(0,50)}{order.address?.length>50?'…':''}</div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {canCancel && (
                        <button onClick={() => cancelOrder(order.id)} className="btn btn-outline"
                          style={{ padding:'0.4rem 0.85rem', fontSize:'0.82rem', color:'#f87171', borderColor:'rgba(239,68,68,0.4)' }}>
                          ✕ Cancel
                        </button>
                      )}
                      {canReview && (
                        <button onClick={() => { setReviewModal(order); setReviewForm({ rating:5, review:'' }); }} className="btn btn-outline"
                          style={{ padding:'0.4rem 0.85rem', fontSize:'0.82rem', color:'#fbbf24', borderColor:'rgba(251,191,36,0.4)' }}>
                          ★ Rate
                        </button>
                      )}
                      {['delivered','cancelled','rejected'].includes(order.status) && (
                        <button onClick={() => reorder(order.id)} className="btn btn-outline"
                          style={{ padding:'0.4rem 0.85rem', fontSize:'0.82rem' }}>
                          🔄 Reorder
                        </button>
                      )}
                      {!['cancelled','rejected','delivered'].includes(order.status) && (
                        <Link href={`/orders/${order.id}`} className="btn btn-outline" style={{ padding:'0.4rem 0.85rem', fontSize:'0.82rem' }}>
                          Track →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review modal */}
      {reviewModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:'420px' }}>
            <h3 style={{ fontWeight:800, marginBottom:'0.5rem' }}>Rate your order</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'1.5rem' }}>Order #{reviewModal.id}</p>
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ display:'block', marginBottom:'0.5rem', fontSize:'0.82rem', color:'var(--text-muted)' }}>Rating</label>
              <StarRating value={reviewForm.rating} onChange={r => setReviewForm(f => ({ ...f, rating:r }))} />
            </div>
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ display:'block', marginBottom:'0.5rem', fontSize:'0.82rem', color:'var(--text-muted)' }}>Review (optional)</label>
              <textarea rows={3} placeholder="How was your experience?" value={reviewForm.review}
                onChange={e => setReviewForm(f => ({ ...f, review:e.target.value }))}
                style={{ resize:'none' }} />
            </div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submitReview} disabled={reviewLoading}>
                {reviewLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
