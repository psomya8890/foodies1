'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

const STEPS = [
  { key: 'pending',          label: 'Order Placed',     icon: '📋', desc: 'Your order has been received' },
  { key: 'confirmed',        label: 'Confirmed',        icon: '✅', desc: 'Restaurant confirmed your order' },
  { key: 'preparing',        label: 'Being Prepared',   icon: '👨‍🍳', desc: 'Chef is cooking your food' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵', desc: 'Rider is on the way to you' },
  { key: 'delivered',        label: 'Delivered',        icon: '🎉', desc: 'Enjoy your meal!' },
];

// ── Two-phase ETA Timer ─────────────────────────────────────────────────────
// Phase 1 (pending/confirmed/preparing) → counts down prepTime from order placed
// Phase 2 (out_for_delivery)            → counts down riderTime from when rider left
function ETATimer({ order }) {
  const [remaining, setRemaining] = useState(null);
  const phase = order.status === 'out_for_delivery' ? 'rider' : 'prep';

  useEffect(() => {
    if (order.status === 'delivered') { setRemaining(0); return; }

    const prep  = order.prep_time  || order.prepTime  || 10;
    const rider = order.rider_time || order.riderTime || 15;

    let deadline;
    if (phase === 'rider') {
      const riderStart = new Date(order.out_for_delivery_at || order.outForDeliveryAt || order.created_at || order.createdAt).getTime();
      deadline = riderStart + rider * 60 * 1000;
    } else {
      deadline = new Date(order.created_at || order.createdAt).getTime() + prep * 60 * 1000;
    }

    const calc = () => setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [order.status, order.prep_time, order.prepTime, order.rider_time, order.riderTime, order.out_for_delivery_at, order.outForDeliveryAt, order.created_at, order.createdAt]);

  if (order.status === 'delivered') return (
    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', color: '#22c55e', fontWeight: 700 }}>
      🎉 Order Delivered!
    </div>
  );

  if (remaining === null) return null;

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 120;
  const prep  = order.prep_time  || order.prepTime  || 10;
  const rider = order.rider_time || order.riderTime || 15;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {phase === 'prep' ? '👨‍🍳 Food being prepared — ready in' : '🛵 Rider on the way — arriving in'}
      </div>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: phase === 'rider' && isUrgent ? '#ef4444' : phase === 'rider' ? 'var(--primary)' : '#a78bfa' }}>
        {m}<span style={{ fontSize: '1rem', fontWeight: 500 }}>m </span>
        {String(s).padStart(2, '0')}<span style={{ fontSize: '1rem', fontWeight: 500 }}>s</span>
      </div>

      {phase === 'prep' && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          Then rider picks up · ~{rider}m delivery based on your distance
        </div>
      )}
      {phase === 'rider' && (
        <div style={{ fontSize: '0.72rem', color: '#fb923c', marginTop: '0.3rem' }}>
          📍 {rider}m estimated from restaurant to your location
        </div>
      )}

      {/* Phase pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.65rem' }}>
        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontWeight: 600,
          background: phase === 'prep' ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
          color: phase === 'prep' ? '#a78bfa' : 'var(--text-muted)',
          border: `1px solid ${phase === 'prep' ? '#a78bfa' : 'transparent'}` }}>
          👨‍🍳 Prep {prep}m
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>→</span>
        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontWeight: 600,
          background: phase === 'rider' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)',
          color: phase === 'rider' ? '#fb923c' : 'var(--text-muted)',
          border: `1px solid ${phase === 'rider' ? '#fb923c' : 'transparent'}` }}>
          🛵 Rider ~{rider}m
        </span>
      </div>
    </div>
  );
}

// ── Animated rider on road ──────────────────────────────────────────────────
function RiderAnimation({ status }) {
  const progress = { pending: 5, confirmed: 20, preparing: 45, out_for_delivery: 78, delivered: 100 }[status] ?? 5;
  return (
    <div style={{ position: 'relative', height: '70px', margin: '1.5rem 0', overflow: 'hidden' }}>
      <style>{`
        @keyframes riderBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes roadMove { from{background-position:0 0} to{background-position:-80px 0} }
        @keyframes smokePuff { 0%{opacity:0.8;transform:scale(0.5) translateY(0)} 100%{opacity:0;transform:scale(1.5) translateY(-12px)} }
        @keyframes confettiBurst { 0%{opacity:1;transform:scale(0.5)} 100%{opacity:0;transform:scale(2) translateY(-30px)} }
      `}</style>
      {/* Road */}
      <div style={{ position:'absolute', bottom:'8px', left:0, right:0, height:'14px', background:'#2a2a4a', borderRadius:'7px' }}>
        <div style={{ position:'absolute', top:'5px', left:0, right:0, height:'4px', backgroundImage:'repeating-linear-gradient(90deg,#ffd700 0px,#ffd700 20px,transparent 20px,transparent 40px)', animation: status !== 'delivered' ? 'roadMove 0.6s linear infinite' : 'none', opacity:0.5 }} />
      </div>
      {/* Progress fill */}
      <div style={{ position:'absolute', bottom:'8px', left:0, height:'14px', borderRadius:'7px', background:'linear-gradient(90deg,var(--primary),#ffd700)', width:`${progress}%`, transition:'width 1s ease', opacity:0.4 }} />
      {/* Rider emoji */}
      <div style={{ position:'absolute', bottom:'18px', left:`calc(${progress}% - 28px)`, transition:'left 1s ease', animation: status !== 'delivered' ? 'riderBob 0.5s ease-in-out infinite' : 'none', fontSize:'2rem', lineHeight:1 }}>
        {status === 'delivered' ? '🏠' : status === 'preparing' ? '🍳' : '🛵'}
      </div>
      {status === 'out_for_delivery' && (
        <>
          <div style={{ position:'absolute', bottom:'28px', left:`calc(${progress}% - 44px)`, fontSize:'0.7rem', animation:'smokePuff 0.8s ease-out infinite' }}>💨</div>
          <div style={{ position:'absolute', bottom:'24px', left:`calc(${progress}% - 52px)`, fontSize:'0.5rem', animation:'smokePuff 0.8s ease-out 0.3s infinite' }}>💨</div>
        </>
      )}
      {status === 'delivered' && (
        <div style={{ position:'absolute', bottom:'18px', left:`calc(${progress}% - 28px)`, fontSize:'1.5rem', animation:'confettiBurst 1s ease-out forwards' }}>🎊</div>
      )}
      <div style={{ position:'absolute', bottom:'18px', left:'4px', fontSize:'1.4rem' }}>🏪</div>
      <div style={{ position:'absolute', bottom:'18px', right:'4px', fontSize:'1.4rem' }}>🏠</div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function OrderPage({ params }) {
  const id = params.id;
  const [order, setOrder] = useState(null);
  const [justPlaced, setJustPlaced] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data));
    const interval = setInterval(() => api.get(`/orders/${id}`).then(r => setOrder(r.data)), 10000);
    const t = setTimeout(() => setJustPlaced(false), 5000);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (f, s, d) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(f, ctx.currentTime + s);
        g.gain.setValueAtTime(0.3, ctx.currentTime + s);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d);
        o.start(ctx.currentTime + s); o.stop(ctx.currentTime + s + d);
      };
      beep(440, 0, 0.4); beep(550, 0.45, 0.4); beep(440, 0.9, 0.4); beep(660, 1.35, 0.6);
    } catch (_) {}
    return () => { clearInterval(interval); clearTimeout(t); };
  }, [id]);

  if (!order) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>⏳</div>Loading order...</div>
    </div>
  );

  const step = STEPS.findIndex(s => s.key === order.status);
  const currentStep = STEPS[step];

  return (
    <div style={{ maxWidth:'620px', margin:'2rem auto', padding:'0 1.25rem' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sirenL { 0%,100%{background:#ef4444;box-shadow:0 0 16px #ef4444;opacity:1} 50%{background:#1a1a2e;opacity:0.2} }
        @keyframes sirenR { 0%,100%{background:#1a1a2e;opacity:0.2} 50%{background:#3b82f6;box-shadow:0 0 16px #3b82f6;opacity:1} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulseRing { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2.2);opacity:0} }
        @keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(70px) rotate(720deg);opacity:0} }
      `}</style>

      {/* Celebration banner */}
      {justPlaced && (
        <div style={{ background:'linear-gradient(135deg,#1a1a2e,#0f3460)', border:'1px solid rgba(255,107,53,0.4)', borderRadius:'16px', padding:'1.75rem', marginBottom:'1.5rem', textAlign:'center', position:'relative', overflow:'hidden', animation:'fadeUp 0.5s ease' }}>
          {['🎊','🎉','⭐','✨','🍕','🍔','🌟','💫','🎈','🥪','🥤','🎊'].map((e,i) => (
            <span key={i} style={{ position:'absolute', top:'-10px', left:`${(i/12)*100}%`, fontSize:`${0.8+(i%3)*0.3}rem`, animation:`confettiFall ${1.4+(i%3)*0.3}s ease-in ${i*0.08}s forwards`, pointerEvents:'none' }}>{e}</span>
          ))}
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginBottom:'1rem' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', animation:'sirenL 0.9s ease-in-out infinite' }} />
            <div style={{ fontSize:'1.8rem', animation:'bounce 0.7s ease-in-out infinite' }}>🚨</div>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', animation:'sirenR 0.9s ease-in-out infinite' }} />
          </div>
          <h2 style={{ fontWeight:800, fontSize:'1.5rem', marginBottom:'0.4rem' }}>Order Confirmed! 🎉</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>Sit back and relax, your food is on its way</p>
          <div style={{ position:'relative', width:'56px', height:'56px', margin:'1.1rem auto 0' }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'3px solid var(--primary)', animation:'pulseRing 1.4s ease-out infinite' }} />
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'3px solid var(--primary)', animation:'pulseRing 1.4s ease-out 0.5s infinite' }} />
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>✓</div>
          </div>
        </div>
      )}

      {/* Main tracker card */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden', marginBottom:'1.25rem', animation:'fadeUp 0.5s ease 0.1s both' }}>
        {/* Status header */}
        <div style={{ background:`linear-gradient(135deg,${order.status==='delivered'?'#052e16,#14532d':'#1a1a2e,#0f3460'})`, padding:'1.5rem', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.5rem', animation: order.status !== 'delivered' ? 'bounce 1s ease-in-out infinite' : 'none' }}>
            {currentStep?.icon}
          </div>
          <h2 style={{ fontWeight:800, fontSize:'1.3rem', marginBottom:'0.25rem' }}>{currentStep?.label}</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>{currentStep?.desc}</p>
          <div style={{ marginTop:'1rem' }}>
            <ETATimer order={order} />
          </div>
        </div>

        {/* Rider animation */}
        <div style={{ padding:'0 1.25rem', borderBottom:'1px solid var(--border)' }}>
          <RiderAnimation status={order.status} />
        </div>

        {/* Step progress */}
        <div style={{ padding:'1.25rem' }}>
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <div key={s.key} style={{ display:'flex', gap:'0.85rem', alignItems:'flex-start' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'50%', background: done?'var(--primary)':active?'rgba(255,107,53,0.2)':'var(--surface2)', border:`2px solid ${done||active?'var(--primary)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: done?'0.9rem':'1rem', boxShadow: active?'0 0 0 4px rgba(255,107,53,0.2)':'none', transition:'all 0.4s' }}>
                    {done ? '✓' : s.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width:'2px', height:'28px', background: done?'var(--primary)':'var(--border)', transition:'background 0.4s', marginTop:'2px' }} />
                  )}
                </div>
                <div style={{ paddingTop:'6px', flex:1 }}>
                  <div style={{ fontWeight: active?700:done?600:400, color: active||done?'var(--text)':'var(--text-muted)', fontSize:'0.9rem' }}>
                    {s.label}
                    {active && <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', background:'var(--primary)', color:'#fff', padding:'0.1rem 0.5rem', borderRadius:'20px' }}>Now</span>}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.1rem' }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order details */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden', marginBottom:'1.25rem', animation:'fadeUp 0.5s ease 0.2s both' }}>
        <div style={{ padding:'0.9rem 1.25rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700 }}>Order #{order.id}</span>
          <span style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{new Date(order.created_at || order.createdAt).toLocaleString()}</span>
        </div>
        {(order.order_items || order.OrderItems || []).map(oi => (
          <div key={oi.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
            {(oi.image || oi.MenuItem?.image) && <img src={oi.image || oi.MenuItem.image} alt={oi.item_name || oi.MenuItem?.name} style={{ width:'44px', height:'44px', borderRadius:'8px', objectFit:'cover' }} />}
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{oi.item_name || oi.MenuItem?.name}</div>
              <div style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>×{oi.quantity}</div>
            </div>
            <div style={{ fontWeight:700 }}>₹{(oi.price * oi.quantity).toFixed(0)}</div>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'1rem 1.25rem', fontWeight:800, color:'var(--primary)' }}>
          <span>Total</span><span>₹{order.total}</span>
        </div>
      </div>

      {/* Delivery address + map */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden', animation:'fadeUp 0.5s ease 0.3s both' }}>
        <div style={{ padding:'0.9rem 1.25rem', borderBottom:'1px solid var(--border)', fontWeight:700 }}>📍 Delivery Address</div>
        <div style={{ padding:'0.85rem 1.25rem', fontSize:'0.88rem', color:'var(--text-muted)', borderBottom: order.latitude ? '1px solid var(--border)' : 'none' }}>
          {(order.contact_name || order.contactName) && <div style={{ fontWeight:600, color:'var(--text)', marginBottom:'0.2rem' }}>{order.contact_name || order.contactName}{(order.contact_phone || order.contactPhone) && ` · ${order.contact_phone || order.contactPhone}`}</div>}
          {order.address}
        </div>
        {order.latitude && order.longitude && (
          <>
            <iframe title="map" width="100%" height="180" style={{ border:'none', display:'block' }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.longitude-0.005},${order.latitude-0.005},${order.longitude+0.005},${order.latitude+0.005}&layer=mapnik&marker=${order.latitude},${order.longitude}`}
            />
            <a href={`https://www.openstreetmap.org/?mlat=${order.latitude}&mlon=${order.longitude}#map=16/${order.latitude}/${order.longitude}`}
              target="_blank" rel="noreferrer"
              style={{ display:'block', padding:'0.5rem 1rem', fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'right' }}>
              Open in maps ↗
            </a>
          </>
        )}
      </div>

      <div style={{ textAlign:'center', marginTop:'1.5rem' }}>
        <Link href="/orders" style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>← View all orders</Link>
      </div>
    </div>
  );
}
