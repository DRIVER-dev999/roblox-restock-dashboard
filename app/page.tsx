"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, BellRing, Youtube, Disc as Discord } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'instock'>('all');
  const [notif, setNotif] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase.from('restock_logs').select('*');
      if (data) setItems(data);
    };
    fetchInitial();

    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload: any) => {
      const newData = payload.new;
      if (notif && newData.current_stock > 0) {
        new Notification(`🔥 ${newData.item_name} RE-STOCK!`);
      }
      setItems(prev => {
        const exists = prev.find(i => i.item_name === newData.item_name);
        return exists ? prev.map(i => i.item_name === newData.item_name ? newData : i) : [newData, ...prev];
      });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [notif]);

  const latestTimer = items.find(i => i.next_refresh && i.next_refresh !== "0:00")?.next_refresh || "0:00";

  const ItemCard = ({ item }: { item: any }) => (
    <div className="group relative bg-[#0d021a] border border-purple-900/40 p-8 rounded-[3rem] transition-all duration-500 hover:scale-105 hover:border-purple-400 hover:bg-purple-900/10 hover:shadow-[0_0_50px_rgba(168,85,247,0.2)]">
      <div className="flex justify-between items-start mb-8">
        <h3 className="text-2xl font-black text-white group-hover:text-purple-300 transition-colors leading-none">{item.item_name}</h3>
        <div className={`px-3 py-1 rounded-lg text-[9px] font-black border ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {item.current_stock > 0 ? 'IN STOCK' : 'NOT IN STOCK'}
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <span className="text-purple-600 text-[10px] font-black tracking-widest uppercase">Price</span>
          <span className="text-3xl font-black text-white">${item.price}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
            <span>Stock Level</span>
            <span>{item.current_stock} / {item.max_stock}</span>
          </div>
          <div className="w-full h-2 bg-black rounded-full p-[2px] border border-white/5">
            <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(item.current_stock/item.max_stock)*100}%` }}></div>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
        <span className="text-[9px] font-bold text-slate-700 uppercase italic">
          Update: {new Date(item.updated_at).toLocaleTimeString('th-TH', {timeZone:'Asia/Bangkok', hour12:false})}
        </span>
        <a href="https://somtank.rexzy.xyz" target="_blank" className="text-[10px] font-black text-purple-500 hover:text-white transition-colors uppercase tracking-widest">Detail ↗</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05000a] text-white p-6 md:p-12 font-sans selection:bg-purple-600">
      {/* Glow Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1a0033_0%,#05000a_100%)] opacity-60 -z-10"></div>

      {/* Notif Button */}
      <button onClick={() => Notification.requestPermission().then(p => p==='granted' && setNotif(true))} 
        className="fixed top-8 left-8 z-50 p-4 bg-purple-950/40 border border-purple-500/30 rounded-full hover:bg-purple-600 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] group">
        <Bell className={`${notif ? 'text-yellow-400 animate-bounce' : 'text-purple-300'}`} />
      </button>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col items-center mb-24 text-center">
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-purple-600 blur-[80px] opacity-20 scale-150 animate-pulse"></div>
            <img src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" className="w-40 h-40 relative z-10 animate-[bounce_4s_infinite]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-600">
            Garden Horizons
          </h1>
          
          <div className="mt-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-purple-900/30 border border-purple-500/20 px-10 py-4 rounded-3xl shadow-[inset_0_0_30px_rgba(168,85,247,0.05)]">
              <span className="text-[10px] block text-purple-500 font-black tracking-[0.3em] mb-1">NEXT REFRESH</span>
              <span className="text-3xl font-mono text-white tracking-widest animate-pulse">{latestTimer}</span>
            </div>
            <button onClick={() => setFilter(filter === 'all' ? 'instock' : 'all')} 
              className={`px-8 py-4 rounded-3xl border font-black text-xs tracking-widest transition-all ${filter === 'instock' ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'bg-transparent border-purple-800 text-purple-600'}`}>
              {filter === 'all' ? 'FILTER: ALL ITEMS' : 'FILTER: IN STOCK'}
            </button>
          </div>
        </header>

        {/* แยกหมวดหมู่ Seed Shop */}
        <section className="mb-24">
          <h2 className="text-2xl font-black italic text-purple-400 mb-10 flex items-center gap-4 uppercase tracking-widest">
            <span className="w-12 h-[2px] bg-purple-600"></span> Seed Shop Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {items.filter(i => i.shop_type === 'Seed Shop' && (filter === 'all' || i.current_stock > 0)).map(item => <ItemCard key={item.item_name} item={item} />)}
          </div>
        </section>

        {/* แยกหมวดหมู่ Gear Shop */}
        <section className="mb-24">
          <h2 className="text-2xl font-black italic text-blue-400 mb-10 flex items-center gap-4 uppercase tracking-widest">
            <span className="w-12 h-[2px] bg-blue-600"></span> Gear Shop Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {items.filter(i => i.shop_type === 'Gear Shop' && (filter === 'all' || i.current_stock > 0)).map(item => <ItemCard key={item.item_name} item={item} />)}
          </div>
        </section>

        <footer className="mt-40 pb-20 border-t border-purple-900/20 pt-20 flex flex-col items-center gap-12">
          <div className="flex gap-16">
            <a href="https://discord.gg/dbq9r6uV8h" target="_blank" className="hover:scale-125 transition-transform duration-500">
              <img src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxsG72wAo9EWJR4yQWyJJaDaK1XdUso6cUMpI9hAdPUU_FNs11cY1X284vsHrnWtRw7oqRpN1m9YAg21d_aNKnIo-&format=source" className="w-10 h-10 drop-shadow-[0_0_10px_rgba(88,101,242,0.5)]" />
            </a>
            <a href="https://www.youtube.com/@somtank" target="_blank" className="hover:scale-125 transition-transform duration-500">
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png" className="w-10 h-10 drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
            </a>
          </div>
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.8em] text-slate-800 uppercase italic">Made with love</p>
            <p className="text-sm font-black tracking-[0.3em] text-purple-900 uppercase italic mt-2">By Somtank X Driver</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
