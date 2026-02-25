"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, BellRing, Filter } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'instock' | 'outstock'>('all');
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase.from('restock_logs').select('*');
      if (data) setItems(data);
    };
    fetchInitial();

    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload: any) => {
      const newData = payload.new;
      if (notifEnabled && newData.current_stock > 0) {
        new Notification(`🚀 Stock Updated: ${newData.item_name} is now IN STOCK!`);
      }
      setItems((prev) => {
        const exists = prev.find(i => i.item_name === newData.item_name);
        return exists ? prev.map(i => i.item_name === newData.item_name ? newData : i) : [newData, ...prev];
      });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [notifEnabled]);

  const requestNotif = () => {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') setNotifEnabled(true);
    });
  };

  const filteredItems = items.filter(i => {
    if (filter === 'instock') return i.current_stock > 0;
    if (filter === 'outstock') return i.current_stock === 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#05000a] text-purple-100 p-6 font-sans antialiased selection:bg-purple-500">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#2a004d_0%,#05000a_100%)] opacity-40 -z-10"></div>

      {/* Top Left Notif Button */}
      <button onClick={requestNotif} className="fixed top-6 left-6 z-50 p-3 bg-purple-900/30 border border-purple-500/50 rounded-full hover:bg-purple-600 transition-all shadow-[0_0_15px_#a855f7]">
        {notifEnabled ? <BellRing size={20} /> : <Bell size={20} />}
      </button>

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col items-center mb-16 pt-10">
          {/* Animated Logo */}
          <div className="relative group mb-8">
            <div className="absolute inset-0 bg-purple-600 rounded-full blur-2xl animate-pulse opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <img 
              src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" 
              className="w-40 h-40 relative z-10 animate-bounce hover:scale-110 transition-transform duration-700" 
              style={{ animationDuration: '3s' }}
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 uppercase tracking-tighter drop-shadow-lg">
            Restock Garden Horizons By Somtank
          </h1>
          
          {/* Next Refresh & Filter */}
          <div className="mt-8 flex flex-col md:flex-row gap-6 items-center">
            <div className="px-6 py-2 bg-purple-900/40 border border-purple-500/30 rounded-full text-sm font-bold tracking-widest text-purple-300 shadow-[0_0_10px_#7e22ce]">
              NEXT REFRESH: <span className="text-white">{items[0]?.next_refresh || "--:--"}</span>
            </div>
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-purple-500/20">
              {['all', 'instock', 'outstock'].map((f) => (
                <button 
                  key={f} onClick={() => setFilter(f as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filter === f ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-purple-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <div key={item.item_name} className="group relative bg-[#0d021a] border border-purple-900/50 p-8 rounded-[2.5rem] transition-all duration-500 hover:scale-105 hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)] overflow-hidden">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all"></div>
              
               <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{item.item_name}</h3>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {item.current_stock > 0 ? 'IN STOCK' : 'NOT IN STOCK'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end"><span className="text-purple-500 text-xs font-bold">PRICE</span><span className="text-2xl font-black text-white">${item.price}</span></div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-purple-900/30">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-1000" style={{ width: `${(item.current_stock / item.max_stock) * 100}%` }}></div>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center text-[10px] text-purple-700 font-bold italic uppercase tracking-widest">
                <span>Updated: {new Date(item.updated_at).toLocaleTimeString()}</span>
                <a href="https://somtank.rexzy.xyz" target="_blank" className="text-purple-400 hover:text-white transition-colors">Detail ↗</a>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-24 pb-12 flex flex-col items-center gap-8 border-t border-purple-900/30 pt-12">
          <div className="flex gap-12">
            <a href="https://discord.gg/dbq9r6uV8h" target="_blank" className="hover:drop-shadow-[0_0_15px_#5865F2] transition-all"><img src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxsG72wAo9EWJR4yQWyJJaDaK1XdUso6cUMpI9hAdPUU_FNs11cY1X284vsHrnWtRw7oqRpN1m9YAg21d_aNKnIo-&format=source" className="w-8 h-8 opacity-70 hover:opacity-100" /></a>
            <a href="https://www.youtube.com/@somtank" target="_blank" className="hover:drop-shadow-[0_0_15px_#FF0000] transition-all"><img src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png" className="w-8 h-8 opacity-70 hover:opacity-100" /></a>
          </div>
          <p className="text-sm font-bold tracking-widest text-purple-800 uppercase italic">Made with love by Somtank X Driver</p>
        </footer>
      </div>
    </div>
  );
}
