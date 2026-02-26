"use client"
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, BellRing, Volume2 } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("0:00");
  const [filter, setFilter] = useState<'all' | 'instock'>('all');
  const [notif, setNotif] = useState(false);
  
  const notifiedZero = useRef(false);
  const lastNotifiedTime = useRef(0);
  const [targetTimestamp, setTargetTimestamp] = useState<number | null>(null);

  const playAlertSound = () => {
    try {
      const audio = new Audio("/alert.mp3"); 
      audio.volume = 1.0;
      audio.play().catch(e => console.log("เบราว์เซอร์รอให้ผู้ใช้คลิกหน้าเว็บก่อนเล่นเสียง"));
    } catch (error) {
      console.error(error);
    }
  };

  const triggerNotification = (title: string, body?: string) => {
    playAlertSound();
    if (Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: "https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      setNotif(true);
    }

    const fetchInitial = async () => {
      const { data } = await supabase.from('restock_logs').select('*');
      if (data) setItems(data);
    };
    fetchInitial();

    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload: any) => {
      const newData = payload.new;
      const now = Date.now();
      if (notif && now - lastNotifiedTime.current > 60000) {
        triggerNotification("📦 Restock Completed!", "สต็อกร้านค้าถูกอัปเดตแล้ว เข้าไปเช็คไอเทมได้เลย!");
        lastNotifiedTime.current = now;
      }
      
      setItems(prev => {
        const exists = prev.find(i => i.item_name === newData.item_name);
        return exists ? prev.map(i => i.item_name === newData.item_name ? newData : i) : [newData, ...prev];
      });
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [notif]);

  useEffect(() => {
    if (items.length === 0) return;
    const latest = items.reduce((prev, current) => (new Date(prev.updated_at) > new Date(current.updated_at)) ? prev : current);
    
    if (latest && latest.next_refresh && latest.next_refresh.includes(':')) {
      const [min, sec] = latest.next_refresh.split(':').map(Number);
      const totalSecInGame = (min * 60) + sec;
      const sentTime = new Date(latest.updated_at).getTime();
      setTargetTimestamp(sentTime + (totalSecInGame * 1000));
    }
  }, [items]);

  useEffect(() => {
    if (!targetTimestamp) return;
    const timerInterval = setInterval(() => {
      const remain = Math.floor((targetTimestamp - Date.now()) / 1000);
      
      if (remain > 0) {
        const m = Math.floor(remain / 60);
        const s = remain % 60;
        setCountdown(`${m}:${s < 10 ? '0' + s : s}`);
        notifiedZero.current = false;
      } else {
        setCountdown("RE-STOCKING...");
        if (!notifiedZero.current && notif) {
          triggerNotification("⏳ Time's up!", "กำลังรอข้อมูลรอบใหม่จากบอทในเกม..."); 
          notifiedZero.current = true;
        }
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [targetTimestamp, notif]);

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      triggerNotification("✅ ระบบแจ้งเตือนพร้อมใช้งาน!", "เสียงและป๊อปอัปทำงานสมบูรณ์");
    } else {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          setNotif(true);
          triggerNotification("🔔 เปิดการแจ้งเตือนสำเร็จ");
        } else {
          alert("คุณบล็อกการแจ้งเตือนไว้ กรุณากดที่ไอคอนแม่กุญแจ 🔒 บน URL Bar เพื่ออนุญาตครับ");
        }
      });
    }
  };

  const ItemCard = ({ item }: { item: any }) => (
    <div className="group relative bg-[#0a0216]/80 backdrop-blur-xl border border-purple-900/40 p-8 rounded-[2.5rem] transition-all duration-500 ease-out hover:-translate-y-3 hover:border-purple-500 hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.5)]">
      
      {/* 🛠️ จุดที่แก้ไข: โชว์จำนวนชิ้นแบบเป๊ะๆ */}
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-black text-white group-hover:text-purple-300 uppercase tracking-wide transition-colors">{item.item_name}</h3>
        <span className={`px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap font-black border tracking-widest ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          {item.current_stock > 0 ? `INSTOCK : ${item.current_stock} PIECE` : 'INSTOCK : OUT OF STOCK'}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-purple-500 text-[10px] font-black uppercase tracking-widest">Price</span>
          <span className="text-3xl font-black text-white drop-shadow-md">${item.price}</span>
        </div>
        {/* 🛠️ จุดที่แก้ไข: เอาหลอด MAX ออก และเปลี่ยนเป็นเส้นขีดแบ่งบางๆ สไตล์ Sci-Fi แทน */}
        <div className="w-full h-[1px] bg-gradient-to-r from-purple-900/60 to-transparent"></div>
      </div>

      <div className="mt-8 pt-6 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase italic border-t border-white/5">
        <span>Update: {new Date(item.updated_at).toLocaleTimeString('th-TH', {timeZone:'Asia/Bangkok', hour12:false})}</span>
        <a href="https://somtank.rexzy.xyz" target="_blank" className="text-purple-400 hover:text-white transition-colors tracking-widest font-black">Detail ↗</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020005] text-white p-6 md:p-12 font-sans overflow-x-hidden selection:bg-purple-600">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>
      
      <div className="fixed top-6 left-6 z-50 flex flex-col gap-3">
        <button onClick={testNotification} className="flex items-center gap-3 px-5 py-3 bg-[#0a0216]/80 backdrop-blur-md border border-purple-500/40 rounded-full hover:bg-purple-600 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] group cursor-pointer">
          {notif ? <Volume2 className="text-yellow-400 animate-pulse" size={20} /> : <Bell className="text-purple-300 group-hover:text-white" size={20} />}
          <span className="text-[10px] font-black tracking-widest uppercase text-purple-200 group-hover:text-white mt-[2px]">
            {notif ? 'Test Alert' : 'Enable Alert'}
          </span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 mt-10">
        <header className="flex flex-col items-center mb-24 text-center mt-8">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-purple-600 blur-[80px] opacity-20 scale-150 animate-pulse group-hover:opacity-40 transition-opacity duration-700"></div>
            <img src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" className="w-40 h-40 relative z-10 animate-[bounce_4s_infinite] drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-700 drop-shadow-lg">
            Garden Horizons
          </h1>
          
          <div className="mt-12 flex flex-col md:flex-row gap-8 items-center">
            <div className="bg-[#050012]/80 backdrop-blur-md border border-purple-500/30 px-14 py-6 rounded-[2rem] shadow-[inset_0_0_30px_rgba(168,85,247,0.1),0_0_20px_rgba(168,85,247,0.2)] flex flex-col items-center">
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
          <div className="flex gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500 mb-8">
            <a href="https://discord.gg/dbq9r6uV8h" target="_blank" className="hover:scale-125 hover:drop-shadow-[0_0_15px_#5865F2] transition-all">
              <img src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxsG72wAo9EWJR4yQWyJJaDaK1XdUso6cUMpI9hAdPUU_FNs11cY1X284vsHrnWtRw7oqRpN1m9YAg21d_aNKnIo-&format=source" className="w-10 h-10 object-contain" />
            </a>
            <a href="https://www.youtube.com/@somtank" target="_blank" className="hover:scale-125 hover:drop-shadow-[0_0_15px_#FF0000] transition-all">
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png" className="w-10 h-10 object-contain" />
            </a>
          </div>
          <p className="text-[10px] font-black tracking-[0.8em] text-slate-700 uppercase italic mb-2">Made with love</p>
          <p className="text-sm font-black tracking-[0.4em] text-purple-800 uppercase italic">By Somtank X Driver</p>
        </footer>
      </div>
    </div>
  );
}
