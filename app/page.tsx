"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, BellRing } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("0:00");
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

  // 🛠️ แก้บั๊กเวลานับถอยหลัง (ทนทานต่อ Timezone)
  useEffect(() => {
    const updateTimer = () => {
      if (items.length === 0) return;
      
      // หาไอเทมที่เพิ่งถูกอัปเดตล่าสุด
      const sorted = [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const latest = sorted.find(i => i.next_refresh && i.next_refresh.includes(':'));

      if (latest) {
        const [min, sec] = latest.next_refresh.split(':').map(Number);
        const totalSecInGame = (min * 60) + sec;
        
        // เวลาจาก Supabase จะเป็น UTC เสมอ
        const sentTime = new Date(latest.updated_at).getTime();
        const nowTime = Date.now();
        
        // คำนวณวินาทีที่ผ่านไป (ป้องกันค่าติดลบถ้าเวลาคอมไม่ตรง)
        let passed = Math.floor((nowTime - sentTime) / 1000);
        if (passed < 0) passed = 0; 

        const remain = totalSecInGame - passed;

        if (remain > 0) {
          const m = Math.floor(remain / 60);
          const s = remain % 60;
          setCountdown(`${m}:${s < 10 ? '0' + s : s}`);
        } else {
          setCountdown("0:00");
        }
      }
    };

    updateTimer(); // รันทันที 1 รอบ
    const timerInterval = setInterval(updateTimer, 1000); // รันซ้ำทุก 1 วิ
    return () => clearInterval(timerInterval);
  }, [items]);

  const ItemCard = ({ item }: { item: any }) => (
    // 🎨 แก้บั๊กเมาส์เด้งรัวๆ: ใช้ hover:-translate-y-3 (ลอยขึ้น) แทนการขยายขนาด (scale)
    <div className="group relative bg-slate-900/40 backdrop-blur-xl border border-purple-900/40 p-8 rounded-[2.5rem] transition-all duration-500 ease-out hover:-translate-y-3 hover:border-purple-500 hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.5)]">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-black text-white group-hover:text-purple-300 uppercase tracking-wide transition-colors">{item.item_name}</h3>
        <span className={`px-3 py-1 rounded-lg text-[9px] font-black border tracking-widest ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          {item.current_stock > 0 ? 'IN STOCK' : 'OUT STOCK'}
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-purple-500 text-[10px] font-black uppercase tracking-widest">Price</span>
          <span className="text-3xl font-black text-white drop-shadow-md">${item.price}</span>
        </div>
        <div className="w-full h-1.5 bg-[#020005] rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-blue-500 transition-all duration-1000 shadow-[0_0_10px_#a855f7]" style={{ width: `${(item.current_stock/item.max_stock)*100}%` }}></div>
        </div>
      </div>
      <div className="mt-8 pt-6 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase italic border-t border-white/5">
        <span>Update: {new Date(item.updated_at).toLocaleTimeString('th-TH', {timeZone:'Asia/Bangkok', hour12:false})}</span>
        <a href="https://somtank.rexzy.xyz" target="_blank" className="text-purple-400 hover:text-white transition-colors tracking-widest font-black">Detail ↗</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020005] text-white p-6 md:p-12 font-sans overflow-x-hidden selection:bg-purple-600">
      {/* 🔮 Vibe แสงออร่าด้านหลัง (นำกลับมาแล้ว) */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>
      
      {/* 🔔 ปุ่มแจ้งเตือนมุมซ้ายบน (สวยงามและชัดเจนขึ้น) */}
      <button onClick={() => Notification.requestPermission().then(p => p==='granted' && setNotif(true))} 
        className="fixed top-6 left-6 z-50 p-4 bg-purple-950/50 backdrop-blur-md border border-purple-500/40 rounded-full hover:bg-purple-600 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] group cursor-pointer">
        {notif ? <BellRing className="text-yellow-400 animate-bounce drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" /> : <Bell className="text-purple-300 group-hover:text-white" />}
      </button>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col items-center mb-24 text-center mt-8">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-purple-600 blur-[80px] opacity-20 scale-150 animate-pulse group-hover:opacity-40 transition-opacity duration-700"></div>
            <img src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" className="w-40 h-40 relative z-10 animate-[bounce_4s_infinite] drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-700 drop-shadow-lg">
            Garden Horizons
          </h1>
          
          <div className="mt-12 flex flex-col md:flex-row gap-8 items-center">
            <div className="bg-[#050012]/80 backdrop-blur-md border border-purple-500/30 px-14 py-6 rounded-[2rem] shadow-[inset_0_0_30px_rgba(168,85,247,0.1),0_0_20px_rgba(168,85,247,0.2)]">
              <span className="text-[10px] block text-purple-400 font-black tracking-[0.5em] mb-2">NEXT REFRESH</span>
              <span className="text-5xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{countdown}</span>
            </div>
            <button onClick={() => setFilter(filter==='all'?'instock':'all')} 
              className="px-10 py-6 rounded-[2rem] border border-purple-800 text-purple-400 font-black text-xs hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              {filter==='all' ? 'SHOWING ALL ITEMS' : 'SHOWING IN STOCK'}
            </button>
          </div>
        </header>

        <section className="mb-24">
          <h2 className="text-2xl font-black italic text-purple-400 mb-10 uppercase tracking-widest flex items-center gap-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            <div className="w-12 h-[3px] bg-purple-600 shadow-[0_0_10px_#a855f7]"></div> Seed Shop
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.filter(i => i.shop_type === 'Seed Shop' && (filter === 'all' || i.current_stock > 0)).map(item => <ItemCard key={item.item_name} item={item} />)}
          </div>
        </section>

        <section className="mb-32">
          <h2 className="text-2xl font-black italic text-blue-400 mb-10 uppercase tracking-widest flex items-center gap-4 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <div className="w-12 h-[3px] bg-blue-600 shadow-[0_0_10px_#3b82f6]"></div> Gear Shop
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.filter(i => i.shop_type === 'Gear Shop' && (filter === 'all' || i.current_stock > 0)).map(item => <ItemCard key={item.item_name} item={item} />)}
          </div>
        </section>

        <footer className="mt-32 pb-16 border-t border-purple-900/30 pt-16 flex flex-col items-center">
          <p className="text-[10px] font-black tracking-[0.8em] text-slate-700 uppercase italic mb-2">Made with love</p>
          <p className="text-sm font-black tracking-[0.4em] text-purple-800 uppercase italic">By Somtank X Driver</p>
        </footer>
      </div>
    </div>
  );
}
