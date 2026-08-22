// site/app/components/GoldPrice.tsx
import { GoldData } from '@/lib/nobitex';

export default function GoldPrice({ data, className = '' }: { data: GoldData; className?: string }) {
  return (
    <div className={`relative backdrop-blur-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-400/30 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="text-white/60 text-sm">قیمت هر گرم طلای ۱۸ عیار</p>
          <p className="text-3xl font-bold text-amber-300">{data.perGram18K.toLocaleString()} <span className="text-base font-normal text-white/50">ریال</span></p>
        </div>
        <div className="ml-auto text-white/40 text-sm">
          نرخ تتر: {data.usdtPrice.toLocaleString()} ریال
        </div>
      </div>
    </div>
  );
}
