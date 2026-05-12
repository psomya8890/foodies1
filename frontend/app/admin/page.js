'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const STATUSES = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled','rejected'];
const STATUS_COLORS = { pending:'#f59e0b', confirmed:'#3b82f6', preparing:'#8b5cf6', out_for_delivery:'#f97316', delivered:'#22c55e', cancelled:'#6b7280', rejected:'#ef4444' };

const TABS = ['Orders','Analytics','Menu','Customers'];

export default function AdminPage() {
  const [tab, setTab] = useState('Orders');
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [menuModal, setMenuModal] = useState(null); // null | 'new' | item
  const [menuForm, setMenuForm] = useState({ name:'', description:'', price:'', image:'', category_id:'', available:true });
  const [categories, setCategories] = useState([]);

  const fetchOrders = () => api.get(`/admin/orders?status=${filter}&search=${search}`).then(r => setOrders(r.data)).catch(() => setError('Access denied'));
  const fetchAnalytics = () => api.get('/admin/analytics').then(r => setAnalytics(r.data)).catch(() => {});
  const fetchMenu = () => api.get('/admin/menu').then(r => setMenuItems(r.data)).catch(() => {});
  const fetchCustomers = () => api.get('/admin/customers').then(r => setCustomers(r.data)).catch(() => {});
  const fetchCategories = () => api.get('/menu/categories').then(r => setCategories(r.data)).catch(() => {});

  useEffect(() => { fetchOrders(); fetchAnalytics(); fetchCategories(); }, []);
  useEffect(() => { if (tab === 'Orders') fetchOrders(); }, [filter, search, tab]);
  useEffect(() => { if (tab === 'Menu') fetchMenu(); if (tab === 'Customers') fetchCustomers(); if (tab === 'Analytics') fetchAnalytics(); }, [tab]);

  const updateStatus = async (id, status) => { await api.patch(`/admin/orders/${id}`, { status }); fetchOrders(); };

  const saveMenuItem = async () => {
    try {
      if (menuModal === 'new') await api.post('/admin/menu', menuForm);
      else await api.put(`/admin/menu/${menuModal.id}`, menuForm);
      setMenuModal(null); fetchMenu();
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  const deleteMenuItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/admin/menu/${id}`); fetchMenu();
  };

  const openEdit = (item) => { setMenuForm({ name:item.name, description:item.description||'', price:item.price, image:item.image||'', category_id:item.category_id||'', available:item.available }); setMenuModal(item); };
  const openNew  = () => { setMenuForm({ name:'', description:'', price:'', image:'', category_id:'', available:true }); setMenuModal('new'); };

  return (
    <div style={{ maxWidth:'1100px', margin:'2rem auto', padding:'0 1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h1 style={{ fontWeight:800, fontSize:'1.8rem' }}>⚙️ Admin Dashboard</h1>
        <button onClick={() => { fetchOrders(); fetchAnalytics(); }} className="btn btn-outline" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>↻ Refresh</button>
      </div>

      {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', padding:'1rem', marginBottom:'1.5rem', color:'#f87171' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'0.75rem' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn"
            style={{ padding:'0.5rem 1.25rem', borderRadius:'8px', fontSize:'0.9rem', background:tab===t?'var(--primary)':'transparent', color:tab===t?'#fff':'var(--text-muted)', border:'none', fontWeight:tab===t?700:400 }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {tab === 'Orders' && (
        <>
          <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
            <input type="text" placeholder="Search by order ID or customer name..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ flex:1, minWidth:'200px', fontSize:'0.88rem' }} />
            <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
              {['all',...STATUSES].map(s => (
                <button key={s} onClick={() => setFilter(s)} className="btn"
                  style={{ padding:'0.35rem 0.85rem', borderRadius:'50px', fontSize:'0.78rem', background:filter===s?'var(--primary)':'var(--surface)', color:filter===s?'#fff':'var(--text-muted)', border:'1px solid', borderColor:filter===s?'var(--primary)':'var(--border)' }}>
                  {s.replace(/_/g,' ')}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {orders.map(order => (
              <div key={order.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.9rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700 }}>#{order.id}</span>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>👤 {order.user_name || order.User?.name}</span>
                    {(order.contact_phone || order.contactPhone) && <span style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>📞 {order.contact_phone || order.contactPhone}</span>}
                    <span style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{new Date(order.created_at || order.createdAt).toLocaleString()}</span>
                    {order.rating && <span style={{ color:'#fbbf24', fontSize:'0.82rem' }}>{'★'.repeat(order.rating)}</span>}
                  </div>
                  <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                    <span style={{ fontWeight:800, color:'var(--primary)' }}>₹{order.total}</span>
                    <span style={{ background:`${STATUS_COLORS[order.status]}22`, color:STATUS_COLORS[order.status], padding:'0.25rem 0.75rem', borderRadius:'20px', fontSize:'0.78rem', fontWeight:600 }}>
                      {order.status.replace(/_/g,' ')}
                    </span>
                  </div>
                </div>
                <div style={{ padding:'0.65rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
                  <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                    {(order.order_items || order.OrderItems)?.map(oi => (
                      <span key={oi.id} style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{oi.item_name || oi.MenuItem?.name} ×{oi.quantity}</span>
                    ))}
                    {(order.special_note || order.specialNote) && <span style={{ fontSize:'0.78rem', color:'var(--primary)', fontStyle:'italic' }}>📝 {order.special_note || order.specialNote}</span>}
                  </div>
                  <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                    style={{ width:'auto', padding:'0.35rem 0.65rem', fontSize:'0.82rem', borderRadius:'8px' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {orders.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}><div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📭</div>No orders found</div>}
          </div>
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'Analytics' && analytics && (
        <div>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
            {[
              { label:'Total Revenue',   value:`₹${analytics.revenue.total.toFixed(0)}`,  icon:'💰', color:'#ffd700' },
              { label:'Today Revenue',   value:`₹${analytics.revenue.today.toFixed(0)}`,  icon:'📅', color:'#22c55e' },
              { label:'This Month',      value:`₹${analytics.revenue.month.toFixed(0)}`,  icon:'📆', color:'#3b82f6' },
              { label:'Total Orders',    value:analytics.totalOrders,                      icon:'📦', color:'#f97316' },
              { label:'Today Orders',    value:analytics.todayOrders,                      icon:'🛵', color:'#8b5cf6' },
              { label:'Customers',       value:analytics.customers,                        icon:'👥', color:'#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <div style={{ fontSize:'1.8rem' }}>{s.icon}</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1.4rem', color:s.color, lineHeight:1 }}>{s.value}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:'0.78rem', marginTop:'0.2rem' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily revenue chart (CSS bars) */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem', marginBottom:'1.5rem' }}>
            <h3 style={{ fontWeight:700, marginBottom:'1.25rem' }}>Last 7 Days Revenue</h3>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-end', height:'140px' }}>
              {analytics.dailyRevenue.map((d, i) => {
                const max = Math.max(...analytics.dailyRevenue.map(x => x.revenue), 1);
                const h = Math.max(4, (d.revenue / max) * 120);
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem' }}>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:600 }}>₹{d.revenue > 999 ? (d.revenue/1000).toFixed(1)+'k' : d.revenue.toFixed(0)}</div>
                    <div style={{ width:'100%', height:`${h}px`, background:'linear-gradient(180deg,var(--primary),#ffd700)', borderRadius:'4px 4px 0 0', transition:'height 0.5s', position:'relative' }}>
                      {d.orders > 0 && <div style={{ position:'absolute', top:'-18px', left:'50%', transform:'translateX(-50%)', fontSize:'0.65rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{d.orders} orders</div>}
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', textAlign:'center' }}>{d.date}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top items */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem' }}>
            <h3 style={{ fontWeight:700, marginBottom:'1rem' }}>🏆 Top Selling Items</h3>
            {analytics.topItems.map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 0', borderBottom:i<analytics.topItems.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ fontWeight:800, color:'var(--primary)', width:'24px' }}>#{i+1}</div>
                {item.image && <img src={item.image} alt="" style={{ width:'40px', height:'40px', borderRadius:'8px', objectFit:'cover' }} />}
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{item.name}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>₹{item.price}</div>
                </div>
                <div style={{ fontWeight:700, color:'var(--primary)' }}>{item.total_qty} sold</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MENU TAB ── */}
      {tab === 'Menu' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
            <button className="btn btn-primary" style={{ padding:'0.55rem 1.25rem' }} onClick={openNew}>+ Add Item</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem' }}>
            {menuItems.map(item => (
              <div key={item.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                {item.image && <img src={item.image} alt={item.name} style={{ width:'100%', height:'130px', objectFit:'cover' }} />}
                <div style={{ padding:'0.85rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.3rem' }}>
                    <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{item.name}</div>
                    <span style={{ fontSize:'0.72rem', background:item.available?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', color:item.available?'#22c55e':'#f87171', padding:'0.15rem 0.5rem', borderRadius:'20px' }}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ color:'var(--text-muted)', fontSize:'0.78rem', marginBottom:'0.5rem' }}>{item.description}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:800, color:'var(--primary)' }}>₹{item.price}</span>
                    <div style={{ display:'flex', gap:'0.4rem' }}>
                      <button onClick={() => openEdit(item)} className="btn btn-outline" style={{ padding:'0.3rem 0.7rem', fontSize:'0.78rem' }}>Edit</button>
                      <button onClick={() => deleteMenuItem(item.id)} style={{ padding:'0.3rem 0.7rem', fontSize:'0.78rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', borderRadius:'8px', cursor:'pointer' }}>Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CUSTOMERS TAB ── */}
      {tab === 'Customers' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {customers.map(c => (
            <div key={c.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{c.name}</div>
                <div style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{c.email}</div>
                <div style={{ color:'var(--text-muted)', fontSize:'0.78rem', marginTop:'0.2rem' }}>Joined {new Date(c.created_at || c.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:800, color:'var(--primary)' }}>{c.orders?.length || 0} orders</div>
                <div style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>
                  ₹{(c.orders || []).reduce((s, o) => s + parseFloat(o.total || 0), 0).toFixed(0)} total
                </div>
              </div>
            </div>
          ))}
          {customers.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No customers yet</div>}
        </div>
      )}

      {/* ── Menu item modal ── */}
      {menuModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:'480px', maxHeight:'90vh', overflowY:'auto' }}>
            <h3 style={{ fontWeight:800, marginBottom:'1.5rem' }}>{menuModal === 'new' ? 'Add Menu Item' : 'Edit Menu Item'}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {[['name','Name','text'],['description','Description','text'],['price','Price (₹)','number'],['image','Image URL','text']].map(([field, label, type]) => (
                <div key={field}>
                  <label style={{ display:'block', marginBottom:'0.35rem', fontSize:'0.82rem', color:'var(--text-muted)', fontWeight:500 }}>{label}</label>
                  <input type={type} value={menuForm[field]} onChange={e => setMenuForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', marginBottom:'0.35rem', fontSize:'0.82rem', color:'var(--text-muted)', fontWeight:500 }}>Category</label>
                <select value={menuForm.category_id} onChange={e => setMenuForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <input type="checkbox" id="avail" checked={menuForm.available} onChange={e => setMenuForm(f => ({ ...f, available: e.target.checked }))} style={{ width:'auto' }} />
                <label htmlFor="avail" style={{ fontSize:'0.88rem' }}>Available for ordering</label>
              </div>
            </div>
            <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => setMenuModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={saveMenuItem}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
