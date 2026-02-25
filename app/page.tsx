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

  return (
    <div className="min-h-screen bg-[#020005] text-white p-4 md:p-10 font-sans selection:bg-purple-500">
      {/* Background Aura */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

      <button onClick={() => Notification.requestPermission().then(p => p==='granted' && setNotif(true))} 
        className="fixed top-6 left-6 z-50 p-4 bg-purple-900/20 border border-purple-500/50 rounded-full hover:bg-purple-600 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]">
        {notif ? <BellRing className="text-yellow-400 animate-bounce" /> : <Bell />}
      </button>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col items-center mb-20">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 scale-150 animate-pulse"></div>
            <img src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" className="w-44 h-44 drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-300 to-purple-600">
            Garden Horizons
          </h1>
          <p className="text-purple-500 font-bold tracking-[0.5em] text-xs mt-2 opacity-80">BY SOMTANK X DRIVER</p>

          <div className="mt-10 flex flex-col md:flex-row gap-4 items-center">
            <div className="bg-purple-950/40 border border-purple-500/30 px-8 py-3 rounded-full shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]">
              <span className="text-[10px] block text-purple-400 font-black tracking-widest text-center">NEXT REFRESH</span>
              <span className="text-2xl font-mono text-white tracking-widest">{latestTimer}</span>
            </div>
            <button onClick={() => setFilter(filter === 'all' ? 'instock' : 'all')} 
              className={`px-8 py-3 rounded-full border font-black text-xs tracking-widest transition-all ${filter === 'instock' ? 'bg-green-500 border-green-400 text-black' : 'bg-transparent border-purple-500 text-purple-400'}`}>
              {filter === 'all' ? 'SHOW IN STOCK ONLY' : 'SHOWING IN STOCK'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.filter(i => filter === 'all' ? true : i.current_stock > 0).map((item) => (
            <div key={item.item_name} className="group relative bg-slate-900/20 backdrop-blur-xl border border-white/5 p-8 rounded-[3rem] transition-all duration-500 hover:scale-105 hover:border-purple-500/50 hover:bg-purple-900/10 hover:shadow-[0_0_50px_rgba(168,85,247,0.15)]">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors leading-none mb-2">{item.item_name}</h3>
                  <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{item.shop_type}</span>
                </div>
                <div className={`px-3 py-1 rounded-lg text-[9px] font-black border ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {item.current_stock > 0 ? 'IN STOCK' : 'NOT IN STOCK'}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-slate-500 text-[10px] font-black tracking-widest">PRICE</span>
                  <span className="text-3xl font-black text-white">${item.price}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <span>Stock Level</span>
                    <span>{item.current_stock} / {item.max_stock}</span>
                  </div>
                  <div className="w-full h-2 bg-black rounded-full p-[2px] border border-white/5">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(item.current_stock/item.max_stock)*100}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-600 uppercase italic">
                  Last Update: {new Date(item.updated_at).toLocaleTimeString('th-TH', {timeZone:'Asia/Bangkok'})}
                </span>
                <a href="https://somtank.rexzy.xyz" target="_blank" className="text-[10px] font-black text-purple-500 hover:text-white transition-colors">DETAIL ↗</a>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-32 pb-16 border-t border-white/5 pt-16 flex flex-col items-center gap-10">
          <div className="flex gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
            <a href="https://discord.gg/dbq9r6uV8h" target="_blank"><img src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxsG72wAo9EWJR4yQWyJJaDaK1XdUso6cUMpI9hAdPUU_FNs11cY1X284vsHrnWtRw7oqRpN1m9YAg21d_aNKnIo-&format=source" className="w-8 h-8" /></a>
            <a href="https://www.youtube.com/@somtank" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png" className="w-8 h-8" /></a>
          </div>
          <p className="text-[10px] font-bold tracking-[0.5em] text-slate-700 uppercase italic">Made with love by Somtank X Driver</p>
        </footer>
      </div>
    </div>
  );
}
