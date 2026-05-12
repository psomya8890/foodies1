'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STATUS_META = {
  pending:          { label: 'New Order',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '🆕', dot: '#f59e0b' },
  confirmed:        { label: 'Confirmed',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '✅', dot: '#3b82f6' },
  preparing:        { label: 'Preparing',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  icon: '👨‍🍳', dot: '#8b5cf6' },
  out_for_delivery: { label: 'Out Delivery', color: '#f97316', bg: 'rgba(249,115,22,0.15)',  icon: '🛵', dot: '#f97316' },
  delivered:        { label: 'Delivered',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   icon: '✅', dot: '#22c55e' },
};
const TS_FIELDS = {
  confirmed: 'confirmed_at', preparing: 'preparing_at',
  out_for_delivery: 'out_for_delivery_at', delivered: 'delivered_at',
};

function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880,0],[1100,0.18],[880,0.36],[1100,0.54]].forEach(([f,s]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f;
      g.gain.setValueAtTime(0.35, ctx.currentTime + s);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + 0.25);
      o.start(ctx.currentTime + s); o.stop(ctx.currentTime + s + 0.25);
    });
  } catch (_) {}
}

function ElapsedTimer({ from, urgent = 600 }) {
  const [secs, setSecs] = useState(Math.floor((Date.now() - new Date(from)) / 1000));
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - new Date(from)) / 1000)), 1000);
    return () => clearInterval(t);
  }, [from]);
  const m = Math.floor(secs / 60), s = secs % 60;
  const hot = secs >= urgent;
  return (
    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: hot ? '#ef4444' : '#22c55e', background: hot ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', padding: '0.15rem 0.5rem', borderRadius: '20px', animation: hot ? 'kpulse 1s infinite' : 'none' }}>
      ⏱ {m}m {String(s).padStart(2,'0')}s
    </span>
  );
}

function TimelineRow({ icon, label, ts, done, active }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.25rem 0' }}>
      <div style={{ width:'24px', height:'24px', borderRadius:'50%', flexShrink:0, background: done?'var(--primary)':active?'rgba(255,107,53,0.2)':'#1e1e3a', border:`2px solid ${done||active?'var(--primary)':'#2e2e50'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem' }}>
        {done ? '✓' : icon}
      </div>
      <span style={{ flex:1, fontSize:'0.8rem', fontWeight: active||done?600:400, color: active||done?'#f0f0f5':'#8888aa' }}>{label}</span>
      <span style={{ fontSize:'0.72rem', color:'#8888aa' }}>{ts ? new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—'}</span>
    </div>
  );
}

function MapModal({ order, onClose }) {
  const mapRef = useRef(null);
  useEffect(() => {
    if (!order.latitude || !order.longitude) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    import('leaflet').then(L => {
      if (!mapRef.current) return;
      mapRef.current.innerHTML = '';
      const map = L.map(mapRef.current).setView([order.latitude, order.longitude], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
      // Customer marker
      const custIcon = L.divIcon({ html: '<div style="font-size:2rem">📍</div>', className:'', iconAnchor:[16,32] });
      L.marker([order.latitude, order.longitude], { icon: custIcon })
        .addTo(map).bindPopup(`<b>${order.contact_name || order.contactName || order.user_name}</b><br>${order.address}`).openPopup();
      // Restaurant marker (Ahmedabad default)
      const restLat = 23.0225, restLng = 72.5714;
      const restIcon = L.divIcon({ html: '<div style="font-size:2rem">🏪</div>', className:'', iconAnchor:[16,32] });
      L.marker([restLat, restLng], { icon: restIcon }).addTo(map).bindPopup('Restaurant');
      // Draw line
      L.polyline([[restLat, restLng],[order.latitude, order.longitude]], { color:'#ff6b35', weight:3, dashArray:'8,6' }).addTo(map);
      // Fit bounds
      map.fitBounds([[restLat, restLng],[order.latitude, order.longitude]], { padding:[40,40] });
    });
  }, [order]);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={onClose}>
      <div style={{ background:'#1a1a2e', borderRadius:'16px', overflow:'hidden', width:'100%', maxWidth:'600px', border:'1px solid #2e2e50' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #2e2e50' }}>
          <div>
            <div style={{ fontWeight:700 }}>📍 Delivery Location — Order #{order.id}</div>
            <div style={{ fontSize:'0.8rem', color:'#8888aa', marginTop:'0.2rem' }}>{order.contact_name || order.contactName} · {order.contact_phone || order.contactPhone}</div>
          </div>
          <button onClick={onClose} style={{ background:'#252540', border:'none', color:'#f0f0f5', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'1rem' }}>✕</button>
        </div>
        <div ref={mapRef} style={{ height:'340px', width:'100%' }} />
        <div style={{ padding:'0.85rem 1.25rem', borderTop:'1px solid #2e2e50', fontSize:'0.82rem', color:'#8888aa' }}>
          📍 {order.address}
          {(order.rider_time || order.riderTime) && <span style={{ marginLeft:'1rem', color:'#fb923c' }}>🛵 ~{order.rider_time || order.riderTime}m rider time</span>}
        </div>
      </div>
    </div>
  );
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [newAlert, setNewAlert] = useState(null);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [mapOrder, setMapOrder] = useState(null);
  const lastIdsRef = useRef(new Set());
  const router = useRouter();

  const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('kitchen_token')}` });

  const fetchOrders = async (silent = false) => {
    try {
      const { data } = await axios.get(`${BASE}/kitchen/orders`, { headers: hdrs() });
      const incoming = data.filter(o => !lastIdsRef.current.has(o.id) && o.status === 'pending');
      if (incoming.length > 0 && lastIdsRef.current.size > 0) {
        setNewAlert(incoming[0]); playAlert();
        setTimeout(() => setNewAlert(null), 6000);
      }
      lastIdsRef.current = new Set(data.map(o => o.id));
      setOrders(data);
      if (!silent) setLoading(false);
    } catch { router.push('/kitchen/login'); }
  };

  useEffect(() => {
    const stored = localStorage.getItem('kitchen_user');
    if (!stored) { router.push('/kitchen/login'); return; }
    setUser(JSON.parse(stored));
    fetchOrders();
    const iv = setInterval(() => fetchOrders(true), 8000);
    return () => clearInterval(iv);
  }, []);

  const updateStatus = async (id, status) => {
    await axios.patch(`${BASE}/kitchen/orders/${id}`, { status }, { headers: hdrs() });
    fetchOrders(true);
  };
  const extendPrep = async (id) => {
    await axios.patch(`${BASE}/kitchen/orders/${id}/extend`, { by: 5 }, { headers: hdrs() });
    fetchOrders(true);
  };
  const logout = () => { localStorage.removeItem('kitchen_token'); localStorage.removeItem('kitchen_user'); router.push('/kitchen/login'); };

  const activeOrders    = orders.filter(o => o.status !== 'delivered');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const displayed = filter === 'active' ? activeOrders : filter === 'delivered' ? deliveredOrders : orders;

  const stats = {
    new:      orders.filter(o => o.status === 'pending').length,
    cooking:  orders.filter(o => o.status === 'preparing').length,
    delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    done:     deliveredOrders.length,
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0f0f1a', fontFamily:'Inter,sans-serif', color:'#f0f0f5' }}>
      <style>{`
        @keyframes slideDown{from{transform:translateY(-80px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes flashBorder{0%,100%{border-color:rgba(255,107,53,0.4)}50%{border-color:#ff6b35;box-shadow:0 0 20px rgba(255,107,53,0.25)}}
        @keyframes kpulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes dot{0%,100%{opacity:1}50%{opacity:0.3}}
        * { box-sizing: border-box; }
        input, select, textarea { font-family: Inter, sans-serif; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background:'#1a1a2e', borderBottom:'1px solid #2e2e50', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#ff6b35,#ffd700)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>👨‍🍳</div>
          <div>
            <div style={{ fontWeight:800, fontSize:'1rem', lineHeight:1.2 }}>Kitchen Portal</div>
            <div style={{ fontSize:'0.72rem', color:'#8888aa', display:'flex', alignItems:'center', gap:'0.35rem' }}>
              {user?.name}
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#22c55e', display:'inline-block', animation:'dot 2s infinite' }} />
              Live · 8s refresh
            </div>
          </div>
        </div>
        <button onClick={logout} style={{ background:'#252540', border:'1px solid #2e2e50', color:'#f0f0f5', padding:'0.4rem 1rem', borderRadius:'8px', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>
          Logout
        </button>
      </div>

      {/* ── New order alert ── */}
      {newAlert && (
        <div style={{ position:'fixed', top:'64px', left:'50%', transform:'translateX(-50%)', zIndex:200, animation:'slideDown 0.4s ease', background:'linear-gradient(135deg,#ff6b35,#e85520)', color:'#fff', borderRadius:'12px', padding:'0.9rem 2rem', boxShadow:'0 8px 32px rgba(255,107,53,0.5)', display:'flex', alignItems:'center', gap:'1rem', minWidth:'300px', justifyContent:'center' }}>
          <span style={{ fontSize:'1.6rem', animation:'kpulse 0.5s infinite' }}>🚨</span>
          <div><div style={{ fontWeight:800 }}>New Order #{newAlert.id}!</div><div style={{ fontSize:'0.82rem', opacity:0.9 }}>{newAlert.User?.name} · ₹{newAlert.total}</div></div>
          <span style={{ fontSize:'1.6rem', animation:'kpulse 0.5s infinite' }}>🚨</span>
        </div>
      )}

      {mapOrder && <MapModal order={mapOrder} onClose={() => setMapOrder(null)} />}

      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'1.25rem 1.5rem' }}>

        {/* ── Stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.85rem', marginBottom:'1.25rem' }}>
          {[
            { label:'New Orders',   value:stats.new,      color:'#f59e0b', icon:'🆕', bg:'rgba(245,158,11,0.1)' },
            { label:'Cooking',      value:stats.cooking,  color:'#8b5cf6', icon:'🍳', bg:'rgba(139,92,246,0.1)' },
            { label:'Out Delivery', value:stats.delivery, color:'#f97316', icon:'🛵', bg:'rgba(249,115,22,0.1)' },
            { label:'Delivered',    value:stats.done,     color:'#22c55e', icon:'✅', bg:'rgba(34,197,94,0.1)' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.color}33`, borderRadius:'12px', padding:'1rem 1.1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ fontSize:'1.6rem' }}>{s.icon}</div>
              <div><div style={{ fontWeight:800, fontSize:'1.5rem', color:s.color, lineHeight:1 }}>{s.value}</div><div style={{ color:'#8888aa', fontSize:'0.75rem', marginTop:'0.15rem' }}>{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.1rem', flexWrap:'wrap', alignItems:'center' }}>
          {[['active',`Active (${activeOrders.length})`],['delivered',`Delivered (${deliveredOrders.length})`],['all',`All (${orders.length})`]].map(([val,label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding:'0.45rem 1.1rem', borderRadius:'50px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', background:filter===val?'#ff6b35':'#1a1a2e', color:filter===val?'#fff':'#8888aa', border:`1px solid ${filter===val?'#ff6b35':'#2e2e50'}`, transition:'all 0.2s' }}>
              {label}
            </button>
          ))}
          {activeOrders.length > 3 && (
            <div style={{ marginLeft:'auto', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'20px', padding:'0.3rem 0.85rem', fontSize:'0.78rem', color:'#f87171', fontWeight:600, animation:'kpulse 1.5s infinite' }}>
              🔥 Kitchen busy — prep times extended
            </div>
          )}
        </div>

        {/* ── Orders ── */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'4rem', color:'#8888aa' }}><div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>⏳</div>Loading orders...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'4rem', color:'#8888aa' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🍽️</div>
            <div style={{ fontWeight:600 }}>{filter === 'delivered' ? 'No delivered orders yet' : 'No active orders right now'}</div>
            <div style={{ fontSize:'0.82rem', marginTop:'0.4rem' }}>New orders appear automatically</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'1rem' }}>
            {displayed.map(order => {
              const meta = STATUS_META[order.status] || STATUS_META.pending;
              const isNew = order.status === 'pending';
              const isDone = order.status === 'delivered';
              const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
              const isExp = expanded === order.id;
              const step = STATUS_FLOW.indexOf(order.status);

              return (
                <div key={order.id} style={{ background:'#1a1a2e', border:`1px solid ${isNew?'rgba(255,107,53,0.5)':isDone?'rgba(34,197,94,0.3)':'#2e2e50'}`, borderRadius:'14px', overflow:'hidden', animation:isNew?'flashBorder 2s ease-in-out infinite':'none', opacity:isDone?0.85:1 }}>

                  {/* Card header */}
                  <div style={{ background:meta.bg, padding:'0.8rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                      <span style={{ fontSize:'1.2rem' }}>{meta.icon}</span>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'0.92rem' }}>Order #{order.id}</div>
                        <div style={{ fontSize:'0.7rem', color:'#8888aa' }}>{new Date(order.created_at || order.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.25rem' }}>
                      <span style={{ background:meta.bg, color:meta.color, border:`1px solid ${meta.color}55`, padding:'0.18rem 0.6rem', borderRadius:'20px', fontSize:'0.7rem', fontWeight:700 }}>{meta.label}</span>
                      {!isDone && <ElapsedTimer from={order.created_at || order.createdAt} urgent={1200} />}
                      {isDone && (order.delivered_at || order.deliveredAt) && (
                        <span style={{ fontSize:'0.7rem', color:'#22c55e', fontWeight:600 }}>
                          ✓ {Math.floor((new Date(order.delivered_at || order.deliveredAt)-new Date(order.created_at || order.createdAt))/60000)}m total
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer row */}
                  <div style={{ padding:'0.7rem 1rem', borderBottom:'1px solid #2e2e50', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'0.88rem' }}>👤 {order.contact_name || order.contactName || order.user_name}</div>
                      {(order.contact_phone || order.contactPhone) && <div style={{ color:'#8888aa', fontSize:'0.75rem' }}>📞 {order.contact_phone || order.contactPhone}</div>}
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                      <span style={{ fontWeight:800, color:'#ff6b35', fontSize:'0.95rem' }}>₹{order.total}</span>
                      {order.latitude && (
                        <button onClick={() => setMapOrder(order)}
                          style={{ background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.4)', color:'#60a5fa', padding:'0.25rem 0.6rem', borderRadius:'8px', cursor:'pointer', fontSize:'0.75rem', fontWeight:600 }}>
                          🗺 Map
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ padding:'0.5rem 1rem', borderBottom:'1px solid #2e2e50', fontSize:'0.75rem', color:'#8888aa' }}>
                    📍 {order.address?.slice(0,60)}{order.address?.length>60?'…':''}
                  </div>

                  {/* Items */}
                  <div style={{ padding:'0.6rem 1rem', borderBottom:'1px solid #2e2e50' }}>
                    {(order.order_items || order.OrderItems)?.map(oi => (
                      <div key={oi.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', padding:'0.15rem 0' }}>
                        <span>{oi.item_name || oi.MenuItem?.name}</span>
                        <span style={{ color:'#8888aa' }}>×{oi.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Prep + rider time */}
                  <div style={{ padding:'0.55rem 1rem', borderBottom:'1px solid #2e2e50', display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:'0.72rem', background:'rgba(139,92,246,0.15)', color:'#a78bfa', padding:'0.18rem 0.55rem', borderRadius:'20px', fontWeight:600 }}>👨‍🍳 Prep {order.prep_time || order.prepTime || 10}m</span>
                    <span style={{ fontSize:'0.72rem', background:'rgba(249,115,22,0.15)', color:'#fb923c', padding:'0.18rem 0.55rem', borderRadius:'20px', fontWeight:600 }}>🛵 Rider ~{order.rider_time || order.riderTime || 15}m</span>
                    <span style={{ fontSize:'0.72rem', background:'rgba(255,107,53,0.12)', color:'#ff6b35', padding:'0.18rem 0.55rem', borderRadius:'20px', fontWeight:700 }}>⏱ ~{(order.prep_time || order.prepTime || 10)+(order.rider_time || order.riderTime || 15)}m total</span>
                    {!isDone && order.status !== 'out_for_delivery' && (
                      <button onClick={() => extendPrep(order.id)}
                        style={{ marginLeft:'auto', fontSize:'0.7rem', background:'rgba(245,158,11,0.12)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.35)', borderRadius:'20px', padding:'0.18rem 0.6rem', cursor:'pointer', fontWeight:600 }}>
                        +5m ⏰
                      </button>
                    )}
                  </div>

                  {/* Timeline toggle */}
                  <div onClick={() => setExpanded(isExp?null:order.id)}
                    style={{ padding:'0.5rem 1rem', borderBottom:'1px solid #2e2e50', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.75rem', color:'#8888aa' }}>
                    <span>📋 Timeline</span>
                    <span style={{ transition:'transform 0.2s', transform:isExp?'rotate(180deg)':'rotate(0)' }}>▾</span>
                  </div>

                  {isExp && (
                    <div style={{ padding:'0.75rem 1rem', borderBottom:'1px solid #2e2e50', background:'#141428' }}>
                      <TimelineRow icon="📋" label="Order Placed"     ts={order.created_at || order.createdAt}                done={true}  active={false} />
                      <TimelineRow icon="✅" label="Confirmed"        ts={order.confirmed_at || order.confirmedAt}            done={!!(order.confirmed_at || order.confirmedAt)}      active={order.status==='confirmed'} />
                      <TimelineRow icon="👨‍🍳" label="Preparing"       ts={order.preparing_at || order.preparingAt}            done={!!(order.preparing_at || order.preparingAt)}      active={order.status==='preparing'} />
                      <TimelineRow icon="🛵" label="Out for Delivery" ts={order.out_for_delivery_at || order.outForDeliveryAt} done={!!(order.out_for_delivery_at || order.outForDeliveryAt)} active={order.status==='out_for_delivery'} />
                      <TimelineRow icon="🎉" label="Delivered"        ts={order.delivered_at || order.deliveredAt}            done={!!(order.delivered_at || order.deliveredAt)}      active={order.status==='delivered'} />
                      {isDone && (order.delivered_at || order.deliveredAt) && (
                        <div style={{ marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid #2e2e50', display:'flex', justifyContent:'space-between', fontSize:'0.75rem' }}>
                          <span style={{ color:'#8888aa' }}>Total time</span>
                          <span style={{ fontWeight:700, color:'#22c55e' }}>{Math.floor((new Date(order.delivered_at || order.deliveredAt)-new Date(order.created_at || order.createdAt))/60000)} min</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isDone && (
                    <div style={{ padding:'0.75rem 1rem', display:'flex', gap:'0.5rem' }}>
                      {nextStatus && (
                        <button onClick={() => updateStatus(order.id, nextStatus)}
                          style={{ flex:1, padding:'0.55rem', fontSize:'0.82rem', fontWeight:700, background:'#ff6b35', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>
                          → {STATUS_META[nextStatus]?.icon} {STATUS_META[nextStatus]?.label}
                        </button>
                      )}
                      <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                        style={{ padding:'0.5rem 0.55rem', fontSize:'0.78rem', borderRadius:'8px', background:'#252540', border:'1px solid #2e2e50', color:'#f0f0f5', cursor:'pointer' }}>
                        {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_META[s].icon} {STATUS_META[s].label}</option>)}
                      </select>
                    </div>
                  )}

                  {isDone && (
                    <div style={{ padding:'0.75rem 1rem', textAlign:'center', color:'#22c55e', fontWeight:700, fontSize:'0.85rem' }}>
                      ✓ Order Completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
