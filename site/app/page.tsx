// site/app/page.tsx
import { fetchLivePrices } from '@/lib/nobitex';
import PriceCard from './components/PriceCard';
import GoldPrice from './components/GoldPrice';

export default async function Home() {
  const { prices, gold } = await fetchLivePrices();
  const filtered = prices.filter(p => p.symbol !== 'XAUT');

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">
            ArzPulse
          </h1>
          <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-full text-sm animate-pulse">
            🔴 زنده
          </span>
        </header>

        {gold && <GoldPrice data={gold} className="mb-8" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((item, idx) => (
            <PriceCard key={item.symbol} data={item} index={idx} />
          ))}
        </div>
      </div>
    </main>
  );
}
