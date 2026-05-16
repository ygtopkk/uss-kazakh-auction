import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Timer, Gavel, Car, Search, ArrowRight, ChevronRight, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tg = window.Telegram.WebApp;

  useEffect(() => {
    tg.ready();
    tg.expand();
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auctions/active`);
      setAuctions(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError('Не удалось загрузить лоты');
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-KZ', {
      style: 'currency',
      currency: 'KZT',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getLotName = (auc) => {
    return `ЛОТ #${auc.id.slice(0, 4).toUpperCase()}`;
  };

  const handlePlaceBid = async () => {
    if (!tg.initDataUnsafe?.user?.id) {
      alert('Ошибка: Пользователь Telegram не определен');
      return;
    }

    if (!bidAmount || isNaN(bidAmount)) {
      alert('Введите корректную сумму');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/bid`, {
        tg_id: tg.initDataUnsafe.user.id,
        auction_id: selectedAuction.id,
        max_bid_amount: parseFloat(bidAmount)
      });

      if (response.data.status === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
        fetchAuctions();
        // Refresh selected auction
        const updatedRes = await axios.get(`${API_BASE_URL}/api/auction/${selectedAuction.id}`);
        setSelectedAuction(updatedRes.data);
        alert('Ставка принята!');
      }
    } catch (err) {
      tg.HapticFeedback.notificationOccurred('error');
      alert(err.response?.data?.detail || 'Ошибка при отправке ставки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAuctions = auctions.filter(a => 
    `${a.cars.make} ${a.cars.model}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
        <div className="text-zinc-400 font-medium">Загрузка лотов...</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto w-full min-h-screen relative bg-zinc-50 text-zinc-900 font-sans pb-10">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-zinc-100 p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight">USS KAZAKH</h1>
            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Premium Auto Auction</p>
          </div>
          <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded-md">
            LIVE: {auctions.length}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Поиск по марке или модели..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {filteredAuctions.length === 0 ? (
          <div className="text-center py-20">
            <Car size={48} className="mx-auto text-zinc-200 mb-4" />
            <p className="text-zinc-500 font-medium">Активных лотов не найдено</p>
          </div>
        ) : (
          filteredAuctions.map((auc) => (
            <div 
              key={auc.id}
              onClick={() => {
                setSelectedAuction(auc);
                setBidAmount(auc.current_price + auc.bid_step);
              }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 active:scale-[0.98] transition-transform flex items-center gap-4"
            >
              {/* Car Image */}
              <div className="aspect-[16/10] bg-zinc-100 relative">
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur shadow-sm px-3 py-1 rounded-full text-[10px] font-bold z-10">
                  LOT #{auc.id.slice(0, 4).toUpperCase()}
                </div>
                {auc.cars.images && auc.cars.images[0] ? (
                  <img 
                    src={auc.cars.images[0]} 
                    alt={`${auc.cars.make} ${auc.cars.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300">
                    <Car size={64} strokeWidth={1} />
                  </div>
                )}
              </div>

              {/* Brief Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold truncate pr-2">
                    {auc.cars.make} {auc.cars.model}
                  </h3>
                  <span className="text-zinc-400 text-xs shrink-0">{auc.cars.year_produced}</span>
                </div>
                
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-zinc-500 text-xs">
                    <Gavel size={12} />
                    <span>{formatPrice(auc.current_price)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500 text-[10px] font-mono font-bold">
                    <Timer size={10} />
                    <CountdownShort endAt={auc.end_at} />
                  </div>
                </div>
              </div>

              {/* Action Icon */}
              <div className="text-zinc-300">
                <ChevronRight size={20} />
              </div>
            </div>
          ))
        )}
      </main>

      {/* Detail Modal */}
      {selectedAuction && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <button onClick={() => setSelectedAuction(null)} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900">
              <X size={24} />
            </button>
            <h2 className="font-bold">Детали лота</h2>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 overflow-y-auto pb-40">
            <div className="aspect-video bg-zinc-100 flex items-center justify-center text-zinc-300 relative">
              {selectedAuction.cars.images && selectedAuction.cars.images[0] ? (
                <img 
                  src={selectedAuction.cars.images[0]} 
                  alt="Car"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Car size={80} strokeWidth={1} />
              )}
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-black mb-1">{selectedAuction.cars.make} {selectedAuction.cars.model}</h1>
                <p className="text-zinc-500 font-medium">{selectedAuction.cars.year_produced} год выпуска</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">VIN</p>
                  <p className="font-mono text-xs font-bold">{selectedAuction.cars.vin || '—'}</p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Пробег</p>
                  <p className="font-bold">{selectedAuction.cars.mileage ? `${selectedAuction.cars.mileage.toLocaleString()} км` : '—'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold flex items-center gap-2">
                  <Search size={18} className="text-zinc-400" />
                  Отчет об инспекции
                </h4>
                <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-100 text-sm leading-relaxed text-zinc-600">
                  {selectedAuction.cars.inspection_report || 'Отчет не предоставлен'}
                </div>
              </div>

              {selectedAuction.cars.uss_report_img && (
                <div className="space-y-4 mt-8">
                  <h4 className="font-bold flex items-center gap-2">
                    <BookOpen size={18} className="text-zinc-400" />
                    Фото USS отчета
                  </h4>
                  <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm">
                    <img 
                      src={selectedAuction.cars.uss_report_img} 
                      alt="USS Report"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bid Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-zinc-100 max-w-md mx-auto">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Текущая цена</p>
                <p className="text-2xl font-black">{formatPrice(selectedAuction.current_price)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Шаг</p>
                <p className="font-bold text-sm">+{formatPrice(selectedAuction.bid_step)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-zinc-100 rounded-2xl px-4 py-4 flex items-center gap-2 border border-zinc-200 focus-within:border-zinc-900 transition-colors">
                <span className="text-zinc-400 font-bold">₸</span>
                <input 
                  type="number" 
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="bg-transparent w-full outline-none font-black text-lg"
                  placeholder="Ваша макс. ставка"
                />
              </div>
              <button 
                onClick={handlePlaceBid}
                disabled={isSubmitting}
                className="bg-zinc-900 text-white px-8 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? '...' : 'СТАВКА'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Countdown({ endAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const end = new Date(endAt).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Завершен');
        clearInterval(timer);
        return;
      }

      const h = Math.floor(distance / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h > 0 ? h + ':' : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  return <p className="text-sm font-black font-mono">{timeLeft}</p>;
}

function CountdownShort({ endAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const end = new Date(endAt).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('END');
        clearInterval(timer);
        return;
      }

      const h = Math.floor(distance / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      
      if (h > 0) {
        setTimeLeft(`${h}h ${m}m`);
      } else {
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  return <span>{timeLeft}</span>;
}

export default App;
