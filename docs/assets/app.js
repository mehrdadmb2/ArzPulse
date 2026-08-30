(() => {
  'use strict';

  const BASE = location.pathname.includes('/ArzPulse/') ? '/ArzPulse' : '';
  const DATA_URL = `${BASE}/data/latest.json`;
  const HISTORY_BASE = `${BASE}/data/history/`;

  const LOGOS = {
    BTC: 'https://cdn.simpleicons.org/bitcoin/F7931A',
    ETH: 'https://cdn.simpleicons.org/ethereum/627EEA',
    USDT: 'https://cdn.simpleicons.org/tether/50AF95',
    NOT: 'https://cdn.simpleicons.org/notcoin/F4F4F5',
    GOLD: 'https://cdn.simpleicons.org/medal/F7C75B',
    DOLLAR: 'https://cdn.simpleicons.org/usdollar/35D39B',
    BRENT: 'https://cdn.simpleicons.org/shell/F0B52D',
    WTI: 'https://cdn.simpleicons.org/oil/E9A92A',
    XAUUSD: 'https://cdn.simpleicons.org/gold/FFD75A',
    SILVER: 'https://cdn.simpleicons.org/metalsilver/B7C1CB',
    SP500: 'https://cdn.simpleicons.org/stock/8FA7BA',
    NASDAQ: 'https://cdn.simpleicons.org/nasdaq/49B6E8',
    DXY: 'https://cdn.simpleicons.org/usd/49D17D'
  };

  const META = {
    BTC: { name: 'بیت‌کوین', short: 'BTC', cat: 'crypto', color: '#F7931A', unit: 'ریال' },
    ETH: { name: 'اتریوم', short: 'ETH', cat: 'crypto', color: '#627EEA', unit: 'ریال' },
    USDT: { name: 'تتر', short: 'USDT', cat: 'crypto', color: '#50AF95', unit: 'ریال' },
    NOT: { name: 'نات‌کوین', short: 'NOT', cat: 'crypto', color: '#F4F4F5', unit: 'ریال' },
    GOLD: { name: 'طلای ۱۸ عیار', short: 'GOLD', cat: 'commodity', color: '#F7C75B', unit: 'ریال' },
    DOLLAR: { name: 'دلار / تتر', short: 'USD/USDT', cat: 'index', color: '#35D39B', unit: 'ریال' },
    BRENT: { name: 'نفت برنت', short: 'BRENT', cat: 'commodity', color: '#F0B52D', unit: 'USD/bbl' },
    WTI: { name: 'نفت WTI', short: 'WTI', cat: 'commodity', color: '#E9A92A', unit: 'USD/bbl' },
    XAUUSD: { name: 'انس جهانی طلا', short: 'XAU/USD', cat: 'commodity', color: '#FFD75A', unit: 'USD/oz' },
    SILVER: { name: 'نقره', short: 'XAG/USD', cat: 'commodity', color: '#B7C1CB', unit: 'USD/oz' },
    SP500: { name: 'S&P 500', short: 'SPX', cat: 'index', color: '#8FA7BA', unit: 'index pts' },
    NASDAQ: { name: 'Nasdaq', short: 'NDX', cat: 'index', color: '#49B6E8', unit: 'index pts' },
    DXY: { name: 'شاخص دلار', short: 'DXY', cat: 'index', color: '#49D17D', unit: 'index pts' }
  };

  const DEFAULT_ASSETS = ['BTC','ETH','USDT','NOT','GOLD','DOLLAR','BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'];
  const GLOBAL_KEYS = new Set(['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY']);
  const KEY_ALIASES = {
    BTC: ['BTC','BTCUSDT','BTC_USDT'],
    ETH: ['ETH','ETHUSDT','ETH_USDT'],
    USDT: ['USDT','TETHER'],
    NOT: ['NOT','NOTCOIN'],
    XAUUSD: ['XAUUSD','XAU_USD','GOLDUSD','XAU'],
    SILVER: ['SILVER','XAGUSD','XAG_USD','XAG'],
    SP500: ['SP500','SPX','^GSPC'],
    NASDAQ: ['NASDAQ','NDX','^IXIC'],
    DXY: ['DXY','DX-Y.NYB']
  };

  let currency = localStorage.getItem('arzpulse_currency') || 'IRR';
  let density = localStorage.getItem('arzpulse_density') || 'comfortable';
  let theme = localStorage.getItem('arzpulse_theme') || 'dark';
  let activeFilter = 'all';
  let latest = null;
  let history = [];
  let chartAsset = 'BTC';
  let chartRange = '7d';
  let mainChart = null;
  let watchlist = loadWatchlist();
  let selectedAsset = null;
  const sparkCharts = new Map();

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const asNum = (n) => {
    if (n === null || n === undefined || n === '') return 0;
    if (typeof n === 'string') return Number(n.replace(/,/g, '').replace(/٬/g, '').trim()) || 0;
    return Number(n) || 0;
  };
  const fa = (n) => asNum(n).toLocaleString('fa-IR');
  const num = (n, max = 2) => asNum(n).toLocaleString('en-US', { maximumFractionDigits: max, minimumFractionDigits: 0 });
  const pct = (n) => `${asNum(n) > 0 ? '+' : ''}${asNum(n).toFixed(2)}%`;
  const safeDate = (iso) => { try { return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)); } catch { return '—'; } };
  const age = (iso) => {
    const t = new Date(iso).getTime(); if (!Number.isFinite(t)) return '—';
    const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
    if (m < 1) return 'همین الان'; if (m < 60) return `${fa(m)} دقیقه پیش`;
    const h = Math.floor(m / 60); if (h < 24) return `${fa(h)} ساعت پیش`; return `${fa(Math.floor(h / 24))} روز پیش`;
  };
  const changeClass = (c) => asNum(c) > 0 ? 'up' : asNum(c) < 0 ? 'down' : 'neutral';
  const changeHTML = (c) => `<span class="change ${changeClass(c)}">${pct(c)}</span>`;
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 2400); };

  function loadWatchlist() { try { const v = JSON.parse(localStorage.getItem('arzpulse_watchlist') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
  function canonicalRaw(key) {
    const pools = [latest?.prices, latest?.market, latest?.markets, latest?.assets, latest?.symbols];
    const aliases = KEY_ALIASES[key] || [key];
    for (const pool of pools) {
      if (!pool || typeof pool !== 'object') continue;
      for (const alias of aliases) if (pool[alias] !== undefined) return pool[alias];
      const wanted = aliases.map(x => String(x).toLowerCase());
      const found = Object.keys(pool).find(k => wanted.includes(String(k).toLowerCase()));
      if (found) return pool[found];
    }
    return null;
  }
  function pick(...vals) { for (const v of vals) { const n = asNum(v); if (n !== 0) return n; } return 0; }
  function percentFrom(raw, last) {
    return pick(raw?.change, raw?.changePercent, raw?.percentChange, raw?.dailyChange, raw?.dayChange, last && raw?.previous ? ((last / asNum(raw.previous)) - 1) * 100 : 0);
  }
  function logoHTML(key) {
    const m = META[key]; const url = LOGOS[key] || '';
    return `<span class="asset-logo" style="--asset-color:${m.color}"><img src="${url}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>${m.short.slice(0,2)}</span></span>`;
  }
  function normalizeAsset(key) {
    if (!latest) return null;
    if (key === 'DOLLAR') {
      const raw = canonicalRaw('USDT') || latest.usdt || {};
      const last = pick(latest.dollarPrice, latest.usdtPrice, raw.last, raw.lastPrice, raw.latest, raw.bestSell, raw.price);
      return { last, change: pick(latest.dollarChange, latest.usdtChange, percentFrom(raw,last)), high: pick(raw.high,raw.dayHigh,raw.highest,latest.dollarHigh), low: pick(raw.low,raw.dayLow,raw.lowest,latest.dollarLow), volume: pick(raw.volume,raw.baseVolume,raw.quoteVolume), quoteVolume: pick(raw.quoteVolume), open: pick(raw.open,raw.openPrice), prevClose: pick(raw.prevClose,raw.previousClose,raw.previous), bestBuy: pick(raw.bestBuy,raw.buy), bestSell: pick(raw.bestSell,raw.sell), source: 'Nobitex', timestamp: raw.timestamp || latest.timestamp, delayed: Boolean(raw.delayed) };
    }
    if (key === 'GOLD') {
      const raw = canonicalRaw('XAUUSD') || latest.prices?.XAUT || latest.XAUT || {};
      const rate = pick(latest.usdtPrice,latest.dollarPrice,latest.usdIrr);
      const last = pick(latest.gold18K,latest.gold18k,latest.goldPrice);
      const factor = 31.1034768 / 0.75;
      const rawHigh = pick(raw.high,raw.dayHigh,raw.highest);
      const rawLow = pick(raw.low,raw.dayLow,raw.lowest);
      return { last, change: pick(latest.goldChange,percentFrom(raw,last)), high: last && rawHigh && rate ? rawHigh * rate / factor : 0, low: last && rawLow && rate ? rawLow * rate / factor : 0, volume: pick(raw.volume,raw.quoteVolume), quoteVolume: pick(raw.quoteVolume), open: pick(raw.open), prevClose: pick(raw.prevClose,raw.previous), bestBuy: pick(raw.bestBuy), bestSell: pick(raw.bestSell), source:'Nobitex', timestamp:raw.timestamp || latest.timestamp, delayed:Boolean(raw.delayed) };
    }
    const raw = canonicalRaw(key);
    if (!raw) return null;
    const last = pick(raw.last,raw.lastPrice,raw.latest,raw.price,raw.close,raw.regularMarketPrice);
    return {
      last,
      change: percentFrom(raw,last),
      high: pick(raw.high,raw.dayHigh,raw.highest,raw.regularMarketDayHigh),
      low: pick(raw.low,raw.dayLow,raw.lowest,raw.regularMarketDayLow),
      volume: pick(raw.volume,raw.baseVolume,raw.regularMarketVolume),
      quoteVolume: pick(raw.quoteVolume),
      open: pick(raw.open,raw.openPrice,raw.regularMarketOpen),
      prevClose: pick(raw.prevClose,raw.previousClose,raw.previous,raw.regularMarketPreviousClose),
      bestBuy: pick(raw.bestBuy,raw.buy,raw.bid),
      bestSell: pick(raw.bestSell,raw.sell,raw.ask),
      source: GLOBAL_KEYS.has(key) ? 'Yahoo Finance' : 'Nobitex',
      timestamp: raw.timestamp || raw.time || latest.timestamp,
      delayed: Boolean(raw.delayed) || GLOBAL_KEYS.has(key)
    };
  }
  function getHistoryValue(key,row) {
    if (key === 'GOLD') return pick(row.GOLD18K,row.gold18K,row.GOLD);
    if (key === 'DOLLAR') return pick(row.DOLLAR,row.dollar,row.USDT);
    const aliases = KEY_ALIASES[key] || [key];
    for (const a of aliases) if (row[a] !== undefined) return asNum(row[a]);
    return 0;
  }
  function seriesFor(key) { return history.map(r => getHistoryValue(key,r)).filter(v => Number.isFinite(v) && v > 0).slice(-1440); }
  function isGlobal(key) { return GLOBAL_KEYS.has(key); }
  function displayPrice(v,key) {
    const n = asNum(v); if (!n) return '—';
    if (isGlobal(key)) return `$${num(n,key==='DXY'?3:2)}`;
    if (currency === 'USD') { const rate = pick(latest?.dollarPrice,latest?.usdtPrice); return rate > 0 ? `$${num(n/rate,key==='NOT'?6:2)}` : `${fa(n)} ریال`; }
    return `${fa(n)} ریال`;
  }
  function displayRawValue(v,key) { if (!asNum(v)) return '—'; return isGlobal(key) ? num(v,key==='DXY'?3:2) : fa(v); }
  function displayVolume(v) { return asNum(v) ? num(v,0) : '—'; }

  function setTheme() { document.body.classList.toggle('light', theme==='light'); $('#themeBtn i').className = theme==='light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'; }
  function setDensity() { document.body.classList.toggle('compact', density==='compact'); $$('#densityToggle button').forEach(b => b.classList.toggle('active', b.dataset.density===density)); }
  function setCurrency() { $$('#currencyToggle button').forEach(b => b.classList.toggle('active', b.dataset.currency===currency)); }

  function overviewTile(label, key, icon) {
    const a = normalizeAsset(key); const m = META[key]; if (!a?.last) return '';
    return `<button class="overview-tile" type="button" data-open-overview="${key}" style="--asset-color:${m.color}">
      <span class="overview-icon">${icon}</span><span class="overview-name"><small>${label}</small><b>${displayPrice(a.last,key)}</b></span>${changeHTML(a.change)}<span class="overview-spark"><canvas data-overview-spark="${key}"></canvas></span>
    </button>`;
  }
  function renderOverview() {
    const items = [
      overviewTile('دلار / تتر','DOLLAR','<i class="fa-solid fa-dollar-sign"></i>'),
      overviewTile('طلای ۱۸ عیار','GOLD','<i class="fa-solid fa-coins"></i>'),
      overviewTile('بیت‌کوین','BTC','<i class="fa-brands fa-bitcoin"></i>'),
      overviewTile('نفت برنت','BRENT','<i class="fa-solid fa-oil-well"></i>'),
      overviewTile('انس طلا','XAUUSD','<i class="fa-solid fa-ring"></i>'),
      overviewTile('S&P 500','SP500','<i class="fa-solid fa-chart-line"></i>')
    ];
    $('#overviewGrid').innerHTML = items.filter(Boolean).join('') || '<div class="empty">Snapshot فعلی داده‌ای ندارد.</div>';
    $$('#overviewGrid [data-open-overview]').forEach(b => b.addEventListener('click', () => openDetail(b.dataset.openOverview)));
    $$('#overviewGrid [data-overview-spark]').forEach(c => drawSpark(c, seriesFor(c.dataset.overviewSpark), META[c.dataset.overviewSpark].color));
  }

  function marketCard(key) {
    const a = normalizeAsset(key), m = META[key]; if (!a?.last) return '';
    const fav = watchlist.includes(key); const spread = a.bestSell > 0 && a.bestBuy > 0 ? a.bestSell - a.bestBuy : 0;
    const s = seriesFor(key);
    return `<article class="market-card" data-key="${key}" style="--asset-color:${m.color}">
      <button class="card-hit" data-open="${key}" aria-label="جزئیات ${m.name}"></button>
      <div class="market-head"><div class="asset-title">${logoHTML(key)}<span><b>${m.name}</b><small>${m.short} · ${m.unit}</small></span></div><button class="favorite ${fav?'active':''}" type="button" data-fav="${key}" aria-label="واچ‌لیست">★</button></div>
      <div class="market-price"><strong>${displayPrice(a.last,key)}</strong>${changeHTML(a.change)}</div>
      <div class="market-meta">
        <div><span>بیشترین</span><b>${a.high ? displayPrice(a.high,key) : '—'}</b></div>
        <div><span>کمترین</span><b>${a.low ? displayPrice(a.low,key) : '—'}</b></div>
        <div><span>حجم</span><b>${displayVolume(a.volume)}</b></div>
        <div><span>اسپرد</span><b>${spread ? displayPrice(spread,key) : '—'}</b></div>
      </div>
      <div class="card-mid"><span>${a.open ? `بازگشایی ${displayPrice(a.open,key)}` : `بهترین خرید ${a.bestBuy ? displayPrice(a.bestBuy,key) : '—'}`}</span><span>${a.bestSell ? `فروش ${displayPrice(a.bestSell,key)}` : `منبع ${a.source}`}</span></div>
      <div class="card-footer"><span>${a.source}${a.delayed?' · با تأخیر':''}</span><span class="fresh"><i class="fa-regular fa-clock"></i>${a.timestamp ? age(a.timestamp) : '—'}</span></div>
      <div class="card-spark"><canvas data-spark="${key}"></canvas></div>
    </article>`;
  }
  function renderMarkets() {
    const keys = DEFAULT_ASSETS.filter(k => (activeFilter==='all'||META[k].cat===activeFilter) && normalizeAsset(k)?.last);
    $('#marketGrid').innerHTML = keys.map(marketCard).join('') || '<div class="empty glass">داده‌ای برای این فیلتر در Snapshot فعلی وجود ندارد.</div>';
    $$('#marketGrid [data-fav]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); toggleWatch(btn.dataset.fav); }));
    $$('#marketGrid [data-open]').forEach(btn => btn.addEventListener('click', () => openDetail(btn.dataset.open)));
    keys.forEach(k => drawSpark(document.querySelector(`[data-spark="${k}"]`), seriesFor(k), META[k].color));
    bindCardMotion();
  }
  function renderTicker() {
    const items = DEFAULT_ASSETS.map(k => { const a=normalizeAsset(k),m=META[k]; if(!a?.last)return ''; return `<div class="ticker-item" data-open-ticker="${k}">${logoHTML(k)}<span>${m.short}</span><b>${displayPrice(a.last,k)}</b>${changeHTML(a.change)}</div>`; }).join('');
    $('#tickerTrack').innerHTML = items + items;
    $$('#tickerTrack [data-open-ticker]').forEach(x => x.addEventListener('click', () => openDetail(x.dataset.openTicker)));
  }
  function renderStats() {
    const values = DEFAULT_ASSETS.map(k => normalizeAsset(k)).filter(Boolean);
    const withChange = values.filter(a => Number.isFinite(a.change));
    const gain = withChange.filter(a => a.change > 0).length; const loss = withChange.filter(a => a.change < 0).length;
    const avg = withChange.length ? withChange.reduce((s,a)=>s+a.change,0)/withChange.length : 0;
    const best = values.sort((a,b)=>b.change-a.change)[0]; const worst = values.sort((a,b)=>a.change-b.change)[0];
    const rows = [['دارایی‌های فعال', `${fa(values.filter(a=>a.last).length)}`],['مثبت','+'+fa(gain)],['منفی',fa(loss)],['میانگین تغییر',pct(avg)],['بهترین امروز',best?.change ? pct(best.change) : '—'],['ضعیف‌ترین امروز',worst?.change ? pct(worst.change) : '—']];
    $('#statsList').innerHTML = rows.map(([l,v])=>`<div class="stats-row"><span>${l}</span><b class="${l.includes('تغییر')||l.includes('بهترین')||l.includes('ضعیف')?changeClass(String(v).replace('%','')):''}">${v}</b></div>`).join('');
  }
  function renderWatchlist() {
    const valid = watchlist.map(k=>({k,a:normalizeAsset(k)})).filter(x=>x.a?.last);
    $('#watchlist').innerHTML = valid.length ? valid.map(({k,a})=>`<button class="watch-row" data-watch="${k}"><span>${logoHTML(k)}<b>${META[k].short}</b></span><span>${displayPrice(a.last,k)} <em class="${changeClass(a.change)}">${pct(a.change)}</em></span></button>`).join('') : '<div class="watch-empty">هنوز موردی به واچ‌لیست اضافه نشده.</div>';
    $$('#watchlist [data-watch]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.watch)));
  }
  function renderHealth() {
    const t = latest?.timestamp; const minutes = t ? Math.max(0, Math.floor((Date.now()-new Date(t).getTime())/60000)) : 99999; const stale = minutes > 8;
    const dot = $('#healthDot'); dot.classList.toggle('bad', stale || Boolean(latest?.hasError));
    $('#healthAge').textContent = t ? age(t) : '—'; $('#healthText').textContent = !latest ? 'داده‌ای بارگذاری نشده.' : latest.hasError ? `Snapshot دریافت شده ولی ${fa(latest.errorDetails?.length||0)} مورد هشدار دارد.` : stale ? 'Snapshot نسبتاً قدیمی است؛ Worker یا Action را بررسی کن.' : 'داده‌ها تازه و قابل استفاده‌اند.';
    $('#connectionPill').classList.toggle('warning', stale || Boolean(latest?.hasError)); $('#connectionPill b').textContent = stale ? 'داده قدیمی' : latest?.hasError ? 'هشدار داده' : 'متصل';
    $('#overviewStatus').textContent = stale ? 'تأخیر' : latest?.hasError ? 'هشدار' : 'متصل'; $('#overviewUpdated').textContent = t ? age(t) : '—';
  }
  function renderComparison() {
    const keys = ['BTC','ETH','GOLD','BRENT','XAUUSD','DXY'];
    const html = keys.map(k=>{const s=seriesFor(k);if(s.length<2)return '';const start=s[0];const ret=start>0?(s.at(-1)/start-1)*100:0;const width=Math.min(100,Math.max(5,Math.abs(ret)*7));return `<div class="compare-item"><div class="c-top">${logoHTML(k)}<span>${META[k].name}</span><em class="${changeClass(ret)}">${pct(ret)}</em></div><strong>${ret>=0?'▲':'▼'} ${Math.abs(ret).toFixed(2)}%</strong><div class="compare-bar"><span style="width:${width}%;background:${META[k].color}"></span></div></div>`;}).join('');
    $('#comparisonGrid').innerHTML = html || '<div class="watch-empty">تاریخچه کافی برای مقایسه موجود نیست.</div>';
  }
  function renderChartControls() {
    const available = DEFAULT_ASSETS.filter(k => seriesFor(k).length > 0);
    $('#chartAssetControls').innerHTML = available.map(k=>`<button class="chart-chip ${chartAsset===k?'active':''}" data-chart-asset="${k}" type="button">${META[k].short}</button>`).join('');
    $$('#chartAssetControls button').forEach(b=>b.addEventListener('click',()=>{chartAsset=b.dataset.chartAsset;drawMainChart();}));
    $$('#chartRangeControls button').forEach(b=>{b.classList.toggle('active',b.dataset.range===chartRange);b.onclick=()=>{chartRange=b.dataset.range;drawMainChart();};});
  }
  function drawMainChart() {
    renderChartControls();
    const all = history.filter(r => getHistoryValue(chartAsset,r) > 0); const wanted = chartRange==='1d' ? Math.min(180,all.length) : chartRange==='7d' ? Math.min(1008,all.length) : Math.min(4320,all.length); const rows=all.slice(-wanted);
    $('#chartHeading').textContent=`روند ${META[chartAsset]?.name||chartAsset}`; $('#chartHint').textContent=`${META[chartAsset]?.unit||''} · ${rows.length?fa(rows.length)+' نقطه داده':'بدون داده'}`;
    const empty=$('#chartEmpty'); if(!rows.length){empty.style.display='grid';if(mainChart){mainChart.destroy();mainChart=null;}return;} empty.style.display='none';
    const vals=rows.map(r=>getHistoryValue(chartAsset,r)); const labels=rows.map(r=>new Date(r.time).toLocaleDateString('fa-IR',{month:'2-digit',day:'2-digit'})); const ctx=$('#mainChart').getContext('2d'); const color=META[chartAsset]?.color||'#59D8FF'; const grad=ctx.createLinearGradient(0,0,0,390); grad.addColorStop(0,hexToRgba(color,.32)); grad.addColorStop(1,hexToRgba(color,0));
    if(mainChart)mainChart.destroy();
    mainChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:color,backgroundColor:grad,fill:true,tension:.3,pointRadius:0,pointHoverRadius:5,borderWidth:2.5}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{rtl:true,displayColors:false,backgroundColor:'#08131e',borderColor:hexToRgba(color,.45),borderWidth:1,padding:12,titleColor:'#9fb4c4',bodyColor:'#f7fbff',callbacks:{label:c=>`${META[chartAsset].name}: ${displayPrice(c.raw,chartAsset)}`}}},scales:{x:{display:false},y:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'#73899e',font:{family:'Vazirmatn',size:10},callback:v=>isGlobal(chartAsset)?num(v,2):fa(v)}}}}});
  }
  function drawSpark(canvas,vals,color){if(!canvas||vals.length<2)return;const old=sparkCharts.get(canvas);if(old)old.destroy();const c=canvas.getContext('2d');const chart=new Chart(c,{type:'line',data:{labels:vals.map((_,i)=>i),datasets:[{data:vals,borderColor:color,backgroundColor:hexToRgba(color,.11),fill:true,tension:.38,pointRadius:0,borderWidth:1.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});sparkCharts.set(canvas,chart);}
  function hexToRgba(hex,a){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return `rgba(${r},${g},${b},${a})`;}
  function openDetail(key){
    const a=normalizeAsset(key),m=META[key]; if(!a?.last)return; selectedAsset=key; $('#detailPanel').hidden=false; $('#detailPanel').style.setProperty('--asset-color',m.color); $('#detailLogo').innerHTML=logoHTML(key); $('#detailName').textContent=m.name; $('#detailSymbol').textContent=`${m.short} · ${m.unit}`;
    const spread=a.bestBuy&&a.bestSell?a.bestSell-a.bestBuy:0;
    const rows=[['قیمت فعلی',displayPrice(a.last,key)],['تغییر روزانه',pct(a.change)],['بیشترین',a.high?displayPrice(a.high,key):'—'],['کمترین',a.low?displayPrice(a.low,key):'—'],['حجم',displayVolume(a.volume)],['حجم معادل',displayVolume(a.quoteVolume)],['بازگشایی',a.open?displayPrice(a.open,key):'—'],['پایانی قبلی',a.prevClose?displayPrice(a.prevClose,key):'—'],['بهترین خرید',a.bestBuy?displayPrice(a.bestBuy,key):'—'],['بهترین فروش',a.bestSell?displayPrice(a.bestSell,key):'—'],['اسپرد',spread?displayPrice(spread,key):'—'],['منبع',a.source],['وضعیت',a.delayed?'با تأخیر':'عادی'],['زمان',a.timestamp?safeDate(a.timestamp):'—']];
    $('#detailGrid').innerHTML=rows.map(([l,v])=>`<div class="detail-stat"><span>${l}</span><b class="${l==='تغییر روزانه'?changeClass(a.change):''}">${v}</b></div>`).join('');
    $('#detailWatch i').className=watchlist.includes(key)?'fa-solid fa-star':'fa-regular fa-star'; chartAsset=key; drawMainChart(); $('#detailPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function closeDetail(){selectedAsset=null;$('#detailPanel').hidden=true;}
  function toggleWatch(key){watchlist=watchlist.includes(key)?watchlist.filter(k=>k!==key):[...watchlist,key].slice(-12);localStorage.setItem('arzpulse_watchlist',JSON.stringify(watchlist));renderMarkets();renderWatchlist();if(selectedAsset===key)$('#detailWatch i').className=watchlist.includes(key)?'fa-solid fa-star':'fa-regular fa-star';toast(watchlist.includes(key)?'به واچ‌لیست اضافه شد':'از واچ‌لیست حذف شد');}
  function bindCardMotion(){if(!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;$$('.market-card,.overview-tile,.side-card,.chart-card,.comparison,.detail-panel,.market-overview').forEach(el=>{if(el.dataset.motion)return;el.dataset.motion='1';el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.setProperty('--mx',`${x*100}%`);el.style.setProperty('--my',`${y*100}%`);el.style.setProperty('--rx',`${y*-2.2}deg`);el.style.setProperty('--ry',`${x*2.8}deg`);});el.addEventListener('pointerleave',()=>{el.style.removeProperty('--rx');el.style.removeProperty('--ry');});});}
  async function fetchJSON(url){const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
  async function loadHistory(){const dates=[];for(let i=0;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);dates.push(d.toISOString().slice(0,10));}const res=await Promise.all(dates.map(d=>fetchJSON(`${HISTORY_BASE}${d}.json`).catch(()=>null)));history=res.filter(Array.isArray).flat().sort((a,b)=>new Date(a.time)-new Date(b.time));}
  async function loadData(showToast=false){const b=$('#connectionPill');b.querySelector('b').textContent='در حال بروزرسانی';try{latest=await fetchJSON(DATA_URL);await loadHistory();renderAll();if(showToast)toast('Snapshot جدید دریافت شد.');}catch(err){console.error(err);b.querySelector('b').textContent='خطای اتصال';b.classList.add('warning');toast('دریافت داده ناموفق بود.');}}
  function renderAll(){setTheme();setDensity();setCurrency();renderOverview();renderMarkets();renderTicker();renderStats();renderWatchlist();renderHealth();renderComparison();drawMainChart();$('#lastUpdateText').textContent=latest?.timestamp?age(latest.timestamp):'—';$('#dataCount').textContent=`${fa(DEFAULT_ASSETS.filter(k=>normalizeAsset(k)?.last).length)} دارایی`;$('#buildStamp').textContent=`v${latest?.version||7}`;}
  function initClock(){const tick=()=>{$('#marketClock').textContent=new Intl.DateTimeFormat('fa-IR',{weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());};tick();setInterval(tick,1000);}
  function initAmbient(){const c=$('#ambientCanvas'),ctx=c.getContext('2d');if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;let w=0,h=0,dpr=1;const particles=[];const resize=()=>{dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;c.style.width=`${w}px`;c.style.height=`${h}px`;ctx.setTransform(dpr,0,0,dpr,0,0);};resize();addEventListener('resize',resize);for(let i=0;i<68;i++)particles.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.18,r:.35+Math.random()*1.3});const loop=()=>{ctx.clearRect(0,0,w,h);for(const p of particles){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;ctx.fillStyle='rgba(134,204,230,.22)';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}requestAnimationFrame(loop);};loop();}
  function bind(){
    initClock();initAmbient();setTheme();setDensity();setCurrency();
    $('#themeBtn').onclick=()=>{theme=theme==='dark'?'light':'dark';localStorage.setItem('arzpulse_theme',theme);renderAll();};
    $('#refreshBtn').onclick=()=>loadData(true);
    $$('#marketFilters button').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;$$('#marketFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMarkets();});
    $$('#currencyToggle button').forEach(b=>b.onclick=()=>{currency=b.dataset.currency;localStorage.setItem('arzpulse_currency',currency);renderAll();});
    $$('#densityToggle button').forEach(b=>b.onclick=()=>{density=b.dataset.density;localStorage.setItem('arzpulse_density',density);setDensity();renderMarkets();});
    $('#resetWatchlist').onclick=()=>{watchlist=[];localStorage.setItem('arzpulse_watchlist','[]');renderMarkets();renderWatchlist();};
    $('#closeDetail').onclick=closeDetail; $('#detailWatch').onclick=()=>selectedAsset&&toggleWatch(selectedAsset);
    addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();});
    const up=$('#scrollTopBtn');addEventListener('scroll',()=>up.classList.toggle('visible',scrollY>500));up.onclick=()=>scrollTo({top:0,behavior:'smooth'});
    $$('.topnav a').forEach(a=>a.addEventListener('click',()=>{$$('.topnav a').forEach(x=>x.classList.remove('active'));a.classList.add('active');}));
  }
  bind(); loadData(false); setInterval(()=>loadData(false),5*60*1000);
})();
