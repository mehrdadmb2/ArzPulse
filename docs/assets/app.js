(() => {
  'use strict';

  const APP_VERSION = 9;
  const isPages = /\/ArzPulse(?:\/|$)/.test(location.pathname);
  const BASE = isPages ? '/ArzPulse' : '';
  const DATA_URL = `${BASE}/data/latest.json`;
  const HISTORY_BASE = `${BASE}/data/history/`;

  const META = {
    BTC:{name:'بیت‌کوین',short:'BTC',cat:'crypto',color:'#F7931A',unit:'ریال',fallback:'₿'},
    ETH:{name:'اتریوم',short:'ETH',cat:'crypto',color:'#627EEA',unit:'ریال',fallback:'Ξ'},
    USDT:{name:'تتر',short:'USDT',cat:'crypto',color:'#50AF95',unit:'ریال',fallback:'₮'},
    NOT:{name:'نات‌کوین',short:'NOT',cat:'crypto',color:'#F4F4F5',unit:'ریال',fallback:'N'},
    GOLD:{name:'طلای ۱۸ عیار',short:'GOLD',cat:'commodity',color:'#F7C75B',unit:'ریال / گرم',fallback:'Au'},
    DOLLAR:{name:'دلار / تتر',short:'USD/USDT',cat:'index',color:'#35D39B',unit:'ریال',fallback:'$'},
    BRENT:{name:'نفت برنت',short:'BRENT',cat:'commodity',color:'#F0B52D',unit:'USD / bbl',fallback:'B'},
    WTI:{name:'نفت WTI',short:'WTI',cat:'commodity',color:'#E9A92A',unit:'USD / bbl',fallback:'W'},
    XAUUSD:{name:'انس جهانی طلا',short:'XAU/USD',cat:'commodity',color:'#FFD75A',unit:'USD / oz',fallback:'Au'},
    SILVER:{name:'نقره',short:'XAG/USD',cat:'commodity',color:'#B7C1CB',unit:'USD / oz',fallback:'Ag'},
    SP500:{name:'S&P 500',short:'SPX',cat:'index',color:'#8FA7BA',unit:'index pts',fallback:'S&P'},
    NASDAQ:{name:'Nasdaq',short:'NDX',cat:'index',color:'#49B6E8',unit:'index pts',fallback:'N'},
    DXY:{name:'شاخص دلار',short:'DXY',cat:'index',color:'#49D17D',unit:'index pts',fallback:'D'}
  };
  const DEFAULT_ASSETS = Object.keys(META);
  const GLOBAL_KEYS = new Set(['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY']);
  const ALIASES = {
    BTC:['BTC','btc','BTCUSDT','BTC_USDT'],ETH:['ETH','eth','ETHUSDT','ETH_USDT'],USDT:['USDT','usdt','TETHER'],NOT:['NOT','not','NOTCOIN'],
    XAUUSD:['XAUUSD','XAU_USD','GOLDUSD','XAU'],SILVER:['SILVER','XAGUSD','XAG_USD','XAG'],SP500:['SP500','SPX','^GSPC'],NASDAQ:['NASDAQ','NDX','^IXIC'],DXY:['DXY','DX-Y.NYB']
  };

  let latest = null;
  let history = [];
  let historyLoaded = false;
  let currency = localStorage.getItem('arzpulse_currency') || 'IRR';
  let density = localStorage.getItem('arzpulse_density') || 'comfortable';
  let theme = localStorage.getItem('arzpulse_theme') || 'dark';
  let activeFilter = 'all';
  let chartAsset = localStorage.getItem('arzpulse_chart_asset') || 'BTC';
  let chartRange = localStorage.getItem('arzpulse_chart_range') || '7d';
  let watchlist = loadWatchlist();
  let selectedAsset = null;
  let tickerResizeObserver = null;
  let tickerRaf = 0;
  let tickerPaused = false;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const n = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'string') v = v.replace(/[٬,\s]/g, '');
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const first = (...values) => {
    for (const value of values) { const x = n(value); if (x !== 0) return x; }
    return 0;
  };
  const fa = v => n(v).toLocaleString('fa-IR');
  const en = (v, digits=2) => n(v).toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:0});
  const percent = v => `${n(v)>0?'+':''}${n(v).toFixed(2)}%`;
  const cls = v => n(v)>0?'up':n(v)<0?'down':'neutral';
  const age = iso => {
    const t = new Date(iso).getTime(); if (!Number.isFinite(t)) return '—';
    const mins = Math.max(0,Math.floor((Date.now()-t)/60000));
    if (mins < 1) return 'همین الان'; if (mins < 60) return `${fa(mins)} دقیقه پیش`;
    const hrs = Math.floor(mins/60); if (hrs < 24) return `${fa(hrs)} ساعت پیش`; return `${fa(Math.floor(hrs/24))} روز پیش`;
  };
  const safeDate = iso => { try { return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)); } catch { return '—'; } };
  const toast = msg => { const el=$('#toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); clearTimeout(window.__arzToast); window.__arzToast=setTimeout(()=>el.classList.remove('show'),2600); };
  const escapeHtml = str => String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function loadWatchlist(){ try { const x=JSON.parse(localStorage.getItem('arzpulse_watchlist')||'[]'); return Array.isArray(x)?x.filter(k=>META[k]):[]; } catch { return []; } }

  function icon(key){
    const m=META[key];
    const paths={BTC:'<circle cx="12" cy="12" r="8"/><path d="M9 7h4.3a2.2 2.2 0 0 1 0 4.4H9zm0 4.4h4.8a2.3 2.3 0 0 1 0 4.6H9zM11 5v14M13 5v2M13 17v2"/>',ETH:'<path d="m12 3-5 8.2 5 2.2 5-2.2L12 3Zm-5 8.2 5 10 5-10-5 2.2-5-2.2Z"/>',USDT:'<circle cx="12" cy="12" r="8"/><path d="M7.5 8.5h9M12 8.5v8M9 11.5c.7.9 5.3.9 6 0M8.5 15.5c1.4 1.1 5.6 1.1 7 0"/>',GOLD:'<path d="M7 4h10l2 4-7 12L5 8l2-4Z"/><path d="m7 8 5 2 5-2"/>',DOLLAR:'<circle cx="12" cy="12" r="8"/><path d="M15 8.8c-.8-.9-5-1.2-5 .9 0 2.3 5 1.1 5 3.7 0 2.3-4.7 2.2-5.7 1M12 6.5v11"/>',BRENT:'<path d="M9 20V9l3-3 3 3v11M7 20h10M8 12h8"/><path d="M12 3v3"/>',WTI:'<path d="M6 20h12M8 16l2-8h4l2 8M9 12h6"/>',XAUUSD:'<circle cx="12" cy="12" r="8"/><path d="M8 15 16 9M10 9h6v6"/>',SILVER:'<path d="M5 18 9 6l3 8 3-8 4 12"/>',SP500:'<path d="M5 17 9 12l3 3 5-7 2 3"/><path d="M5 20h14"/>',NASDAQ:'<path d="M5 17 9 9l3 8 3-10 4 10"/>',DXY:'<circle cx="12" cy="12" r="8"/><path d="M8 13c1.2 2 6.8 2 8 0M9 9.5h6M12 7v10"/>'};
    return `<svg viewBox="0 0 24 24" style="color:${m.color}" aria-hidden="true">${paths[key]||`<text x="12" y="15" text-anchor="middle" fill="currentColor" font-size="8" font-weight="800">${escapeHtml(m.fallback)}</text>`}</svg>`;
  }
  function logoHTML(key, size='normal'){ const m=META[key]; return `<span class="asset-logo ${size}" style="--asset-color:${m.color}">${icon(key)}</span>`; }

  function getPool(name){ const p=latest?.[name]; return p && typeof p==='object' ? p : null; }
  function findInPool(pool,key){
    if(!pool) return null;
    for(const alias of (ALIASES[key]||[key])) if(pool[alias]!==undefined) return pool[alias];
    const wanted=(ALIASES[key]||[key]).map(x=>String(x).toLowerCase());
    const found=Object.keys(pool).find(k=>wanted.includes(String(k).toLowerCase()));
    return found ? pool[found] : null;
  }
  function rawAsset(key){
    const pools=['prices','market','markets','assets','symbols'].map(getPool);
    for(const pool of pools){ const value=findInPool(pool,key); if(value!==null&&value!==undefined)return value; }
    return null;
  }
  function lastHistoryValue(key){
    for(let i=history.length-1;i>=0;i--){ const v=historyValue(key,history[i]); if(v>0)return v; }
    return 0;
  }
  function historyValue(key,row){
    if(!row)return 0;
    if(key==='GOLD') return first(row.GOLD18K,row.gold18K,row.GOLD,row.gold);
    if(key==='DOLLAR') return first(row.DOLLAR,row.dollar,row.USDT);
    for(const alias of (ALIASES[key]||[key])) if(row[alias]!==undefined) return n(row[alias]);
    return 0;
  }

  function normalized(key){
    if(!latest)return null;
    if(key==='DOLLAR'){
      const raw=rawAsset('USDT')||{};
      const last=first(latest.dollarPrice,latest.usdtPrice,raw.lastPrice,raw.last,raw.latest,raw.price,raw.bestSell);
      return {last,change:first(latest.dollarChange,raw.change),high:first(raw.high,raw.dayHigh),low:first(raw.low,raw.dayLow),volume:first(raw.volume,raw.volumeSrc,raw.quoteVolume),quoteVolume:first(raw.quoteVolume),open:first(raw.open,raw.openPrice),prevClose:first(raw.prevClose,raw.previousClose),bestBuy:first(raw.bestBuy,raw.buy,raw.bid),bestSell:first(raw.bestSell,raw.sell,raw.ask),source:'Nobitex',timestamp:raw.timestamp||latest.timestamp,delayed:false};
    }
    if(key==='GOLD'){
      const xaut=rawAsset('XAUUSD') || latest.prices?.XAUT || {};
      const rate=first(latest.usdtPrice,latest.dollarPrice);
      const last=first(latest.gold18K,latest.gold18k,latest.goldPrice);
      const highX=first(xaut.high,xaut.dayHigh,xaut.highest), lowX=first(xaut.low,xaut.dayLow,xaut.lowest);
      const high = highX&&rate ? Math.round((highX*rate/31.1034768)*.75) : 0;
      const low = lowX&&rate ? Math.round((lowX*rate/31.1034768)*.75) : 0;
      return {last,change:first(latest.goldChange,xaut.change),high,low,volume:first(xaut.volume,xaut.volumeSrc,xaut.quoteVolume),quoteVolume:first(xaut.quoteVolume),open:0,prevClose:0,bestBuy:first(xaut.bestBuy),bestSell:first(xaut.bestSell),source:'Nobitex · XAUT',timestamp:xaut.timestamp||latest.timestamp,delayed:false};
    }
    let raw=rawAsset(key);
    if(!raw && GLOBAL_KEYS.has(key)){
      const h=lastHistoryValue(key);
      if(h) raw={last:h,change:0,high:0,low:0,volume:0,timestamp:history.at(-1)?.time||latest.timestamp,delayed:true};
    }
    if(!raw)return null;
    return {last:first(raw.last,raw.lastPrice,raw.latest,raw.price,raw.close,raw.regularMarketPrice),change:first(raw.change,raw.changePercent,raw.percentChange,raw.dailyChange,raw.dayChange),high:first(raw.high,raw.dayHigh,raw.highest,raw.regularMarketDayHigh),low:first(raw.low,raw.dayLow,raw.lowest,raw.regularMarketDayLow),volume:first(raw.volume,raw.volumeSrc,raw.baseVolume,raw.regularMarketVolume),quoteVolume:first(raw.quoteVolume),open:first(raw.open,raw.openPrice,raw.regularMarketOpen),prevClose:first(raw.prevClose,raw.previousClose,raw.previous,raw.regularMarketPreviousClose),bestBuy:first(raw.bestBuy,raw.buy,raw.bid),bestSell:first(raw.bestSell,raw.sell,raw.ask),source:GLOBAL_KEYS.has(key)?'Yahoo Finance':'Nobitex',timestamp:raw.timestamp||raw.time||latest.timestamp,delayed:Boolean(raw.delayed)||GLOBAL_KEYS.has(key)};
  }

  function series(key){ return history.map(row=>historyValue(key,row)).filter(v=>v>0).slice(-4320); }
  function displayPrice(value,key){
    const v=n(value); if(!v)return '—';
    if(GLOBAL_KEYS.has(key))return `$${en(v,key==='DXY'?3:2)}`;
    if(currency==='USD'){
      const rate=first(latest?.dollarPrice,latest?.usdtPrice);
      if(rate>0)return `$${en(v/rate,key==='NOT'?6:2)}`;
    }
    return `${fa(v)} ریال`;
  }
  function displayQty(value,key){
    const v=n(value); if(!v)return '—';
    if(GLOBAL_KEYS.has(key))return en(v,key==='DXY'?3:2);
    return en(v, key==='NOT'?2:key==='BTC'||key==='ETH'?6:2);
  }
  function displayVolume(value,key){ const v=n(value); if(!v)return '—'; return GLOBAL_KEYS.has(key)?en(v,0):en(v,key==='BTC'||key==='ETH'?4:0); }

  function setTheme(){ document.body.classList.toggle('light',theme==='light'); const i=$('#themeBtn svg'); if(i)i.innerHTML=theme==='light'?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>':'<path d="M20 15.2A8.2 8.2 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z"/>'; }
  function setDensity(){ document.body.classList.toggle('compact',density==='compact'); $$('#densityToggle button').forEach(b=>b.classList.toggle('active',b.dataset.density===density)); }
  function setCurrency(){ $$('#currencyToggle button').forEach(b=>b.classList.toggle('active',b.dataset.currency===currency)); }
  function changeHTML(value){ return `<span class="change ${cls(value)}">${percent(value)}</span>`; }

  function overviewTile(key){
    const a=normalized(key); if(!a?.last)return '';
    const m=META[key];
    return `<button class="overview-tile" type="button" data-open-overview="${key}" style="--asset-color:${m.color}">
      <span class="overview-icon">${logoHTML(key,'small')}</span>
      <span class="overview-name"><small>${m.name}</small><b>${displayPrice(a.last,key)}</b></span>
      ${changeHTML(a.change)}
      <span class="overview-spark"><svg viewBox="0 0 160 34" preserveAspectRatio="none" data-spark-svg="${key}"></svg></span>
    </button>`;
  }
  function renderOverview(){
    const keys=['DOLLAR','GOLD','BTC','BRENT','XAUUSD','SP500'];
    const html=keys.map(overviewTile).filter(Boolean).join('');
    $('#overviewGrid').innerHTML=html||'<div class="empty">Snapshot فعلی داده‌ای ندارد.</div>';
    $$('#overviewGrid [data-open-overview]').forEach(b=>b.onclick=()=>openDetail(b.dataset.openOverview));
    $$('#overviewGrid [data-spark-svg]').forEach(svg=>drawSparkSvg(svg,series(svg.dataset.sparkSvg),META[svg.dataset.sparkSvg].color));
    $('#overviewStatus').textContent=latest?.hasError?'داده با هشدار':'متصل';
    $('#overviewUpdated').textContent=latest?.timestamp?age(latest.timestamp):'—';
  }

  function marketCard(key){
    const a=normalized(key); if(!a?.last)return '';
    const m=META[key], fav=watchlist.includes(key), s=series(key); const spread=(a.bestSell>0&&a.bestBuy>0)?a.bestSell-a.bestBuy:0;
    return `<article class="market-card" data-key="${key}" style="--asset-color:${m.color}">
      <button class="card-hit" data-open="${key}" type="button" aria-label="جزئیات ${escapeHtml(m.name)}"></button>
      <div class="market-head"><div class="asset-title">${logoHTML(key)}<span><b>${m.name}</b><small>${m.short} · ${m.unit}</small></span></div><button class="favorite ${fav?'active':''}" data-fav="${key}" type="button" aria-label="واچ‌لیست">${fav?'★':'☆'}</button></div>
      <div class="market-price"><strong>${displayPrice(a.last,key)}</strong>${changeHTML(a.change)}</div>
      <div class="market-meta">
        <div><span>بیشترین</span><b>${a.high?displayPrice(a.high,key):'—'}</b></div>
        <div><span>کمترین</span><b>${a.low?displayPrice(a.low,key):'—'}</b></div>
        <div><span>حجم</span><b>${displayVolume(a.volume,key)}</b></div>
        <div><span>اسپرد</span><b>${spread?displayPrice(spread,key):'—'}</b></div>
      </div>
      <div class="card-mid"><span>${a.bestBuy?`خرید ${displayPrice(a.bestBuy,key)}`:`بازار ${m.short}`}</span><span>${a.bestSell?`فروش ${displayPrice(a.bestSell,key)}`:`منبع ${escapeHtml(a.source)}`}</span></div>
      <div class="card-footer"><span>${escapeHtml(a.source)}${a.delayed?' · تأخیری':''}</span><span class="fresh">${a.timestamp?age(a.timestamp):'—'}</span></div>
      <div class="card-spark"><svg viewBox="0 0 300 70" preserveAspectRatio="none" data-card-spark="${key}"></svg></div>
    </article>`;
  }
  function renderMarkets(){
    const keys=DEFAULT_ASSETS.filter(k=>(activeFilter==='all'||META[k].cat===activeFilter)&&normalized(k)?.last);
    $('#marketGrid').innerHTML=keys.map(marketCard).join('')||'<div class="empty glass">داده‌ای برای این فیلتر در Snapshot فعلی وجود ندارد.</div>';
    $$('#marketGrid [data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleWatch(b.dataset.fav);});
    $$('#marketGrid [data-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
    $$('#marketGrid [data-card-spark]').forEach(svg=>drawSparkSvg(svg,series(svg.dataset.cardSpark),META[svg.dataset.cardSpark].color));
    bindCardMotion();
  }

  function updatePulseCore(){
    const map={DOLLAR:'pulseDollar',GOLD:'pulseGold',BRENT:'pulseBrent',BTC:'pulseBtc'};
    const changeMap={DOLLAR:'pulseDollarChange',GOLD:'pulseGoldChange',BRENT:'pulseBrentChange',BTC:'pulseBtcChange'};
    for(const [key,id] of Object.entries(map)){
      const a=normalized(key), value=$('#'+id), ch=$('#'+changeMap[key]);
      if(value)value.textContent=a?.last?displayPrice(a.last,key):'—';
      if(ch){ch.textContent=a?.last?percent(a.change):'—';ch.className=cls(a?.change||0);}
    }
    const count=DEFAULT_ASSETS.filter(k=>normalized(k)?.last).length;
    const countEl=$('#pulseAssetCount'), ageEl=$('#pulseUpdateAge'), note=$('#pulseNoteText'), state=$('#pulseCoreState');
    if(countEl)countEl.textContent=fa(count);
    if(ageEl)ageEl.textContent=latest?.timestamp?age(latest.timestamp):'—';
    if(note)note.textContent=latest?.hasError?'Snapshot با هشدار ثبت شده؛ داده‌های موجود همچنان قابل مشاهده‌اند.':'هستهٔ بازار با آخرین Snapshot هماهنگ و آمادهٔ بررسی است.';
    if(state)state.textContent=latest?.hasError?'WATCH':'LIVE';
    $$('#pulseStage [data-orbit-key]').forEach(btn=>{
      const key=btn.dataset.orbitKey;
      btn.classList.toggle('has-data',Boolean(normalized(key)?.last));
      btn.style.setProperty('--asset-color',META[key]?.color||'#5bdfff');
    });
  }

  function bindPulseInteractions(){
    const stage=$('#pulseStage'), art=$('#pulseArt'); if(!stage||!art)return;
    $$('#pulseStage [data-orbit-key]').forEach(btn=>{
      btn.addEventListener('click',()=>openDetail(btn.dataset.orbitKey));
      btn.addEventListener('pointerenter',()=>art.classList.add('node-focus'));
      btn.addEventListener('pointerleave',()=>art.classList.remove('node-focus'));
    });
    let raf=0;
    stage.addEventListener('pointermove',e=>{
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const r=stage.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        art.style.setProperty('--mx',(x*10).toFixed(2)+'deg');
        art.style.setProperty('--my',(y*7).toFixed(2)+'deg');
        art.style.setProperty('--px',(50+x*16).toFixed(2)+'%');
        art.style.setProperty('--py',(50+y*16).toFixed(2)+'%');
      });
    },{passive:true});
    stage.addEventListener('pointerleave',()=>{
      art.style.setProperty('--mx','0deg'); art.style.setProperty('--my','0deg');
      art.style.setProperty('--px','50%'); art.style.setProperty('--py','50%');
    },{passive:true});
  }

  function renderTicker(){
    const items=DEFAULT_ASSETS.map(k=>{const a=normalized(k);if(!a?.last)return '';return `<button class="ticker-item" data-open-ticker="${k}" type="button">${logoHTML(k,'tiny')}<span>${META[k].short}</span><b>${displayPrice(a.last,k)}</b>${changeHTML(a.change)}</button>`;}).filter(Boolean);
    const group=items.join('');
    $('#tickerTrack').innerHTML=`<div class="ticker-group">${group}</div><div class="ticker-group" aria-hidden="true">${group}</div>`;
    $$('#tickerTrack [data-open-ticker]').forEach(x=>x.onclick=()=>openDetail(x.dataset.openTicker));
    setupTickerLoop();
  }
  function setupTickerLoop(){
    const track=$('#tickerTrack'), viewport=$('#tickerViewport'); if(!track||!viewport)return;
    cancelAnimationFrame(tickerRaf);
    const firstGroup=track.querySelector('.ticker-group'); if(!firstGroup)return;
    const distance=firstGroup.getBoundingClientRect().width+parseFloat(getComputedStyle(firstGroup).marginRight||0)+8;
    track.style.setProperty('--ticker-distance',`${distance}px`);
    const duration=Math.max(22,distance/34);
    track.style.setProperty('--ticker-duration',`${duration}s`);
    track.classList.add('ready');
    if(tickerResizeObserver)tickerResizeObserver.disconnect();
    tickerResizeObserver=new ResizeObserver(()=>{clearTimeout(window.__tickerResize);window.__tickerResize=setTimeout(setupTickerLoop,80);});
    tickerResizeObserver.observe(viewport);
    viewport.onmouseenter=()=>tickerPaused=true; viewport.onmouseleave=()=>tickerPaused=false;
    viewport.ontouchstart=()=>tickerPaused=true; viewport.ontouchend=()=>setTimeout(()=>tickerPaused=false,600);
    viewport.onfocusin=()=>tickerPaused=true; viewport.onfocusout=()=>tickerPaused=false;
  }

  function sparkPoints(values,w,h,pad=3){
    if(values.length<2)return '';
    const min=Math.min(...values),max=Math.max(...values),span=max-min||1;
    return values.map((v,i)=>`${pad+(i/(values.length-1))*(w-pad*2)} ${h-pad-((v-min)/span)*(h-pad*2)}`).join(' ');
  }
  function drawSparkSvg(svg,values,color){
    if(!svg)return;
    const vals=values.slice(-60);
    if(vals.length<2){svg.innerHTML='';return;}
    const points=sparkPoints(vals,160,34,2.5);
    const area=`2,34 ${points} 157,34`;
    svg.innerHTML=`<polygon points="${area}" fill="${color}" fill-opacity=".11" stroke="none"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function drawMainChart(){
    const svg=$('#mainChart'), empty=$('#chartEmpty'); if(!svg)return;
    const rows=history.filter(r=>historyValue(chartAsset,r)>0);
    const wanted=chartRange==='1d'?Math.min(180,rows.length):chartRange==='7d'?Math.min(1008,rows.length):Math.min(4320,rows.length);
    const data=rows.slice(-wanted);
    $('#chartHeading').textContent=`روند ${META[chartAsset]?.name||chartAsset}`;
    $('#chartHint').textContent=data.length?`${META[chartAsset]?.unit||''} · ${fa(data.length)} نقطه داده`:'بدون داده';
    if(!data.length){svg.innerHTML='';empty.style.display='grid';return;} empty.style.display='none';
    const vals=data.map(r=>historyValue(chartAsset,r)); const W=1200,H=430,pad={l:22,r:18,t:22,b:28};
    const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1; const step=(W-pad.l-pad.r)/(Math.max(1,vals.length-1));
    const pts=vals.map((v,i)=>[pad.l+i*step,pad.t+(1-(v-min)/span)*(H-pad.t-pad.b)]); const line=pts.map(p=>p.join(',')).join(' ');
    const area=`${pad.l},${H-pad.b} ${line} ${W-pad.r},${H-pad.b}`; const c=META[chartAsset]?.color||'#59d8ff';
    const grid=[0,.25,.5,.75,1].map(q=>{const y=pad.t+q*(H-pad.t-pad.b);return `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="rgba(155,190,210,.09)"/><text x="${W-pad.r}" y="${y-5}" fill="#60788c" font-size="11" text-anchor="end">${displayPrice(min+(1-q)*span,chartAsset)}</text>`;}).join('');
    const times=[0,.5,1].map(q=>{const i=Math.round((vals.length-1)*q);const x=pts[i][0];const label=new Date(data[i].time).toLocaleDateString('fa-IR',{month:'short',day:'numeric'});return `<text x="${x}" y="${H-7}" fill="#5e7588" font-size="11" text-anchor="middle">${escapeHtml(label)}</text>`;}).join('');
    const gradId='chartGradient';
    const lastP=pts[pts.length-1];
    svg.innerHTML=`<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".30"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${area}" fill="url(#${gradId})"/><polyline points="${line}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${times}<circle cx="${lastP[0]}" cy="${lastP[1]}" r="5" fill="${c}"/><circle cx="${lastP[0]}" cy="${lastP[1]}" r="10" fill="none" stroke="${c}" stroke-opacity=".25"/>`;
    renderChartControls();
  }
  function renderChartControls(){
    const available=DEFAULT_ASSETS.filter(k=>series(k).length>1);
    if(!available.includes(chartAsset))chartAsset=available[0]||'BTC';
    $('#chartAssetControls').innerHTML=available.map(k=>`<button type="button" class="chart-chip ${chartAsset===k?'active':''}" data-chart-asset="${k}">${META[k].short}</button>`).join('');
    $$('#chartAssetControls button').forEach(b=>b.onclick=()=>{chartAsset=b.dataset.chartAsset;localStorage.setItem('arzpulse_chart_asset',chartAsset);renderChartControls();drawMainChart();});
    $$('#chartRangeControls button').forEach(b=>{b.classList.toggle('active',b.dataset.range===chartRange);b.onclick=()=>{chartRange=b.dataset.range;localStorage.setItem('arzpulse_chart_range',chartRange);drawMainChart();};});
  }

  function renderStats(){
    const entries=DEFAULT_ASSETS.map(k=>({k,a:normalized(k)})).filter(x=>x.a?.last); const changes=entries.map(x=>n(x.a.change));
    const pos=changes.filter(v=>v>0).length, neg=changes.filter(v=>v<0).length, avg=changes.length?changes.reduce((s,v)=>s+v,0)/changes.length:0;
    const best=entries.slice().sort((a,b)=>b.a.change-a.a.change)[0], worst=entries.slice().sort((a,b)=>a.a.change-b.a.change)[0];
    const rows=[['دارایی فعال',fa(entries.length)],['مثبت',`+${fa(pos)}`],['منفی',fa(neg)],['میانگین تغییر',percent(avg)],['بهترین',best?`${META[best.k].short} ${percent(best.a.change)}`:'—'],['ضعیف‌ترین',worst?`${META[worst.k].short} ${percent(worst.a.change)}`:'—']];
    $('#statsList').innerHTML=rows.map(([l,v])=>`<div class="stats-row"><span>${l}</span><b class="${(l==='میانگین تغییر'||l==='بهترین'||l==='ضعیف‌ترین')?cls(l==='بهترین'?best?.a.change:l==='ضعیف‌ترین'?worst?.a.change:avg):''}">${v}</b></div>`).join('');
  }
  function renderWatchlist(){
    const valid=watchlist.map(k=>({k,a:normalized(k)})).filter(x=>x.a?.last);
    $('#watchlist').innerHTML=valid.length?valid.map(({k,a})=>`<button class="watch-row" data-watch="${k}" type="button"><span>${logoHTML(k,'small')}<b>${META[k].short}</b></span><span>${displayPrice(a.last,k)} <em class="${cls(a.change)}">${percent(a.change)}</em></span></button>`).join(''):'<div class="watch-empty">هنوز موردی اضافه نشده.</div>';
    $$('#watchlist [data-watch]').forEach(b=>b.onclick=()=>openDetail(b.dataset.watch));
  }
  function renderHealth(){
    const dot=$('#healthDot'), good=latest&&!latest.hasError&&latest.timestamp; dot.classList.toggle('bad',!good);
    $('#healthText').textContent=!latest?'داده هنوز دریافت نشده است.':latest.hasError?`Snapshot با ${fa((latest.errorDetails||[]).length)} هشدار ذخیره شده است.`:'داده سالم و بدون خطای ثبت‌شده است.';
    $('#healthAge').textContent=latest?.timestamp?age(latest.timestamp):'—';
    $('#connectionPill').classList.toggle('warning',!good);
    $('#connectionPill b').textContent=good?'داده سالم':'نیازمند بررسی';
  }
  function renderComparison(){
    const items=DEFAULT_ASSETS.map(k=>{const s=series(k); if(s.length<2)return null; const base=s[0],last=s.at(-1); return {k,ret:base?((last/base)-1)*100:0};}).filter(Boolean).sort((a,b)=>b.ret-a.ret).slice(0,9);
    const max=Math.max(1,...items.map(x=>Math.abs(x.ret)));
    $('#comparisonGrid').innerHTML=items.length?items.map(({k,ret})=>`<div class="compare-item"><div class="c-top">${logoHTML(k,'tiny')}<span>${META[k].name}</span><em class="${cls(ret)}">${percent(ret)}</em></div><strong>${ret>0?'▲':'▼'} ${Math.abs(ret).toFixed(2)}%</strong><div class="compare-bar"><span style="width:${Math.max(3,(Math.abs(ret)/max)*100)}%;background:${META[k].color}"></span></div></div>`).join(''):'<div class="watch-empty">تاریخچه کافی برای مقایسه موجود نیست.</div>';
  }

  function openDetail(key){
    const a=normalized(key),m=META[key]; if(!a?.last)return; selectedAsset=key;
    $('#detailPanel').hidden=false; $('#detailPanel').style.setProperty('--asset-color',m.color); $('#detailLogo').innerHTML=logoHTML(key); $('#detailName').textContent=m.name; $('#detailSymbol').textContent=`${m.short} · ${m.unit}`;
    const spread=a.bestSell&&a.bestBuy?a.bestSell-a.bestBuy:0;
    const rows=[['قیمت فعلی',displayPrice(a.last,key)],['تغییر روزانه',percent(a.change)],['بیشترین',a.high?displayPrice(a.high,key):'—'],['کمترین',a.low?displayPrice(a.low,key):'—'],['حجم',displayVolume(a.volume,key)],['حجم معادل',displayVolume(a.quoteVolume,key)],['بازگشایی',a.open?displayPrice(a.open,key):'—'],['پایانی قبلی',a.prevClose?displayPrice(a.prevClose,key):'—'],['بهترین خرید',a.bestBuy?displayPrice(a.bestBuy,key):'—'],['بهترین فروش',a.bestSell?displayPrice(a.bestSell,key):'—'],['اسپرد',spread?displayPrice(spread,key):'—'],['منبع',a.source],['وضعیت',a.delayed?'با تأخیر':'عادی'],['زمان',a.timestamp?safeDate(a.timestamp):'—']];
    $('#detailGrid').innerHTML=rows.map(([l,v])=>`<div class="detail-stat"><span>${l}</span><b class="${l==='تغییر روزانه'?cls(a.change):''}">${escapeHtml(v)}</b></div>`).join('');
    $('#detailWatch').classList.toggle('active',watchlist.includes(key));
    chartAsset=key; localStorage.setItem('arzpulse_chart_asset',key); drawMainChart();
    $('#detailPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function closeDetail(){selectedAsset=null;$('#detailPanel').hidden=true;}
  function toggleWatch(key){ watchlist=watchlist.includes(key)?watchlist.filter(x=>x!==key):[...watchlist,key].slice(-12); localStorage.setItem('arzpulse_watchlist',JSON.stringify(watchlist)); renderMarkets();renderWatchlist();if(selectedAsset===key)$('#detailWatch').classList.toggle('active',watchlist.includes(key));toast(watchlist.includes(key)?'به واچ‌لیست اضافه شد':'از واچ‌لیست حذف شد'); }

  function bindCardMotion(){
    if(!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    $$('.market-card,.overview-tile,.side-card,.chart-card,.comparison,.detail-panel,.market-overview').forEach(el=>{
      if(el.dataset.motion)return; el.dataset.motion='1';
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;el.style.setProperty('--mx',`${x}px`);el.style.setProperty('--my',`${y}px`);el.style.setProperty('--rx',`${((y/r.height)-.5)*-2.5}deg`);el.style.setProperty('--ry',`${((x/r.width)-.5)*3}deg`);});
      el.addEventListener('pointerleave',()=>{el.style.removeProperty('--rx');el.style.removeProperty('--ry');});
    });
  }

  async function fetchJSON(url){ const r=await fetch(`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`,{cache:'no-store'}); if(!r.ok)throw new Error(`HTTP ${r.status}`); return r.json(); }
  async function loadRecentHistory(){
    const dates=[]; const today=new Date(); for(let i=0;i<2;i++){const d=new Date(today);d.setDate(today.getDate()-i);dates.push(d.toISOString().slice(0,10));}
    const res=await Promise.all(dates.map(d=>fetchJSON(`${HISTORY_BASE}${d}.json`).catch(()=>[]))); history=res.filter(Array.isArray).flat().sort((a,b)=>new Date(a.time)-new Date(b.time)); historyLoaded=true;
  }
  async function loadFullHistory(){
    const dates=[]; const today=new Date(); for(let i=2;i<30;i++){const d=new Date(today);d.setDate(today.getDate()-i);dates.push(d.toISOString().slice(0,10));}
    const res=await Promise.all(dates.map(d=>fetchJSON(`${HISTORY_BASE}${d}.json`).catch(()=>[]))); history=history.concat(res.filter(Array.isArray).flat()).sort((a,b)=>new Date(a.time)-new Date(b.time)); history=history.slice(-10000); drawMainChart();renderComparison();renderOverview();renderMarkets();
  }

  async function loadData(showToast=false){
    const pill=$('#connectionPill'); pill.classList.remove('warning'); pill.querySelector('b').textContent='در حال دریافت';
    try{
      latest=await fetchJSON(DATA_URL);
      // Render immediately from latest.json; history/chart enrichment must never block first paint.
      renderAll();
      await loadRecentHistory();
      renderAll();
      loadFullHistory().catch(err=>console.warn('History enrichment:',err));
      if(showToast)toast('Snapshot جدید دریافت شد.');
    }catch(err){
      console.error(err); pill.classList.add('warning'); pill.querySelector('b').textContent='خطای اتصال';
      if(!latest) { $('#marketGrid').innerHTML='<div class="empty glass">دریافت Snapshot ناموفق بود. دکمه بروزرسانی را بزنید.</div>'; }
      toast('دریافت داده ناموفق بود.');
    }
  }
  function renderAll(){
    setTheme();setDensity();setCurrency();
    updatePulseCore();
    renderOverview();renderMarkets();renderTicker();renderStats();renderWatchlist();renderHealth();renderComparison();renderChartControls();drawMainChart();
    $('#lastUpdateText').textContent=latest?.timestamp?age(latest.timestamp):'—';
    $('#dataCount').textContent=`${fa(DEFAULT_ASSETS.filter(k=>normalized(k)?.last).length)} دارایی`;
    $('#buildStamp').textContent=`v${APP_VERSION}`;
  }
  function initClock(){ const tick=()=>$('#marketClock').textContent=new Intl.DateTimeFormat('fa-IR',{weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date()); tick();setInterval(tick,1000); }
  function initAmbient(){
    const c=$('#ambientCanvas'); if(!c||matchMedia('(prefers-reduced-motion:reduce)').matches)return; const ctx=c.getContext('2d'); let w=0,h=0,dpr=1; const ps=[];
    const resize=()=>{dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);};
    resize();addEventListener('resize',resize);for(let i=0;i<84;i++)ps.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.18,r:.35+Math.random()*1.35,a:.15+Math.random()*.28});
    const loop=()=>{ctx.clearRect(0,0,w,h);for(const p of ps){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;ctx.fillStyle=`rgba(130,210,240,${p.a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}requestAnimationFrame(loop);};loop();
  }
  function bind(){
    initClock();initAmbient();setTheme();setDensity();setCurrency();
    $('#themeBtn').onclick=()=>{theme=theme==='dark'?'light':'dark';localStorage.setItem('arzpulse_theme',theme);setTheme();};
    $('#refreshBtn').onclick=()=>loadData(true);
    $$('#marketFilters button').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;$$('#marketFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMarkets();});
    $$('#currencyToggle button').forEach(b=>b.onclick=()=>{currency=b.dataset.currency;localStorage.setItem('arzpulse_currency',currency);renderAll();});
    $$('#densityToggle button').forEach(b=>b.onclick=()=>{density=b.dataset.density;localStorage.setItem('arzpulse_density',density);setDensity();renderMarkets();});
    $('#resetWatchlist').onclick=()=>{watchlist=[];localStorage.setItem('arzpulse_watchlist','[]');renderMarkets();renderWatchlist();};
    $('#closeDetail').onclick=closeDetail; $('#detailWatch').onclick=()=>selectedAsset&&toggleWatch(selectedAsset);
    addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();});
    const up=$('#scrollTopBtn'); addEventListener('scroll',()=>up.classList.toggle('visible',scrollY>450)); up.onclick=()=>scrollTo({top:0,behavior:'smooth'});
    $$('.topnav a').forEach(a=>a.addEventListener('click',()=>{$$('.topnav a').forEach(x=>x.classList.remove('active'));a.classList.add('active');}));
    addEventListener('resize',()=>{setupTickerLoop();bindCardMotion();});
  }

  bind();
  bindPulseInteractions();
  loadData(false);
  setInterval(()=>loadData(false),5*60*1000);
})();
