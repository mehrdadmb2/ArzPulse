// site/app/components/PriceCard.tsx
import { PriceItem } from '@/lib/nobitex';

interface Props {
  data: PriceItem;
  index: number;
}

export default function PriceCard({ data }: Props) {
  const isPositive = data.change >= 0;
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-gold-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-pink-500/5 to-purple-600/5 rounded-2xl -z-10" />

      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-bold text-xl">{data.symbol}</h3>
          <span className="text-white/40 text-xs">IRT</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'}`}>
          {arrow} {Math.abs(data.change).toFixed(2)}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-white/40">خرید</p>
          <p className="text-emerald-300 font-mono">{data.bestBuy.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-white/40">فروش</p>
          <p className="text-rose-300 font-mono">{data.bestSell.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3 text-right">
        <span className="text-2xl font-mono font-bold text-white">
          {data.lastPrice.toLocaleString()}
        </span>
        <span className="text-white/40 text-xs mr-1">ریال</span>
      </div>
    </div>
  );
}
