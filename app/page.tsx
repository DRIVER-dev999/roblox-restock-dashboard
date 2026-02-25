"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, BellRing } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'instock'>('all');
  const [countdown, setCountdown] = useState("00:00");
  const [notif, setNotif] = useState(false);

  useEffect(() => {
    // ดึงข้อมูลเริ่มต้น
    const fetchInitial = async () => {
      const { data } = await supabase.from('restock_logs').select('*');
      if (data) setItems(data);
    };
    fetchInitial();

    // ฟัง Real-time จาก Supabase
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload: any) => {
      const newData = payload.new;
      setItems(prev => {
        const exists = prev.find(i => i.item_name === newData.item_name);
        return exists ? prev.map(i => i.item_name === newData.item_name ? newData : i) : [newData, ...prev];
      });
    }).subscribe();

    // ระบบนับถอยหลังอัตโนมัติ (รับค่า 3:43 แล้วนับต่อ)
    const timer = setInterval(() => {
      const latest = items.find(i => i.next_refresh && i.next_refresh.includes(':'));
      if (latest) {
        const [min, sec] = latest.next_refresh.split(':').map(Number);
        const totalInGame = (min * 60) + sec;
        
        const sentTime = new Date(latest.updated_at).getTime();
        const nowTime = new Date().getTime();
        const passed = Math.floor((nowTime - sentTime) / 1000);
        
        const remaining = totalInGame - passed;

        if (remaining > 0) {
          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          setCountdown(`${m}:${s < 10 ? '0' + s : s}`);
        } else {
          setCountdown("0:00");
        }
      }
    }, 1000);

    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, [items]);

  const ItemCard = ({ item }: { item: any }) => (
    <div className="group relative bg-[#0d021a] border border-purple-900/30 p-8 rounded-[2.5rem] transition-all duration-500 hover:scale-105 hover:border-purple-400 hover:bg-purple-900/10">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-black text-white group-hover:text-purple-300 uppercase">{item.item_name}</h3>
        <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {item.current_stock > 0 ? 'IN STOCK' : 'OUT STOCK'}
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-purple-600 text-[10px] font-black tracking-widest uppercase">Price</span>
          <span className="text-3xl font-black text-white">${item.price}</span>
        </div>
        <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-1000" style={{ width: `${(item.current_stock/item.max_stock)*100}%` }}></div>
        </div>
      </div>
      <div className="mt-8 flex justify-between items-center text-[9px] font-bold text-slate-700 uppercase italic">
        <span>Update: {new Date(item.updated_at).toLocaleTimeString('th-TH', {timeZone:'Asia/Bangkok', hour12:false})}</span>
        <a href="https://somtank.rexzy.xyz" target="_blank" className="text-purple-500 hover:text-white transition-colors font-black">Detail ↗</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05000a] text-white p-6 md:p-12 font-sans selection:bg-purple-600">
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1a0033_0%,#05000a_100%)] opacity-70 -z-10"></div>
      
      <button onClick={() => Notification.requestPermission().then(p => p==='granted' && setNotif(true))} 
        className="fixed top-8 left-8 z-50 p-4 bg-purple-950/40 border border-purple-500/30 rounded-full hover:bg-purple-600 transition-all shadow-lg">
        {notif ? <BellRing className="text-yellow-400 animate-bounce" /> : <Bell className="text-purple-400" />}
      </button>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col items-center mb-24 text-center">
          <div className="relative mb-8 group">
             <div className="absolute inset-0 bg-purple-600 blur-[80px] opacity-20 scale-150 animate-pulse group-hover:opacity-40 transition-opacity"></div>
             <img src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" className="w-40 h-40 relative z-10 animate-[bounce_4s_infinite]" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-700 leading-none">
            Garden Horizons
          </h1>
          
          <div className="mt-12 flex flex-col md:flex-row gap-8 items-center">
            <div className="bg-black/40 border border-purple-500/20 px-12 py-5 rounded-[2rem] shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]">
              <span className="text-[10px] block text-purple-500 font-black tracking-[0.4em] mb-1">NEXT REFRESH</span>
              <span className="text-4xl font-mono text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{countdown}</span>
            </div>
            <button onClick={() => setFilter(filter==='all'?'instock':'all')} className="px-10 py-5 rounded-[2rem] border border-purple-900 text-purple-500 font-black text-xs hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest shadow-xl">
              {filter==='all' ? 'SHOWING ALL ITEMS' : 'SHOWING IN STOCK'}
            </button>
          </div>
        </header>

        <section className="mb-24">
          <h2 className="text-2xl font-black italic text-purple-400 mb-10 uppercase tracking-widest flex items-center gap-4">
            <div className="w-12 h-[2px] bg-purple-600"></div> Seed Shop
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {items.filter(i => i.shop_type === 'Seed Shop' && (filter === 'all' || i.current_stock > 0)).map(item => <ItemCard key={item.item_name} item={item} />)}
          </div>
        </section>

        <section className="mb-32">
          <h2 className="text-2xl font-black italic text-blue-400 mb-10 uppercase tracking-widest flex items-center gap-4">
            <div className="w-12 h-[2px] bg-blue-600"></div> Gear Shop
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {items.filter(i => i.shop_type === 'Gear Shop' && (filter === 'all' || i.current_stock > 0)).map(item => <ItemCard key={item.item_name} item={item} />)}
          </div>
        </section>

        <footer className="mt-40 pb-20 border-t border-purple-950/50 pt-16 flex flex-col items-center">
          <p className="text-xs font-black tracking-[1em] text-slate-800 uppercase italic mb-2 opacity-50">Made with love</p>
          <p className="text-sm font-black tracking-[0.4em] text-purple-900 uppercase italic">By Somtank X Driver</p>
        </footer>
      </div>
    </div>
  );
}
