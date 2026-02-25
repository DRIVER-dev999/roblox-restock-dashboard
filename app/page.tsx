"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function RestockDashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data } = await supabase.from('restock_logs').select('*').order('updated_at', { ascending: false });
      if (data) setItems(data);
      setLoading(false);
    };
    fetchInitialData();

    const channel = supabase.channel('realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload: any) => {
        const newData = payload.new;
        setItems((prev) => {
          const exists = prev.find(i => i.item_name === newData.item_name);
          if (exists) return prev.map(i => i.item_name === newData.item_name ? newData : i);
          return [newData, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const CategorySection = ({ title, icon, filter }: { title: string, icon: string, filter: string }) => (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-2">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.filter(i => i.shop_type?.toLowerCase().includes(filter.toLowerCase())).map((item) => (
          <div key={item.item_name} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">{item.item_name}</h3>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${item.current_stock > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {item.current_stock > 0 ? 'IN STOCK' : 'NOT IN STOCK'}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Price:</span><span className="text-amber-400 font-bold">${item.price}</span></div>
              <div className="flex justify-between text-xs text-slate-400"><span>Stock: {item.current_stock} / {item.max_stock}</span></div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(item.current_stock / item.max_stock) * 100}%` }}></div>
              </div>
            </div>
            <a href="https://somtank.rexzy.xyz" target="_blank" className="mt-6 block text-center py-2 bg-blue-600/10 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">DETAIL</a>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col items-center mb-16 text-center">
          <img src="https://raw.githubusercontent.com/somtdays-cmd/Info-web/refs/heads/main/BigIcon.png" alt="Logo" className="w-32 h-32 mb-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
          <h1 className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase">
            Restock Garden Horizons By Somtank
          </h1>
        </header>

        <CategorySection title="Seed Shop Items" icon="🌱" filter="Seed" />
        <CategorySection title="Gear Shop Items" icon="⚙️" filter="Gear" />

        <footer className="mt-20 pt-10 border-t border-slate-800 flex flex-col items-center gap-6">
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Follow Us</p>
          <div className="flex gap-8">
            <a href="https://discord.gg/dbq9r6uV8h" target="_blank" className="hover:scale-110 transition-transform">
              <img src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxsG72wAo9EWJR4yQWyJJaDaK1XdUso6cUMpI9hAdPUU_FNs11cY1X284vsHrnWtRw7oqRpN1m9YAg21d_aNKnIo-&format=source" className="w-8 h-8 object-contain" />
            </a>
            <a href="https://www.youtube.com/@somtank" target="_blank" className="hover:scale-110 transition-transform">
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png" className="w-8 h-8 object-contain" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
