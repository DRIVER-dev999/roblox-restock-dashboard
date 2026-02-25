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

        const channel = supabase.channel('realtime_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restock_logs' }, (payload) => {
                setItems((prev) => {
                    const exists = prev.find(i => i.item_name === payload.new.item_name);
                    if (exists) {
                        return prev.map(i => i.item_name === payload.new.item_name ? payload.new : i);
                    }
                    return [payload.new, ...prev];
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
        <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans antialiased">
            {/* Background Decor */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10"></div>

            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 italic tracking-tighter">
                        ROBLOX RESTOCK NEXUS
                    </h1>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Live Monitor Active</p>
                    </div>
                </header>

                {items.length === 0 ? (
                    <div className="text-center p-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                        <p className="text-slate-500">No data received from Executor yet...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => (
                            <div key={item.item_name} className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:border-blue-500/50 hover:translate-y-[-4px]">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                                        {item.shop_type?.includes('Seed') ? '🌱' : '⚙️'}
                                    </div>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-tighter ${item.current_stock > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {item.current_stock > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{item.item_name}</h2>
                                <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest">{item.shop_type || 'Unknown Shop'}</p>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Price</span>
                                        <span className="text-xl font-black text-amber-400">
                                            <span className="text-xs mr-1 text-amber-500/50">R$</span>
                                            {(item.price || 0).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex justify-between text-[10px] mb-2 uppercase font-bold tracking-widest">
                                            <span className="text-slate-500">Inventory Status</span>
                                            <span className={item.current_stock < 5 ? 'text-orange-400' : 'text-slate-300'}>
                                                {item.current_stock} / {item.max_stock}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_12px] ${item.current_stock < 5 ? 'bg-orange-500 shadow-orange-500/40' : 'bg-blue-500 shadow-blue-500/40'}`}
                                                style={{ width: `${Math.min(((item.current_stock || 0) / (item.max_stock || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">
                                        {item.updated_at ? new Date(item.updated_at).toLocaleTimeString() : '---'}
                                    </span>
                                    <button className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest">
                                        Details →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
