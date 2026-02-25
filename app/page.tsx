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
      try {
        const { data, error } = await supabase
          .from('restock_logs')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        if (data) setItems(data);
      } catch (err) {
        console.error("Error fetching:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // ฟังการเปลี่ยนแปลงแบบ Real-time (แก้ไข Type Error แล้ว)
    const channel = supabase.channel('realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload: any) => {
        const newData = payload.new;
        if (!newData) return;

        setItems((prev) => {
          const exists = prev.find(i => i.item_name === newData.item_name);
          if (exists) {
            return prev.map(i => i.item_name === newData.item_name ? newData : i);
          }
          return [newData, ...prev];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-['Kanit'] antialiased relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] -z-10"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-[900] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 italic tracking-tighter uppercase">
              Restock Nexus
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Live Tracking Active</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs italic">Total Items: {items.length}</p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="text-center py-32 bg-slate-900/20 border border-dashed border-slate-800 rounded-[3rem]">
            <p className="text-slate-500 font-medium">Waiting for data from Executor...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.item_name} className="group bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 p-7 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:border-blue-500/50 hover:translate-y-[-8px]">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/5">
                    {item.shop_type?.includes('Seed') ? '🌱' : '⚙️'}
                  </div>
                  <div className={`text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest border ${
                    item.current_stock > 0 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {item.current_stock > 0 ? 'READY' : 'EMPTY'}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors tracking-tight">{item.item_name}</h2>
                <p className="text-[10px] text-slate-500 mb-8 uppercase font-bold tracking-[0.15em] opacity-60">{item.shop_type || 'General Shop'}</p>
                
                <div className="space-y-5">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Price</span>
                    <span className="text-2xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                      <span className="text-xs mr-1 text-amber-500/50">R$</span>
                      {Number(item.price || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-black tracking-widest">
                      <span className="text-slate-500">Stock Available</span>
                      <span className={item.current_stock < 5 ? 'text-orange-400' : 'text-blue-400'}>
                        {item.current_stock} / {item.max_stock}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-[2px] border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px] ${
                          item.current_stock < 5 ? 'bg-orange-500 shadow-orange-500/50' : 'bg-blue-600 shadow-blue-500/50'
                        }`}
                        style={{ width: `${Math.min(((item.current_stock || 0) / (item.max_stock || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest italic">
                   <span className="text-slate-600">
                    Sync: {item.updated_at ? new Date(item.updated_at).toLocaleTimeString('th-TH') : '---'}
                   </span>
                   <span className="text-blue-500/50 group-hover:text-blue-400 transition-colors">Details ↗</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
