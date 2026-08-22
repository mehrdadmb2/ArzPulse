// site/lib/nobitex.ts
const NOBITEX_API = 'https://apiv2.nobitex.ir/market/stats';
const DATA_REPO_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/data/latest.json';

export interface PriceItem {
  symbol: string;
  bestBuy: number;
  bestSell: number;
  lastPrice: number;
  change: number;
  volume: number;
  high: number;
  low: number;
}

export interface GoldData {
  perGram18K: number;
  usdtPrice: number;
}

export async function fetchLivePrices(): Promise<{ prices: PriceItem[]; gold: GoldData | null }> {
  try {
    const assets = [
      { src: 'btc', dst: 'rls', symbol: 'BTC' },
      { src: 'eth', dst: 'rls', symbol: 'ETH' },
      { src: 'usdt', dst: 'rls', symbol: 'USDT' },
      { src: 'not', dst: 'rls', symbol: 'NOT' },
      { src: 'xaut', dst: 'usdt', symbol: 'XAUT' }
    ];

    const results = await Promise.all(
      assets.map(async ({ src, dst, symbol }) => {
        const res = await fetch(`${NOBITEX_API}?srcCurrency=${src}&dstCurrency=${dst}`, {
          headers: { 'User-Agent': 'ArzPulse/1.0.0' },
          next: { revalidate: 60 }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return {
          symbol,
          bestBuy: parseFloat(data.stats.bestBuy),
          bestSell: parseFloat(data.stats.bestSell),
          lastPrice: parseFloat(data.stats.lastPrice),
          change: parseFloat(data.stats.change),
          volume: parseFloat(data.stats.volume),
          high: parseFloat(data.stats.high),
          low: parseFloat(data.stats.low)
        };
      })
    );

    const usdt = results.find(r => r.symbol === 'USDT');
    const xaut = results.find(r => r.symbol === 'XAUT');
    let gold: GoldData | null = null;
    if (usdt && xaut) {
      const usdtPrice = usdt.bestSell;
      const xautPrice = xaut.bestSell;
      const OUNCE_TO_GRAM = 31.1034768;
      const PURITY_18K = 0.750;
      const perGram18K = Math.round((xautPrice * usdtPrice / OUNCE_TO_GRAM) * PURITY_18K);
      gold = { perGram18K, usdtPrice };
    }

    return { prices: results, gold };
  } catch (error) {
    console.warn('Nobitex API failed, falling back to stored data:', error);
    return fetchStoredPrices();
  }
}

async function fetchStoredPrices(): Promise<{ prices: PriceItem[]; gold: GoldData | null }> {
  const res = await fetch(DATA_REPO_URL);
  if (!res.ok) throw new Error('Failed to fetch stored data');
  const data = await res.json();
  const { prices, gold18K, usdtPrice } = data;
  const priceItems: PriceItem[] = Object.entries(prices).map(([symbol, vals]: [string, any]) => ({
    symbol,
    bestBuy: vals.bestBuy || 0,
    bestSell: vals.bestSell || 0,
    lastPrice: vals.lastPrice || 0,
    change: vals.change || 0,
    volume: vals.volume || 0,
    high: vals.high || 0,
    low: vals.low || 0
  }));
  return {
    prices: priceItems,
    gold: gold18K ? { perGram18K: gold18K, usdtPrice: usdtPrice || 0 } : null
  };
}
