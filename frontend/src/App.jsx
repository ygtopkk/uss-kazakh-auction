import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tg = window.Telegram.WebApp;

  useEffect(() => {
    tg.ready();
    tg.expand();
    fetchAuction();
  }, []);

  useEffect(() => {
    if (!auction) return;

    const timer = setInterval(() => {
      const end = new Date(auction.end_at).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Аукцион завершен');
        clearInterval(timer);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [auction]);

  const fetchAuction = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auction/active`);
      setAuction(response.data);
      setBidAmount(response.data.current_price + response.data.bid_step);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching auction:', err);
      setError('Нет активных аукционов на данный момент');
      setLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!tg.initDataUnsafe?.user?.id) {
      alert('Ошибка: Пользователь Telegram не определен');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/bid`, {
        tg_id: tg.initDataUnsafe.user.id,
        auction_id: auction.id,
        max_bid_amount: parseFloat(bidAmount)
      });

      if (response.data.status === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
        fetchAuction(); // Refresh data
        alert('Ставка принята!');
      }
    } catch (err) {
      tg.HapticFeedback.notificationOccurred('error');
      alert(err.response?.data?.detail || 'Ошибка при отправке ставки');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="animate-pulse text-zinc-400">Загрузка...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="text-zinc-900 text-center p-6">
        <h2 className="text-xl font-semibold mb-2">Упс!</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  const car = auction.cars;

  return (
    <div className="max-w-md mx-auto w-full min-h-screen relative shadow-2xl bg-white text-zinc-900 font-sans pb-40">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100">
        <h1 className="text-2xl font-bold tracking-tight">USS Kazakh</h1>
        <p className="text-zinc-500 text-sm">Автомобильный аукцион</p>
      </div>

      {/* Car Image Placeholder */}
      <div className="w-full aspect-video bg-zinc-100 flex items-center justify-center">
        <span className="text-zinc-300">Изображение автомобиля</span>
      </div>

      {/* Car Info */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{car.make} {car.model}</h2>
            <p className="text-zinc-500">{car.year_produced} год</p>
          </div>
          <div className="bg-zinc-900 text-white px-3 py-1 rounded-full text-xs font-medium">
            Active
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
            <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2">Отчет об инспекции</h3>
            <p className="text-sm text-zinc-700 leading-relaxed">
              {car.inspection_report || 'Отчет не предоставлен'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <span className="text-xs text-zinc-400 block mb-1">Стартовая цена</span>
              <span className="font-semibold">${auction.start_price.toLocaleString()}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <span className="text-xs text-zinc-400 block mb-1">Шаг ставки</span>
              <span className="font-semibold">${auction.bid_step.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-zinc-100 p-6 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-xs text-zinc-400 block mb-1 uppercase tracking-wider">Текущая цена</span>
            <span className="text-3xl font-black">${auction.current_price.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400 block mb-1 uppercase tracking-wider">До конца</span>
            <span className="text-xl font-mono font-bold">{timeLeft}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center bg-zinc-100 rounded-2xl px-4 py-3 border border-zinc-200 focus-within:border-zinc-900 transition-colors">
            <span className="text-zinc-400 mr-2">$</span>
            <input 
              type="number" 
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="bg-transparent w-full outline-none font-bold text-lg"
              placeholder="Ваша макс. ставка"
            />
          </div>

          <button 
            onClick={handlePlaceBid}
            disabled={isSubmitting || timeLeft === 'Аукцион завершен'}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] ${
              isSubmitting || timeLeft === 'Аукцион завершен'
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {isSubmitting ? 'Отправка...' : 'Сделать ставку'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
