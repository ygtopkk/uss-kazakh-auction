import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Car, Gavel, Users, TrendingUp, X } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [auctions, setAuctions] = useState([]);
  const [stats, setStats] = useState({ total_auctions: 0, total_bids: 0, total_users: 0 });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year_produced: 2024,
    inspection_report: '',
    start_price: 1000,
    reserve_price: 5000,
    bid_step: 100,
    duration_hours: 24
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [auctionsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/auctions`),
        axios.get(`${API_BASE_URL}/api/admin/stats`)
      ]);
      setAuctions(auctionsRes.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setLoading(false);
    }
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    try {
      // 1. Create Car
      const carRes = await axios.post(`${API_BASE_URL}/api/admin/cars`, {
        make: formData.make,
        model: formData.model,
        year_produced: parseInt(formData.year_produced),
        inspection_report: formData.inspection_report
      });

      // 2. Create Auction
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + formData.duration_hours * 60 * 60 * 1000);

      await axios.post(`${API_BASE_URL}/api/admin/auctions`, {
        car_id: carRes.data.id,
        start_price: parseFloat(formData.start_price),
        reserve_price: parseFloat(formData.reserve_price),
        bid_step: parseFloat(formData.bid_step),
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString()
      });

      setShowModal(false);
      fetchData();
      alert('Лот успешно создан!');
    } catch (err) {
      alert('Ошибка при создании лота');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этот аукцион?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/auctions/${id}`);
      fetchData();
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar / Topbar */}
      <nav className="bg-white border-b border-zinc-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">USS Admin</h1>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-all font-medium text-sm"
        >
          <Plus size={18} /> Создать лот
        </button>
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard icon={<Gavel className="text-zinc-500" />} label="Всего лотов" value={stats.total_auctions} />
          <StatCard icon={<TrendingUp className="text-zinc-500" />} label="Всего ставок" value={stats.total_bids} />
          <StatCard icon={<Users className="text-zinc-500" />} label="Пользователей" value={stats.total_users} />
        </div>

        {/* Auctions List */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="font-bold text-zinc-600 uppercase text-xs tracking-widest">Активные и прошлые лоты</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-400 text-sm border-b border-zinc-100">
                  <th className="px-6 py-4 font-medium">Автомобиль</th>
                  <th className="px-6 py-4 font-medium">Цена</th>
                  <th className="px-6 py-4 font-medium">Статус</th>
                  <th className="px-6 py-4 font-medium">Окончание</th>
                  <th className="px-6 py-4 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {auctions.map((auc) => (
                  <tr key={auc.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">{auc.cars.make} {auc.cars.model}</div>
                      <div className="text-xs text-zinc-400">{auc.cars.year_produced} г.</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">${auc.current_price.toLocaleString()}</div>
                      <div className="text-xs text-zinc-400">Шаг: ${auc.bid_step}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        auc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {auc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(auc.end_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(auc.id)}
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Новый аукционный лот</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-900"><X /></button>
            </div>
            <form onSubmit={handleCreateLot} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Марка" value={formData.make} onChange={v => setFormData({...formData, make: v})} />
                <Input label="Модель" value={formData.model} onChange={v => setFormData({...formData, model: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Год выпуска" type="number" value={formData.year_produced} onChange={v => setFormData({...formData, year_produced: v})} />
                <Input label="Длительность (часов)" type="number" value={formData.duration_hours} onChange={v => setFormData({...formData, duration_hours: v})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Старт ($)" type="number" value={formData.start_price} onChange={v => setFormData({...formData, start_price: v})} />
                <Input label="Резерв ($)" type="number" value={formData.reserve_price} onChange={v => setFormData({...formData, reserve_price: v})} />
                <Input label="Шаг ($)" type="number" value={formData.bid_step} onChange={v => setFormData({...formData, bid_step: v})} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Отчет об инспекции</label>
                <textarea 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 outline-none focus:border-zinc-900 transition-colors h-24 text-sm"
                  value={formData.inspection_report}
                  onChange={e => setFormData({...formData, inspection_report: e.target.value})}
                />
              </div>
              <button className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all mt-4">
                Создать аукцион
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-black">{value}</div>
      </div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">{label}</label>
      <input 
        type={type}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 outline-none focus:border-zinc-900 transition-colors text-sm font-medium"
        value={value}
        onChange={e => onChange(e.target.value)}
        required
      />
    </div>
  );
}

export default App;
