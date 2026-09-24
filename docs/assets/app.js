(() => {
  'use strict';

  const BASE = location.pathname.includes('/ArzPulse/') ? '/ArzPulse' : '';
  const DATA_URL = `${BASE}/data/latest.json`;
  const HISTORY_BASE = `${BASE}/data/history/`;

  const META = {
    BTC:{name:'Bitcoin',fa:'بیت‌کوین',short:'BTC',cat:'crypto',icon:'₿',color:'246,169,62',global:false},
    ETH:{name:'Ethereum',fa:'اتریوم',short:'ETH',cat:'crypto',icon:'Ξ',color:'98,126,234',global:false},
    USDT:{name:'Tether',fa:'تتر',short:'USDT',cat:'crypto',icon:'₮',color:'38,190,150',global:false},
    NOT:{name:'Notcoin',fa:'نات‌کوین',short:'NOT',cat:'crypto',icon:'N',color:'171,150,255',global:false},
    GOLD:{name:'18K Gold',fa:'طلای ۱۸ عیار',short:'GOLD',cat:'commodity',icon:'Au',color:'245,197,91',global:false},
    DOLLAR:{name:'USD / USDT',fa:'دلار / تتر',short:'USD',cat:'index',icon:'$',color:'126,177,255',global:false},
    BRENT:{name:'Brent Crude',fa:'نفت برنت',short:'BRENT',cat:'commodity',icon:'Br',color:'78,221,179',global:true},
    WTI:{name:'WTI Crude',fa:'نفت WTI',short:'WTI',cat:'commodity',icon:'WT',color:'111,223,204',global:true},
    XAUUSD:{name:'Gold Futures',fa:'طلای جهانی',short:'XAU',cat:'commodity',icon:'Au',color:'240,194,81',global:true},
    SILVER:{name:'Silver Futures',fa:'نقره',short:'XAG',cat:'commodity',icon:'Ag',color:'169,189,204',global:true},
    SP500:{name:'S&P 500',fa:'S&P 500',short:'SPX',cat:'index',icon:'S',color:'104,181,255',global:true},
    NASDAQ:{name:'Nasdaq',fa:'نزدک',short:'NDX',cat:'index',icon:'N',color:'127,145,244',global:true},
    DXY:{name:'US Dollar Index',fa:'شاخص دلار',short:'DXY',cat:'index',icon:'D',color:'190,155,255',global:true}
  };

  const DEFAULT_ORDER = ['BTC','ETH','USDT','NOT','GOLD','DOLLAR','BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'];
  const OVERVIEW_ORDER = ['BTC','GOLD','DOLLAR','BRENT','XAUUSD','SP500'];
  const CHARTABLE = DEFAULT_ORDER.slice();
  const I18N = {
    en:{
      brandSubtitle:'Market Terminal',navMarkets:'Markets',navStatus:'Status',navChart:'Charts',navWatch:'Watchlist',navPortfolio:'Portfolio',navCompare:'Compare',
      checking:'Checking',liveMarket:'LIVE MARKET',eyebrow:'LIVE MARKET INTELLIGENCE',heroTitle:'Market intelligence, built to move.',
      heroText:'A dense, responsive terminal for crypto, local rates, commodities and global indices — with clear context, live status and a high-signal visual system.',
      coverage:'Coverage',trackedAssets:'tracked assets',exploreMarkets:'Explore markets',share:'Share',openPortfolio:'Open portfolio',dataLayer:'GitHub data layer',
      updateSchedule:'Updated by automation',galaxyCaption:'Interactive market pulse',overviewTitle:'Fast market view',
      filterMarket:'Market',all:'All',crypto:'Crypto',commodities:'Commodities',indices:'Indices',unit:'Unit',comfortable:'Comfortable',compact:'Compact',
      marketStatusTitle:'Market status',marketStatusLead:'A compact view of breadth, momentum, pressure and data freshness.',pulseScoreLabel:'Pulse score',
      breadth:'Market breadth',momentum:'Momentum',volatility:'Volatility',dataHealth:'Data health',avgChange:'Average change',
      largestMove:'Largest move',freshness:'Freshness',sources:'Sources',errors:'Errors',topMovers:'Top movers',byDailyChange:'by daily change',
      marketSessions:'Market sessions',localAndGlobal:'local + global',keyStats:'Key stats',watchlist:'Watchlist',clear:'Clear',
      connected:'Connected',serviceHealth:'Service health',lastSnapshot:'Last snapshot',updateSource:'Update source',schedule:'Schedule',
      comparisonTitle:'Compare performance',dataNoteTitle:'Data & update model',
      dataNote:'ArzPulse reads generated JSON data. Local market snapshots come from the project collector and global market snapshots are stored by automation. Global quotes can be delayed.',
      repo:'Repository ↗',footerText:'Built for fast, high-signal market monitoring.',
      up:'Up',down:'Down',balanced:'Balanced',fresh:'Fresh',stale:'Stale',veryFresh:'Live',none:'—',noData:'No data for this filter.',
      historyMissing:'Historical data is not available for this asset yet.',clickHint:'Click an asset card to inspect more details.',
      noWatch:'Your watchlist is empty. Tap ☆ on a card to add assets.',last:'Last',high:'High',low:'Low',volume:'Volume',bestBuy:'Best buy',bestSell:'Best sell',
      spread:'Spread',source:'Source',updated:'Updated',delayed:'Delayed',local:'Local',global:'Global',change:'Change',
      open:'Open',closed:'Closed',iran:'Iran',london:'London',newYork:'New York',asia:'Asia',copyDone:'Profile/share link copied.',refreshed:'Data refresh requested.',exportBackup:'Export backup',backupSaved:'Backup exported.',backupFailed:'Backup export failed.',cacheUsed:'Using cached snapshot while reconnecting…',reconnected:'Live data reconnected.',conflict:'This profile changed elsewhere. Refresh before trying again.',
      portfolioTitle:'Persistent portfolio',portfolioLead:'Track your own buy lots, current value, unrealized P/L and return across devices.',
      createProfileTitle:'Create or open your profile',createProfileText:'Choose a unique username and PIN. Your holdings are stored in Cloudflare KV; this browser only remembers the username.',
      username:'Username',pin:'PIN',displayName:'Display name',createOrOpen:'Create / Open',viewProfile:'View profile',workerEndpoint:'Portfolio API',configure:'Configure',
      featurePermanent:'Persistent server-side storage',featurePnL:'Unrealized P/L & ROI',featureTelegram:'Website + Telegram profile',featureLots:'Multiple buy lots per asset',featureSell:'FIFO selling & realized P/L',featureShare:'Shareable profile URL',
      refreshProfile:'Refresh',shareProfile:'Share profile',logOut:'Lock',unlock:'Unlock editing',openPositions:'Open positions',quantity:'Qty',entry:'Entry',current:'Current',value:'Value',pnl:'P/L',actions:'Actions',
      asset:'Asset',addBuy:'Record a purchase',buyPrice:'Buy price',buyDate:'Purchase date',note:'Note',savePurchase:'Save purchase',sellHint:'FIFO is used when closing part of a position.',sellPrice:'Sell price',recordSell:'Record sale',
      allocation:'Portfolio allocation',realizedHistory:'Realized P/L',portfolioNote:'Portfolio numbers are derived from your recorded lots and the latest ArzPulse market snapshot. They are not a brokerage statement or tax record.',
      invested:'Invested',portfolioValue:'Current value',unrealized:'Unrealized P/L',roi:'ROI',dayPnl:'Est. 24h P/L',realized:'Realized P/L',lots:'lots',readOnly:'Read-only profile',editing:'Editing enabled',
      workerMissing:'Portfolio API is not configured. Set the deployed Worker URL to enable cross-device profile storage.',profileCreated:'Profile created / opened.',holdingAdded:'Purchase saved.',holdingRemoved:'Position removed.',saleRecorded:'Sale recorded.',profileLoaded:'Profile loaded.',badWorker:'Worker request failed.',
      wrongPin:'Incorrect PIN or profile is protected.',needProfile:'Create/open a profile first.',needWorker:'Set the Worker URL first.',invalidNumber:'Enter valid positive numbers.',publicProfile:'Public profile',guest:'Guest',
      remove:'Remove',confirmRemove:'Remove this lot?',noneYet:'No realized sales yet.',noPositions:'No open positions yet.',profileUpdated:'Profile refreshed.'
    },
    fa:{
      brandSubtitle:'ترمینال بازار',navMarkets:'بازارها',navStatus:'وضعیت',navChart:'نمودارها',navWatch:'واچ‌لیست',navPortfolio:'پرتفوی',navCompare:'مقایسه',
      checking:'در حال بررسی',liveMarket:'بازار زنده',eyebrow:'هوشمندی زنده بازار',heroTitle:'اطلاعات بازار، آماده برای تصمیم.',
      heroText:'ترمینالی متراکم و واکنش‌گرا برای رمزارز، نرخ‌های داخلی، کالاها و شاخص‌های جهانی؛ با وضعیت لحظه‌ای و اطلاعات قابل استفاده.',
      coverage:'پوشش',trackedAssets:'دارایی تحت رصد',exploreMarkets:'مشاهده بازارها',share:'اشتراک‌گذاری',openPortfolio:'پرتفوی من',dataLayer:'لایه داده GitHub',
      updateSchedule:'به‌روزرسانی خودکار',galaxyCaption:'نبض تعاملی بازار',overviewTitle:'نمای سریع بازار',
      filterMarket:'بازار',all:'همه',crypto:'کریپتو',commodities:'کالاها',indices:'شاخص‌ها',unit:'واحد',comfortable:'راحت',compact:'فشرده',
      marketStatusTitle:'وضعیت بازار',marketStatusLead:'نمایی فشرده از عرض بازار، مومنتوم، فشار و تازگی داده.',pulseScoreLabel:'امتیاز نبض',
      breadth:'عرض بازار',momentum:'مومنتوم',volatility:'نوسان',dataHealth:'سلامت داده',avgChange:'میانگین تغییر',
      largestMove:'بیشترین حرکت',freshness:'تازگی',sources:'منابع',errors:'خطاها',topMovers:'دارایی‌های پُرحرکت',byDailyChange:'بر اساس تغییر روزانه',
      marketSessions:'جلسات بازار',localAndGlobal:'داخلی + جهانی',keyStats:'آمار کلیدی',watchlist:'واچ‌لیست',clear:'پاک کردن',
      connected:'متصل',serviceHealth:'سلامت سرویس',lastSnapshot:'آخرین Snapshot',updateSource:'منبع به‌روزرسانی',schedule:'زمان‌بندی',
      comparisonTitle:'مقایسه عملکرد',dataNoteTitle:'مدل داده و به‌روزرسانی',
      dataNote:'ArzPulse داده را از لایه JSON تولیدشده می‌خواند. داده‌های داخلی از Collector پروژه و داده‌های جهانی از Workflow خودکار ذخیره می‌شوند. داده‌های بازار جهانی ممکن است با تأخیر همراه باشند.',
      repo:'مخزن ↗',footerText:'ساخته‌شده برای پایش سریع و پُر‌سیگنال بازار.',
      up:'مثبت',down:'منفی',balanced:'متعادل',fresh:'تازه',stale:'کهنه',veryFresh:'زنده',none:'—',noData:'داده‌ای برای این فیلتر موجود نیست.',
      historyMissing:'هنوز تاریخچه‌ای برای این دارایی ثبت نشده است.',clickHint:'برای جزئیات بیشتر روی کارت دارایی کلیک کنید.',
      noWatch:'واچ‌لیست خالی است. روی ☆ کارت‌ها بزنید تا دارایی اضافه شود.',last:'آخرین',high:'بیشترین',low:'کمترین',volume:'حجم',bestBuy:'بهترین خرید',bestSell:'بهترین فروش',
      spread:'اسپرد',source:'منبع',updated:'به‌روزرسانی',delayed:'با تأخیر',local:'داخلی',global:'جهانی',change:'تغییر',
      open:'باز',closed:'بسته',iran:'ایران',london:'لندن',newYork:'نیویورک',asia:'آسیا',copyDone:'لینک پروفایل/اشتراک‌گذاری کپی شد.',refreshed:'درخواست تازه‌سازی داده ارسال شد.',exportBackup:'خروجی پشتیبان',backupSaved:'فایل پشتیبان ذخیره شد.',backupFailed:'خروجی پشتیبان ناموفق بود.',cacheUsed:'در حال استفاده از Snapshot ذخیره‌شده و تلاش برای اتصال مجدد…',reconnected:'داده زنده دوباره متصل شد.',conflict:'این پروفایل از جای دیگری تغییر کرده است. ابتدا تازه‌سازی کنید.',
      portfolioTitle:'پرتفوی ماندگار',portfolioLead:'خریدهای خود را در چند دستگاه پیگیری کنید و ارزش فعلی، سود/زیان و بازده را ببینید.',
      createProfileTitle:'پروفایل خود را بسازید یا باز کنید',createProfileText:'یک نام کاربری یکتا و PIN انتخاب کنید. پروفایل در لایه ذخیره‌سازی مقاوم D1/KV سمت سرور نگهداری می‌شود و مرورگر فقط نام کاربری را به خاطر می‌سپارد.',
      username:'نام کاربری',pin:'PIN',displayName:'نام نمایشی',createOrOpen:'ساخت / ورود',viewProfile:'مشاهده پروفایل',workerEndpoint:'API پرتفوی',configure:'تنظیم',
      featurePermanent:'ذخیره‌سازی دائمی سمت سرور',featurePnL:'سود/زیان و ROI',featureTelegram:'پروفایل سایت + تلگرام',featureLots:'چند خرید برای یک دارایی',featureSell:'فروش FIFO و سود محقق‌شده',featureShare:'لینک قابل اشتراک پروفایل',
      refreshProfile:'تازه‌سازی',shareProfile:'اشتراک پروفایل',logOut:'قفل',unlock:'باز کردن ویرایش',openPositions:'موقعیت‌های باز',quantity:'تعداد',entry:'ورود',current:'فعلی',value:'ارزش',pnl:'سود/زیان',actions:'عملیات',
      asset:'دارایی',addBuy:'ثبت خرید',buyPrice:'قیمت خرید',buyDate:'تاریخ خرید',note:'یادداشت',savePurchase:'ذخیره خرید',sellHint:'برای بستن بخشی از موقعیت، روش FIFO استفاده می‌شود.',sellPrice:'قیمت فروش',recordSell:'ثبت فروش',
      allocation:'تخصیص پرتفوی',realizedHistory:'سود/زیان محقق‌شده',portfolioNote:'اعداد پرتفوی از خریدهای ثبت‌شده و آخرین Snapshot بازار ArzPulse به دست می‌آیند و صورت‌حساب کارگزاری یا سند مالیاتی نیستند.',
      invested:'سرمایه‌گذاری',portfolioValue:'ارزش فعلی',unrealized:'سود/زیان محقق‌نشده',roi:'ROI',dayPnl:'سود/زیان تخمینی ۲۴ساعته',realized:'سود/زیان محقق‌شده',lots:'مورد',readOnly:'پروفایل فقط‌خواندنی',editing:'ویرایش فعال',
      workerMissing:'API پرتفوی تنظیم نشده است. آدرس Worker مستقرشده را وارد کنید تا ذخیره‌سازی بین دستگاه‌ها فعال شود.',profileCreated:'پروفایل ساخته/باز شد.',holdingAdded:'خرید ذخیره شد.',holdingRemoved:'موقعیت حذف شد.',saleRecorded:'فروش ثبت شد.',profileLoaded:'پروفایل بارگذاری شد.',badWorker:'درخواست Worker ناموفق بود.',
      wrongPin:'PIN نادرست است یا پروفایل محافظت شده است.',needProfile:'ابتدا پروفایل را بسازید یا باز کنید.',needWorker:'ابتدا آدرس Worker را تنظیم کنید.',invalidNumber:'عددهای مثبت و معتبر وارد کنید.',publicProfile:'پروفایل عمومی',guest:'مهمان',
      remove:'حذف',confirmRemove:'این خرید حذف شود؟',noneYet:'هنوز فروش ثبت نشده است.',noPositions:'هنوز موقعیت بازی ثبت نشده است.',profileUpdated:'پروفایل تازه شد.'
    }
  };

  let lang = localStorage.getItem('arzpulse_lang') || 'en';
  let currency = localStorage.getItem('arzpulse_currency') || 'IRR';
  let density = localStorage.getItem('arzpulse_density') || 'comfortable';
  let theme = localStorage.getItem('arzpulse_theme') || 'dark';
  let activeFilter = 'all';
  let chartAsset = 'BTC';
  let chartRange = '7d';
  let latest = null;
  let history = [];
  let watchlist = loadWatch();
  let detailAsset = null;
  let tickerTimer = null;

  let profile = null;
  let profilePin = '';
  let profileReadOnly = false;
  let workerURL = '';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const T = k => I18N[lang][k] ?? k;
  const isGlobal = key => !!META[key]?.global;
  const num = n => { const v=Number(n); return Number.isFinite(v)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v):'—'; };
  const faNum = n => { const v=Number(n); return Number.isFinite(v)?new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(v):'—'; };
  const integer = n => { const v=Number(n); return Number.isFinite(v)?new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US',{maximumFractionDigits:0}).format(v):'—'; };
  const formatPct = n => { const v=Number(n); return Number.isFinite(v)?`${v>0?'+':''}${v.toFixed(2)}%`:'—'; };
  const escapeHtml = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const cls = n => Number(n)>0?'up':Number(n)<0?'down':'neutral';
  const config = window.ARZPULSE_CONFIG || {};
  function resolveWorkerURL(){
    const meta=document.querySelector('meta[name="arzpulse-worker-url"]')?.content?.trim()||'';
    const saved=localStorage.getItem('arzpulse_worker_url')||'';
    const c=String(config.WORKER_URL||'').trim();
    const candidates=[saved,c,meta].filter(Boolean);
    const hit=candidates.find(x=>/^https?:\/\//i.test(x)&&!x.includes('YOUR-ARZPULSE-WORKER'));
    workerURL=(hit||'').replace(/\/+$/,'');
    const el=$('#workerEndpointText');
    if(el) el.textContent=workerURL || T('workerMissing');
    return workerURL;
  }
  const workerReady = () => !!workerURL;
  const nowLocalInput = () => { const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000); return d.toISOString().slice(0,16); };

  function loadWatch(){ try{return JSON.parse(localStorage.getItem('arzpulse_watchlist')||'[]').filter(k=>META[k]);}catch{return[];} }
  function saveWatch(){localStorage.setItem('arzpulse_watchlist',JSON.stringify(watchlist));}
  function toggleWatch(key){ watchlist=watchlist.includes(key)?watchlist.filter(k=>k!==key):[...watchlist,key]; saveWatch(); renderMarkets(); renderWatchlist(); if(detailAsset===key)updateDetailWatch(); }

  function toast(msg){
    const el=$('#toast'); if(!el)return;
    el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast);
    window.__toast=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function normalizeLocal(x){
    if(!x)return null;
    return {
      last:Number(x.last ?? x.lastPrice ?? x.latest ?? x.price ?? x.close ?? 0),
      high:Number(x.high ?? x.dayHigh ?? x.highest ?? x.regularMarketDayHigh ?? 0),
      low:Number(x.low ?? x.dayLow ?? x.lowest ?? x.regularMarketDayLow ?? 0),
      volume:Number(x.volume ?? x.baseVolume ?? x.quoteVolume ?? x.volumeSrc ?? x.regularMarketVolume ?? 0),
      bestBuy:Number(x.bestBuy ?? x.buy ?? x.bid ?? 0),
      bestSell:Number(x.bestSell ?? x.sell ?? x.ask ?? 0),
      change:Number(x.change ?? x.percentChange ?? 0),
      timestamp:x.timestamp || null,
      delayed:!!x.delayed,
      symbol:x.symbol || null
    };
  }
  function getAsset(key){
    if(!latest)return null;
    if(key==='GOLD'){
      const x=normalizeLocal(latest.prices?.XAUT);
      return {...(x||{}),last:Number(latest.gold18K||0),change:Number(latest.goldChange ?? x?.change ?? 0),timestamp:latest.timestamp,source:'Nobitex'};
    }
    if(key==='DOLLAR'){
      const x=normalizeLocal(latest.prices?.USDT);
      return {...(x||{}),last:Number(latest.dollarPrice||latest.usdtPrice||x?.last||0),change:Number(latest.dollarChange ?? x?.change ?? 0),timestamp:latest.timestamp,source:'Nobitex'};
    }
    if(latest.prices?.[key])return {...normalizeLocal(latest.prices[key]),source:'Nobitex'};
    if(latest.market?.[key])return {...normalizeLocal(latest.market[key]),source:'Yahoo Finance'};
    return null;
  }

  function formatPrice(key,value){
    const v=Number(value); if(!Number.isFinite(v)||v===0)return '—';
    if(isGlobal(key))return `$${num(v)}`;
    const rate=Number(latest?.dollarPrice||latest?.usdtPrice||0);
    if(currency==='USD')return rate>0?`$${num(v/rate)}`:(lang==='fa'?`${faNum(v)} ریال`:`${num(v)} IRR`);
    return lang==='fa'?`${faNum(v)} ریال`:`${num(v)} IRR`;
  }
  function compactNumber(n){
    const v=Number(n); if(!Number.isFinite(v))return '—';
    if(Math.abs(v)>=1e9)return `${(v/1e9).toFixed(1)}B`;
    if(Math.abs(v)>=1e6)return `${(v/1e6).toFixed(1)}M`;
    if(Math.abs(v)>=1e3)return `${(v/1e3).toFixed(1)}K`;
    return num(v);
  }
  function relativeTime(iso){
    const t=new Date(iso).getTime(); if(!Number.isFinite(t))return '—';
    const sec=Math.max(0,Math.floor((Date.now()-t)/1000));
    if(lang==='en'){
      if(sec<60)return `${sec}s ago`; if(sec<3600)return `${Math.floor(sec/60)}m ago`; if(sec<86400)return `${Math.floor(sec/3600)}h ago`; return `${Math.floor(sec/86400)}d ago`;
    }
    if(sec<60)return `${faNum(sec)} ثانیه پیش`; if(sec<3600)return `${faNum(Math.floor(sec/60))} دقیقه پیش`; if(sec<86400)return `${faNum(Math.floor(sec/3600))} ساعت پیش`; return `${faNum(Math.floor(sec/86400))} روز پیش`;
  }

  const FETCH_TIMEOUT_MS = Number(config.DATA_FETCH_TIMEOUT_MS || 9000);
  const FETCH_RETRIES = Math.max(0, Number(config.DATA_FETCH_RETRIES ?? 2));
  const CACHE_LATEST = 'arzpulse_cache_latest_v2';
  const CACHE_HISTORY = 'arzpulse_cache_history_v2';
  function readCache(key){ try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw):null; } catch { return null; } }
  function writeCache(key,value){ try { localStorage.setItem(key,JSON.stringify(value)); } catch {} }
  async function fetchJSON(url, options={}, retries=FETCH_RETRIES){
    let lastError=null;
    for(let attempt=0;attempt<=retries;attempt++){
      const controller=new AbortController();
      const upstream=options.signal;
      let timedOut=false;
      const timeout=setTimeout(()=>{timedOut=true;controller.abort();}, FETCH_TIMEOUT_MS);
      const signal=upstream && typeof AbortSignal!=='undefined' && AbortSignal.any ? AbortSignal.any([upstream,controller.signal]) : controller.signal;
      try{
        const r=await fetch(`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`,{cache:'no-store',...options,signal});
        if(!r.ok){let body='';try{body=await r.text();}catch{};const e=new Error(body||`HTTP ${r.status}`);e.status=r.status;throw e;}
        return await r.json();
      }catch(err){
        lastError=err;
        if(attempt>=retries)break;
        const delay=Math.min(1200,250*Math.pow(2,attempt))+Math.round(Math.random()*120);
        await new Promise(r=>setTimeout(r,delay));
      }finally{clearTimeout(timeout);}
    }
    throw lastError || new Error('NETWORK_ERROR');
  }

  async function loadData(){
    $('#connectionPill b').textContent=T('checking');
    const cachedLatest=readCache(CACHE_LATEST);
    const cachedHistory=readCache(CACHE_HISTORY);
    let networkLatest=false;
    if(cachedLatest){
      latest=cachedLatest;
      if(Array.isArray(cachedHistory)) history=cachedHistory;
      renderAll();
      setHealth(false);
      $('#healthText').textContent=T('cacheUsed');
    }
    try{
      latest=await fetchJSON(DATA_URL);
      networkLatest=true;
      writeCache(CACHE_LATEST,latest);
      renderAll();
      setHealth(true);
      await maybeLoadStoredProfile();
      await loadHistory();
      writeCache(CACHE_HISTORY,history);
      renderAll();
      setHealth(true);
      if(networkLatest&&cachedLatest) toast(T('reconnected'));
    }catch(err){
      console.error('ArzPulse loadData',err);
      if(!latest){
        latest=null; history=Array.isArray(cachedHistory)?cachedHistory:[]; renderAll(); setHealth(false);
      }else{
        renderAll(); setHealth(false);
      }
    }
  }

  function normalizeHistoryPayload(payload){
    if(Array.isArray(payload))return payload.flatMap(row=>Array.isArray(row)?normalizeHistoryPayload(row):[row]);
    if(Array.isArray(payload?.data))return normalizeHistoryPayload(payload.data);
    if(Array.isArray(payload?.history))return normalizeHistoryPayload(payload.history);
    return payload&&typeof payload==='object'?[payload]:[];
  }
  async function loadHistory(){
    const cached=readCache(CACHE_HISTORY);
    if(Array.isArray(cached)&&cached.length) history=cached;
    let fresh=[];
    try{
      const idx=await fetchJSON(`${HISTORY_BASE}index.json`);
      fresh=normalizeHistoryPayload(idx);
    }catch{}
    if(!fresh.length){
      const baseDate=latest?.timestamp?new Date(latest.timestamp):new Date();
      const urls=[];
      for(let i=0;i<30;i++){
        const d=new Date(baseDate); d.setUTCDate(d.getUTCDate()-i);
        urls.push(`${HISTORY_BASE}${d.toISOString().slice(0,10)}.json`);
      }
      const out=await Promise.all(urls.map(u=>fetchJSON(u).catch(()=>null)));
      fresh=out.flatMap(normalizeHistoryPayload);
    }
    if(fresh.length) history=fresh;
    const seen=new Set();
    history=history.filter(Boolean).map(row=>({...row,time:row.time||row.timestamp||row.date||null})).filter(row=>row.time && !seen.has(`${row.time}|${JSON.stringify(row).slice(0,120)}`)).sort((a,b)=>new Date(a.time||0)-new Date(b.time||0));
    writeCache(CACHE_HISTORY,history);
  }
  function historyValue(row,key){
    if(!row)return NaN;
    if(key==='GOLD')return Number(row.GOLD18K??row.gold18K??row.GOLD??NaN);
    if(key==='DOLLAR')return Number(row.DOLLAR??row.dollarPrice??row.USDT??NaN);
    const direct=row[key]??row.prices?.[key]?.lastPrice??row.prices?.[key]?.last??row.market?.[key]?.last??row.market?.[key]?.price;
    return Number(direct);
  }
  function getSeries(key,range=chartRange){
    const days=range==='1d'?1:range==='30d'?30:7;
    const cutoff=Date.now()-days*86400000;
    const vals=[];
    for(const row of history){
      const stamp=new Date(row?.time||0).getTime();
      if(!stamp||stamp<cutoff)continue;
      const v=historyValue(row,key);
      if(Number.isFinite(v)&&v>0)vals.push(v);
    }
    const current=Number(getAsset(key)?.last||0);
    if(current>0&&(!vals.length||Math.abs(vals.at(-1)-current)>Number.EPSILON))vals.push(current);
    return vals.slice(-720);
  }

  function sparkSVG(values,color='rgb(125,220,255)'){
    const arr=values.map(Number).filter(v=>Number.isFinite(v)&&v>0).slice(-90);
    if(arr.length<2)return `<span class="spark-empty">—</span>`;
    const min=Math.min(...arr),max=Math.max(...arr),span=max-min||1;
    const pts=arr.map((v,i)=>`${(i/(arr.length-1))*100},${92-((v-min)/span)*76}`).join(' ');
    const area=`0,92 ${pts} 100,92`;
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="g-${Math.abs(hashCode(color))}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polyline points="${area}" fill="url(#g-${Math.abs(hashCode(color))})"></polyline><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
  }
  function hashCode(v){let h=0;for(let i=0;i<String(v).length;i++)h=((h<<5)-h)+String(v).charCodeAt(i)|0;return h;}

  function allKeys(){return DEFAULT_ORDER.filter(k=>getAsset(k));}

  function renderAll(){
    setTheme();setDensity();setCurrency();renderClock();renderTicker();renderOverview();renderMarkets();renderStatus();renderChartControls();renderChart();renderStats();renderWatchlist();renderComparison();renderGalaxy();renderPortfolio();$('#coverageCount').textContent=allKeys().length||'—';
    const ts=latest?.timestamp;$('#lastUpdateText').textContent=ts?relativeTime(ts):'—';$('#ageText').textContent=ts?relativeTime(ts):'—';$('#overviewUpdated').textContent=ts?relativeTime(ts):'—';$('#dataCount').textContent=allKeys().length?`${allKeys().length} ${lang==='en'?'assets':'دارایی'}`:'—';updateActiveNav();
  }

  function renderClock(){
    const locale=lang==='fa'?'fa-IR':'en-US';
    $('#marketClock').textContent=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
  }
  function renderOverview(){
    const html=OVERVIEW_ORDER.map(k=>{
      const a=getAsset(k);if(!a?.last)return '';
      const m=META[k],color=`rgb(${m.color})`,s=getSeries(k);
      return `<button class="overview-tile" type="button" data-overview="${k}" style="--asset:${m.color}"><div class="overview-tile-top"><span>${escapeHtml(lang==='en'?m.name:m.fa)}</span><span>${m.short}</span></div><div class="overview-tile-price">${escapeHtml(formatPrice(k,a.last))}</div><div class="overview-tile-bottom"><span>${T('change')}</span><span class="${cls(a.change)}">${formatPct(a.change)}</span></div><div class="overview-spark">${sparkSVG(s,color)}</div></button>`;
    }).join('');
    $('#overviewGrid').innerHTML=html||Array.from({length:6},()=>`<div class="overview-tile skeleton"><div></div><div></div><div></div></div>`).join('');
    $$('#overviewGrid [data-overview]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.overview)));
  }
  function marketCard(key){
    const a=getAsset(key);if(!a?.last)return '';
    const m=META[key],favorite=watchlist.includes(key),color=`rgb(${m.color})`,buy=a.bestBuy||0,sell=a.bestSell||0,spread=(buy&&sell)?sell-buy:0;
    return `<article class="market-card interactive" data-key="${key}" tabindex="0" style="--asset:${m.color};--asset-color:${color}"><span class="accent-line"></span><div class="market-head"><div class="asset-title"><span class="asset-icon">${m.icon}</span><span><b>${escapeHtml(lang==='en'?m.name:m.fa)}</b><small>${m.short} · ${isGlobal(key)?T('global'):T('local')}</small></span></div><button class="favorite ${favorite?'active':''}" type="button" data-fav="${key}" aria-label="${T('watchlist')}">${favorite?'★':'☆'}</button></div><div class="market-price"><strong>${escapeHtml(formatPrice(key,a.last))}</strong><span class="change ${cls(a.change)}">${formatPct(a.change)}</span></div><div class="market-meta"><div class="meta-box"><span>${T('high')}</span><b>${a.high?escapeHtml(formatPrice(key,a.high)):'—'}</b></div><div class="meta-box"><span>${T('low')}</span><b>${a.low?escapeHtml(formatPrice(key,a.low)):'—'}</b></div><div class="meta-box"><span>${T('volume')}</span><b>${a.volume?compactNumber(a.volume):'—'}</b></div><div class="meta-box"><span>${T('spread')}</span><b>${spread?escapeHtml(formatPrice(key,spread)):'—'}</b></div></div><div class="card-spark">${sparkSVG(getSeries(key),color)}</div><div class="card-footer"><span class="asset-source"><i></i>${escapeHtml(a.source||'—')}</span><span>${a.delayed?T('delayed'):a.timestamp?relativeTime(a.timestamp):'—'}</span></div></article>`;
  }
  function renderMarkets(){
    const keys=DEFAULT_ORDER.filter(k=>getAsset(k)).filter(k=>activeFilter==='all'||META[k].cat===activeFilter);
    $('#marketGrid').innerHTML=keys.map(marketCard).join('')||`<div class="notice glass"><div>${T('noData')}</div></div>`;
    $$('#marketGrid [data-fav]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleWatch(b.dataset.fav);}));
    $$('#marketGrid [data-key]').forEach(card=>{card.addEventListener('click',e=>{if(!e.target.closest('[data-fav]'))openDetail(card.dataset.key);});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(card.dataset.key);}});});
    setupTilt();
  }
  function renderTicker(){
    clearTimeout(tickerTimer);
    const items=allKeys().map(k=>{const a=getAsset(k);if(!a?.last)return '';return `<div class="ticker-item"><span class="ticker-symbol">${META[k].short}</span><span class="ticker-price">${escapeHtml(formatPrice(k,a.last))}</span><span class="ticker-change ${cls(a.change)}">${formatPct(a.change)}</span></div>`;}).join('');
    const track=$('#tickerTrack');track.innerHTML=`<div class="ticker-group">${items}</div><div class="ticker-group">${items}</div>`;
    requestAnimationFrame(()=>{const gs=$$('#tickerTrack .ticker-group');if(gs.length<2)return;const width=gs[0].getBoundingClientRect().width;track.style.setProperty('--loop-distance',`${-width}px`);track.style.setProperty('--loop-duration',`${Math.max(22,width/44)}s`);track.classList.add('is-loop');});
  }

  function renderGalaxy(){
    const map=[['galaxyDollar','DOLLAR',v=>compactNumber(v)],['galaxyBtc','BTC',v=>compactNumber(v)],['galaxyGold','GOLD',v=>compactNumber(v)],['galaxyOil','BRENT',v=>`$${num(v)}`]];
    for(const [id,key,fn] of map){const a=getAsset(key);$('#'+id).textContent=a?.last?fn(a.last):'—';}
    $('#galaxyPulseStatus').textContent=latest?'●':'○';$('#galaxyPulseSub').textContent=latest?'LIVE':'WAIT';
  }

  function renderStatus(){
    const keys=allKeys(),changes=keys.map(k=>Number(getAsset(k)?.change)).filter(Number.isFinite);
    const up=changes.filter(x=>x>0).length,down=changes.filter(x=>x<0).length,breadth=changes.length?Math.round(up/changes.length*100):0,avg=changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:0;
    const volatility=changes.length?Math.min(100,changes.reduce((a,b)=>a+Math.abs(b),0)/changes.length*12):0;
    const score=changes.length?Math.max(0,Math.min(100,Math.round(50+avg*4+(breadth-50)*.35-volatility*.1))):0;
    $('#pulseScoreBig').textContent=changes.length?score:'—';$('#pulseLabel').textContent=changes.length?(score>=67?T('up'):score<=33?T('down'):T('balanced')):'—';
    $('#breadthValue').textContent=changes.length?`${breadth}%`:'—';$('#breadthLabel').textContent=changes.length?(breadth>=60?T('up'):breadth<=40?T('down'):T('balanced')):'—';$('#breadthMeter').style.width=`${breadth}%`;
    $('#breadthUp').textContent=`${up} ${T('up')}`;$('#breadthDown').textContent=`${down} ${T('down')}`;$('#avgChange').textContent=changes.length?formatPct(avg):'—';
    $('#momentumValue').textContent=changes.length?formatPct(avg):'—';$('#momentumLabel').textContent=changes.length?(avg>0?T('up'):avg<0?T('down'):T('balanced')):'—';
    const bars=[.28,.42,.56,.7,.85,Math.max(.18,Math.min(1,Math.abs(avg)/3))];$('#momentumBars').innerHTML=bars.map((h,i)=>`<i style="height:${Math.round(h*32)}px;opacity:${.45+i*.08}"></i>`).join('');
    $('#volatilityValue').textContent=changes.length?Math.round(volatility):'—';$('#volatilityLabel').textContent=changes.length?(volatility<25?T('fresh'):volatility<55?T('balanced'):T('down')):'—';$('#volatilityNeedle').style.left=`${Math.min(100,volatility)}%`;
    const maxMove=keys.map(k=>({k,v:Math.abs(Number(getAsset(k)?.change||0))})).sort((a,b)=>b.v-a.v)[0];$('#largestMove').textContent=maxMove?.v?`${META[maxMove.k].short} ${formatPct(getAsset(maxMove.k).change)}`:'—';
    const good=keys.filter(k=>getAsset(k)?.last).length,errors=Number(latest?.errorDetails?.length||0),health=keys.length?Math.round(good/DEFAULT_ORDER.length*100-errors*4):0;
    $('#healthPercent').textContent=keys.length?`${Math.max(0,Math.min(100,health))}%`:'—';$('#healthLabel').textContent=health>=80?T('fresh'):T('stale');$('#freshness').textContent=latest?.timestamp?relativeTime(latest.timestamp):'—';$('#sourceCount').textContent=new Set(keys.map(k=>isGlobal(k)?'Yahoo':'Nobitex')).size||'—';$('#errorCount').textContent=errors;
    const leaders=keys.map(k=>({k,change:Number(getAsset(k)?.change||0)})).sort((a,b)=>b.change-a.change).slice(0,3);$('#leaderList').innerHTML=leaders.length?leaders.map(x=>`<div class="leader"><div class="leader-name"><i style="--asset-color:rgb(${META[x.k].color})">${META[x.k].icon}</i><span>${escapeHtml(lang==='en'?META[x.k].name:META[x.k].fa)}</span></div><small class="${cls(x.change)}">${formatPct(x.change)}</small></div>`).join(''):'<span class="subtle">—</span>';
    renderSessions();
  }
  function renderSessions(){
    const now=new Date(),h=now.getUTCHours()+now.getUTCMinutes()/60;
    const sessions=[[T('iran'),h>=5.5&&h<14.5,'09:00–18:00 local'],[T('london'),h>=7&&h<16,'08:00–17:00 local'],[T('newYork'),h>=13.5&&h<21,'09:30–16:00 ET']];
    $('#sessionGrid').innerHTML=sessions.map(([name,open,time])=>`<div class="session"><div class="session-top"><span class="session-name">${name}</span><span class="session-badge ${open?'session-open':'session-closed'}">${open?T('open'):T('closed')}</span></div><div class="session-time">${time}</div></div>`).join('');
  }

  function renderChartControls(){
    $('#chartAssetControls').innerHTML=CHARTABLE.filter(k=>getAsset(k)).map(k=>`<button type="button" class="${k===chartAsset?'active':''}" data-chart-asset="${k}">${META[k].short}</button>`).join('');
    $$('#chartAssetControls button').forEach(b=>b.addEventListener('click',()=>{chartAsset=b.dataset.chartAsset;renderChartControls();renderChart();renderStats();}));
    $$('#chartRangeControls button').forEach(b=>b.classList.toggle('active',b.dataset.range===chartRange));
  }
  function renderChart(){
    const svg=$('#mainChart');const vals=getSeries(chartAsset);svg.innerHTML='';
    if(vals.length<2){$('#chartEmpty').style.display='grid';$('#chartEmpty').textContent=history.length?T('historyMissing'):'Historical data is not available for this asset yet.';return;}
    $('#chartEmpty').style.display='none';
    const W=1000,H=400,pad={l:54,r:24,t:22,b:34},min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
    const x=i=>pad.l+(i/(vals.length-1))*(W-pad.l-pad.r),y=v=>pad.t+(1-(v-min)/span)*(H-pad.t-pad.b),points=vals.map((v,i)=>[x(i),y(v)]),line=points.map(p=>p.join(',')).join(' ');
    const area=`${pad.l},${H-pad.b} ${line} ${W-pad.r},${H-pad.b}`,m=META[chartAsset],color=`rgb(${m.color})`;
    const grid=[0,.25,.5,.75,1].map(t=>{const yy=pad.t+t*(H-pad.t-pad.b),value=max-(max-min)*t;return `<line class="chart-gridline" x1="${pad.l}" x2="${W-pad.r}" y1="${yy}" y2="${yy}"></line><text class="chart-label" x="8" y="${yy+4}">${escapeHtml(isGlobal(chartAsset)?`$${num(value)}`:currency==='USD'?`$${num(value/(latest?.dollarPrice||1))}`:(lang==='fa'?faNum(value):num(value)))}</text>`;}).join('');
    const last=points.at(-1);
    svg.innerHTML=`<defs><linearGradient id="mainArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${grid}<polyline class="chart-area" points="${area}" style="fill:url(#mainArea)"></polyline><polyline class="chart-line" points="${line}" style="stroke:${color}"></polyline><circle cx="${last[0]}" cy="${last[1]}" r="5" fill="${color}" class="chart-last-dot"></circle>`;
    $('#chartHeading').textContent=lang==='en'?m.name:m.fa;
    setupChartPointer();
  }
  function setupChartPointer(){
    const wrap=$('.chart-wrap'),svg=$('#mainChart'),tip=$('#chartCrosshair'); if(!wrap||!svg)return;
    svg.onpointermove=e=>{const rect=svg.getBoundingClientRect();const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));const vals=getSeries(chartAsset);if(vals.length<2)return;const i=Math.round(x*(vals.length-1)),v=vals[i];tip.hidden=false;tip.textContent=`${META[chartAsset].short} · ${formatPrice(chartAsset,v)}`;tip.style.left=`${Math.min(88,Math.max(5,x*100))}%`;};
    svg.onpointerleave=()=>{tip.hidden=true;};
  }

  function renderStats(){
    const a=getAsset(chartAsset),rows=[[T('last'),a?.last?formatPrice(chartAsset,a.last):'—'],[T('high'),a?.high?formatPrice(chartAsset,a.high):'—'],[T('low'),a?.low?formatPrice(chartAsset,a.low):'—'],[T('volume'),a?.volume?compactNumber(a.volume):'—'],[T('bestBuy'),a?.bestBuy?formatPrice(chartAsset,a.bestBuy):'—'],[T('bestSell'),a?.bestSell?formatPrice(chartAsset,a.bestSell):'—'],[T('source'),a?.source||'—']];
    $('#statsList').innerHTML=rows.map(([k,v])=>`<div class="stats-row"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('');
  }
  function renderWatchlist(){
    const items=watchlist.map(k=>({k,a:getAsset(k)})).filter(x=>x.a?.last);
    $('#watchlist').innerHTML=items.length?items.map(({k,a})=>`<button class="watch-row" type="button" data-watch-open="${k}"><div class="watch-name"><i style="--asset-color:rgb(${META[k].color})">${META[k].icon}</i><span>${escapeHtml(lang==='en'?META[k].name:META[k].fa)}</span></div><span class="${cls(a.change)}">${formatPct(a.change)}</span></button>`).join(''):`<div class="watch-empty">${T('noWatch')}</div>`;
    $$('#watchlist [data-watch-open]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.watchOpen)));
  }
  function renderComparison(){
    const keys=allKeys().map(k=>({k,s:getSeries(k)})).filter(x=>x.s.length>=2).sort((a,b)=>Math.abs((b.s.at(-1)/b.s[0]-1)) - Math.abs((a.s.at(-1)/a.s[0]-1)));
    $('#comparisonCaption').textContent=history.length?`${Math.min(history.length,720)} ${lang==='en'?'data points':'نقطه داده'}`:'—';
    $('#comparisonGrid').innerHTML=keys.map(({k,s})=>{const delta=((s.at(-1)/s[0])-1)*100,m=META[k],width=Math.min(100,Math.abs(delta)*7+8);return `<div class="comparison-item interactive"><div class="comparison-top"><span class="comparison-name"><i style="--asset-color:rgb(${m.color})">${m.icon}</i>${escapeHtml(lang==='en'?m.name:m.fa)}</span><span class="${cls(delta)}">${formatPct(delta)}</span></div><div class="comparison-bar"><span style="width:${width}%;background:linear-gradient(90deg,rgb(${m.color}),rgba(${m.color},.22))"></span></div></div>`;}).join('')||`<div class="subtle">${T('historyMissing')}</div>`;
  }

  function openDetail(key){
    const a=getAsset(key);if(!a)return;detailAsset=key;const m=META[key];$('#detailLogo').textContent=m.icon;$('#detailName').textContent=lang==='en'?m.name:m.fa;$('#detailSymbol').textContent=`${m.short} · ${isGlobal(key)?T('global'):T('local')}`;$('#detailPrice').textContent=formatPrice(key,a.last);$('#detailChange').className=`change ${cls(a.change)}`;$('#detailChange').textContent=formatPct(a.change);
    const rows=[[T('last'),formatPrice(key,a.last)],[T('high'),a.high?formatPrice(key,a.high):'—'],[T('low'),a.low?formatPrice(key,a.low):'—'],[T('volume'),a.volume?compactNumber(a.volume):'—'],[T('bestBuy'),a.bestBuy?formatPrice(key,a.bestBuy):'—'],[T('bestSell'),a.bestSell?formatPrice(key,a.bestSell):'—'],[T('spread'),a.bestBuy&&a.bestSell?formatPrice(key,a.bestSell-a.bestBuy):'—'],[T('source'),a.source||'—'],[T('updated'),a.timestamp?relativeTime(a.timestamp):'—']];
    $('#detailGrid').innerHTML=rows.map(([k,v])=>`<div class="detail-stat"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('');$('#detailMiniChart').innerHTML=sparkSVG(getSeries(key),`rgb(${m.color})`);updateDetailWatch();$('#detailPanel').hidden=false;document.body.style.overflow='hidden';
  }
  function updateDetailWatch(){$('#detailWatch').textContent=watchlist.includes(detailAsset)?'★':'☆';}
  function closeDetail(){$('#detailPanel').hidden=true;document.body.style.overflow='';}

  function setTheme(){document.body.classList.toggle('light',theme==='light');$('#themeGlyph').textContent=theme==='light'?'☀':'◐';}
  function setDensity(){document.body.classList.toggle('compact',density==='compact');$$('#densityToggle button').forEach(b=>b.classList.toggle('active',b.dataset.density===density));}
  function setCurrency(){$$('#currencyToggle button').forEach(b=>b.classList.toggle('active',b.dataset.currency===currency));}
  function applyLanguage(){document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';document.body.classList.toggle('rtl',lang==='fa');$$('[data-i18n]').forEach(el=>el.textContent=T(el.dataset.i18n));$('#langBtn').textContent=lang==='en'?'FA':'EN';$('#chartHint').textContent=T('clickHint');workerURL=resolveWorkerURL();renderAll();}

  function setHealth(ok){
    const pill=$('#connectionPill'),dot=$('#healthDot');pill.classList.toggle('offline',!ok);pill.querySelector('i').style.background=ok?'var(--green)':'var(--red)';pill.querySelector('b').textContent=ok?T('liveMarket'):'Offline';dot.style.background=ok?'var(--green)':'var(--red)';$('#healthText').textContent=ok?(latest?.hasError?`Data loaded with ${latest.errorDetails?.length||0} collector issue(s).`:`${T('dataHealth')}: ${T('fresh')}.`):'Data file could not be loaded.';$('#healthAge').textContent=latest?.timestamp?relativeTime(latest.timestamp):'—';$('#overviewStatus').textContent=ok?T('connected'):'Offline';
  }

  function setupTilt(){
    if(!matchMedia('(pointer:fine)').matches)return;
    $$('.interactive').forEach(el=>{if(el.dataset.tiltBound)return;el.dataset.tiltBound='1';el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(1100px) rotateX(${(-y*2.1).toFixed(2)}deg) rotateY(${(x*2.5).toFixed(2)}deg) translateY(-2px)`;el.style.setProperty('--mx',`${(x+.5)*100}%`);el.style.setProperty('--my',`${(y+.5)*100}%`);});el.addEventListener('pointerleave',()=>{el.style.transform='';});});
  }
  function setupAmbient(){
    const c=$('#ambientCanvas'),ctx=c.getContext('2d');if(!ctx)return;let w=0,h=0,dpr=1,stars=[];
    function resize(){dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:Math.min(105,Math.floor(w/15))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.1+.25,a:Math.random()*.65+.1,s:Math.random()*.011+.003}))}
    function loop(){ctx.clearRect(0,0,w,h);for(const s of stars){s.a+=s.s*(Math.random()>.5?1:-1);s.a=Math.max(.08,Math.min(.88,s.a));ctx.beginPath();ctx.fillStyle=`rgba(106,214,244,${s.a*.48})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}requestAnimationFrame(loop);}
    addEventListener('resize',resize,{passive:true});resize();loop();
  }

  function getPortfolioCurrent(symbol){
    const a=getAsset(symbol);return Number(a?.last||0);
  }
  function portfolioCurrency(symbol){return isGlobal(symbol)?'USD':'IRR';}
  function portfolioName(symbol){return lang==='en'?META[symbol]?.name||symbol:META[symbol]?.fa||symbol;}
  function toIRR(symbol,amount){
    const v=Number(amount);if(!Number.isFinite(v))return 0;
    if(!isGlobal(symbol))return v;
    const fx=Number(latest?.dollarPrice||latest?.usdtPrice||0);return fx>0?v*fx:0;
  }
  function fromIRR(symbol,amount){
    const v=Number(amount);if(!Number.isFinite(v))return 0;
    if(!isGlobal(symbol))return v;
    const fx=Number(latest?.dollarPrice||latest?.usdtPrice||0);return fx>0?v/fx:0;
  }
  function portfolioMetrics(){
    if(!profile)return {lots:[],investedIRR:0,currentIRR:0,pnlIRR:0,roi:0,dayPnlIRR:0,realizedIRR:0};
    let investedIRR=0,currentIRR=0,dayPnlIRR=0;
    const lots=(profile.holdings||[]).map(h=>{
      const q=Number(h.quantity)||0,buy=Number(h.buyPrice)||0,current=getPortfolioCurrent(h.symbol),invested=q*buy,currentValue=q*current,pnl=currentValue-invested,cur=portfolioCurrency(h.symbol),investedIRR2=toIRR(h.symbol,invested),currentIRR2=toIRR(h.symbol,currentValue),pnlIRR2=currentIRR2-investedIRR2,dayPnlNative=currentValue*(Number(getAsset(h.symbol)?.change||0)/100);
      investedIRR+=investedIRR2;currentIRR+=currentIRR2;dayPnlIRR+=toIRR(h.symbol,dayPnlNative);
      return {...h,q,buy,current,invested,currentValue,pnl,roi:invested?((pnl/invested)*100):0,investedIRR:investedIRR2,currentIRR:currentIRR2,pnlIRR:pnlIRR2,cur};
    });
    const realized=(profile.realized||[]).reduce((sum,x)=>sum+toIRR(x.symbol,Number(x.pnl||0)),0);
    return {lots,investedIRR,currentIRR,pnlIRR:currentIRR-investedIRR,roi:investedIRR?((currentIRR-investedIRR)/investedIRR)*100:0,dayPnlIRR,realizedIRR:realized};
  }
  function moneyIRR(v){return lang==='fa'?`${faNum(Math.round(v))} ریال`:`${num(Math.round(v))} IRR`;}
  function moneyNative(symbol,v){return isGlobal(symbol)?`$${num(v)}`:moneyIRR(v);}
  function renderPortfolio(){
    resolveWorkerURL();
    const guest=$('#portfolioGuest'),workspace=$('#portfolioWorkspace');
    if(!profile){guest.hidden=false;workspace.hidden=true;$('#portfolioProfileBadge').innerHTML=`<span>●</span><b>${T('guest')}</b>`;return;}
    guest.hidden=true;workspace.hidden=false;
    const name=profile.displayName||profile.username;$('#portfolioDisplayName').textContent=name;$('#portfolioUsername').textContent=profile.username;$('#portfolioAvatar').textContent=(name[0]||'A').toUpperCase();
    $('#portfolioProfileBadge').innerHTML=`<span>●</span><b>${profileReadOnly?T('readOnly'):T('editing')}</b>`;
    $('#portfolioHoldingCount').textContent=String(profile.holdings?.length||0);
    renderPortfolioSummary();renderPortfolioHoldings();renderPortfolioAllocation();renderRealized();populatePortfolioSelectors();applyPortfolioEditState();
  }
  function renderPortfolioSummary(){
    const m=portfolioMetrics(),cards=[[T('invested'),moneyIRR(m.investedIRR),''],[T('portfolioValue'),moneyIRR(m.currentIRR),m.currentIRR>=m.investedIRR?'up':'down'],[T('unrealized'),moneyIRR(m.pnlIRR),cls(m.pnlIRR)],[T('roi'),formatPct(m.roi),cls(m.roi)],[T('dayPnl'),moneyIRR(m.dayPnlIRR),cls(m.dayPnlIRR)],[T('realized'),moneyIRR(m.realizedIRR),cls(m.realizedIRR)]];
    $('#portfolioSummaryGrid').innerHTML=cards.map(([k,v,c])=>`<div class="portfolio-metric interactive"><span>${escapeHtml(k)}</span><strong class="${c}">${escapeHtml(v)}</strong><small>${k===T('roi')?'portfolio return':profile.holdings?.length?`${profile.holdings.length} ${T('lots')}`:'—'}</small></div>`).join('');
  }
  function renderPortfolioHoldings(){
    const {lots}=portfolioMetrics(),body=$('#portfolioHoldingsBody'),mobile=$('#portfolioMobileList');
    if(!lots.length){body.innerHTML=`<tr><td colspan="7"><div class="empty-state">${T('noPositions')}</div></td></tr>`;mobile.innerHTML=`<div class="empty-state">${T('noPositions')}</div>`;return;}
    body.innerHTML=lots.map(h=>`<tr><td><div class="portfolio-asset"><i style="--asset-color:rgb(${META[h.symbol].color})">${META[h.symbol].icon}</i><div><b>${escapeHtml(portfolioName(h.symbol))}</b><small>${h.symbol} · ${h.cur}</small></div></div></td><td>${escapeHtml(num(h.q))}</td><td>${escapeHtml(moneyNative(h.symbol,h.buy))}</td><td>${escapeHtml(moneyNative(h.symbol,h.current))}</td><td>${escapeHtml(moneyIRR(h.currentIRR))}</td><td><strong class="${cls(h.pnl)}">${escapeHtml(moneyNative(h.symbol,h.pnl))}</strong><small class="${cls(h.roi)}">${formatPct(h.roi)}</small></td><td><button class="mini-danger" type="button" data-remove-lot="${escapeHtml(h.id)}" ${profileReadOnly?'disabled':''}>×</button></td></tr>`).join('');
    mobile.innerHTML=lots.map(h=>`<article class="portfolio-mobile-row"><div class="portfolio-asset"><i style="--asset-color:rgb(${META[h.symbol].color})">${META[h.symbol].icon}</i><div><b>${escapeHtml(portfolioName(h.symbol))}</b><small>${h.symbol} · ${num(h.q)} ${h.cur}</small></div></div><div class="mobile-row-grid"><span><small>${T('entry')}</small><b>${escapeHtml(moneyNative(h.symbol,h.buy))}</b></span><span><small>${T('current')}</small><b>${escapeHtml(moneyNative(h.symbol,h.current))}</b></span><span><small>${T('value')}</small><b>${escapeHtml(moneyIRR(h.currentIRR))}</b></span><span><small>${T('pnl')}</small><b class="${cls(h.pnl)}">${escapeHtml(moneyNative(h.symbol,h.pnl))} · ${formatPct(h.roi)}</b></span></div><button class="mini-danger" type="button" data-remove-lot="${escapeHtml(h.id)}" ${profileReadOnly?'disabled':''}>${T('remove')}</button></article>`).join('');
    $$('[data-remove-lot]').forEach(b=>b.addEventListener('click',()=>removeHolding(b.dataset.removeLot)));
  }
  function renderPortfolioAllocation(){
    const {lots}=portfolioMetrics(),map=new Map();for(const h of lots)map.set(h.symbol,(map.get(h.symbol)||0)+h.currentIRR);const total=[...map.values()].reduce((a,b)=>a+b,0);
    $('#portfolioAllocation').innerHTML=[...map.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const pct=total?(v/total)*100:0;return `<div class="allocation-row"><div class="allocation-top"><span><i style="--asset-color:rgb(${META[k].color})">${META[k].icon}</i>${escapeHtml(portfolioName(k))}</span><b>${pct.toFixed(1)}%</b></div><div class="allocation-bar"><span style="width:${pct}%;background:linear-gradient(90deg,rgb(${META[k].color}),rgba(${META[k].color},.2))"></span></div></div>`;}).join('')||`<div class="empty-state">${T('noPositions')}</div>`;
  }
  function renderRealized(){
    const list=(profile?.realized||[]).slice(-12).reverse();
    $('#realizedList').innerHTML=list.length?list.map(x=>`<div class="realized-row"><div><b>${escapeHtml(portfolioName(x.symbol))}</b><small>${new Date(x.date).toLocaleDateString(lang==='fa'?'fa-IR':'en-US')} · ${num(x.quantity)}</small></div><strong class="${cls(x.pnl)}">${escapeHtml(moneyNative(x.symbol,x.pnl))}</strong></div>`).join(''):`<div class="empty-state">${T('noneYet')}</div>`;
  }
  function populatePortfolioSelectors(){
    const html=DEFAULT_ORDER.map(k=>`<option value="${k}">${escapeHtml(lang==='en'?META[k].name:META[k].fa)} (${META[k].short})${isGlobal(k)?' · USD':' · IRR'}</option>`).join('');
    $('#holdingSymbol').innerHTML=html;$('#sellSymbol').innerHTML=html;
    updateHoldingQuote();
  }
  function updateHoldingQuote(){
    const k=$('#holdingSymbol')?.value,q=Number($('#holdingQuantity')?.value||0),price=Number($('#holdingBuyPrice')?.value||0);
    if(!k){$('#holdingQuote').textContent='—';return;}
    $('#holdingQuote').textContent=price>0&&q>0?`${T('value')}: ${escapeHtml(moneyNative(k,q*price))}`:`${T('current')}: ${escapeHtml(moneyNative(k,getPortfolioCurrent(k)))}`;
  }
  function applyPortfolioEditState(){
    const editable=!!profile&&!!profilePin&&!profileReadOnly;
    $$('#holdingForm input,#holdingForm select,#holdingForm button,#sellForm input,#sellForm select,#sellForm button').forEach(el=>el.disabled=!editable);
    $('#portfolioLogoutBtn').textContent=editable?T('logOut'):T('unlock');
    $('#portfolioRefreshBtn').disabled=false;
  }

  async function apiRequest(path,method='GET',body=null){
    if(!workerReady())throw new Error('WORKER_NOT_CONFIGURED');
    const opts={method,headers:{Accept:'application/json','Content-Type':'application/json'}};
    if(body)opts.body=JSON.stringify(body);
    return await fetchJSON(`${workerURL}${path}`,opts);
  }
  async function getPublicProfile(username){
    const u=encodeURIComponent(username.trim().toLowerCase());return apiRequest(`/api/profile?username=${u}`,'GET');
  }
  async function createOrOpenProfile(username,pin,displayName=''){
    if(!workerReady())throw new Error('WORKER_NOT_CONFIGURED');
    return apiRequest('/api/profile','POST',{action:'create_or_open',username,pin,displayName});
  }
  async function portfolioAction(action,payload={}){
    const operationId=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try{
      return await apiRequest('/api/profile/portfolio','POST',{action,username:profile?.username,pin:profilePin,operationId,...payload});
    }catch(err){
      if(err.status===409 && err.message && /CONFLICT/.test(err.message)){ toast(T('conflict')); await refreshProfile(false); }
      throw err;
    }
  }
  async function refreshProfile(preserveEdit=true){
    if(!profile?.username)return;
    try{
      profile=await getPublicProfile(profile.username);
      profileReadOnly=!profilePin||!preserveEdit;
      renderPortfolio();toast(T('profileUpdated'));
    }catch(e){console.error(e);toast(T('badWorker'));}
  }
  async function maybeLoadStoredProfile(){
    const u=new URLSearchParams(location.search).get('profile')||localStorage.getItem('arzpulse_profile_username');
    if(!u)return;
    const clean=u.toLowerCase().trim();if(!/^[a-z0-9][a-z0-9_-]{2,24}$/.test(clean))return;
    try{profile=await getPublicProfile(clean);profileReadOnly=true;localStorage.setItem('arzpulse_profile_username',clean);renderPortfolio();if(new URLSearchParams(location.search).has('profile'))$('#portfolio').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){console.warn('profile load',e);}
  }

  async function handleProfileForm(e){
    e.preventDefault();const username=$('#profileUsername').value.trim().toLowerCase(),pin=$('#profilePin').value,displayName=$('#profileDisplayName').value.trim();
    if(!/^[a-z0-9][a-z0-9_-]{2,24}$/.test(username)){toast('Username: 3–25 chars, letters/numbers/_/-');return;}
    if(pin.length<4){toast('PIN must contain at least 4 characters.');return;}
    try{
      const out=await createOrOpenProfile(username,pin,displayName);profile=out.profile||out;profilePin=pin;profileReadOnly=false;localStorage.setItem('arzpulse_profile_username',username);renderPortfolio();toast(T('profileCreated'));$('#portfolio').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(err){console.error(err);toast(err.status===401?T('wrongPin'):err.message==='WORKER_NOT_CONFIGURED'?T('needWorker'):T('badWorker'));}
  }
  async function addHolding(e){
    e.preventDefault();if(!profilePin||profileReadOnly)return;
    const symbol=$('#holdingSymbol').value,quantity=Number($('#holdingQuantity').value),buyPrice=Number($('#holdingBuyPrice').value),buyDate=$('#holdingBuyDate').value?new Date($('#holdingBuyDate').value).toISOString():new Date().toISOString(),note=$('#holdingNote').value.trim();
    if(!(quantity>0&&buyPrice>0)){toast(T('invalidNumber'));return;}
    try{const out=await portfolioAction('add',{holding:{symbol,quantity,buyPrice,buyDate,note}});profile=out.profile;renderPortfolio();e.target.reset();$('#holdingBuyDate').value=nowLocalInput();toast(T('holdingAdded'));}catch(err){console.error(err);toast(err.status===401?T('wrongPin'):T('badWorker'));}
  }
  async function sellHolding(e){
    e.preventDefault();if(!profilePin||profileReadOnly)return;
    const symbol=$('#sellSymbol').value,quantity=Number($('#sellQuantity').value),price=Number($('#sellPrice').value)||getPortfolioCurrent(symbol);
    if(!(quantity>0&&price>0)){toast(T('invalidNumber'));return;}
    try{const out=await portfolioAction('sell',{symbol,quantity,price});profile=out.profile;renderPortfolio();e.target.reset();toast(T('saleRecorded'));}catch(err){console.error(err);toast(err.status===401?T('wrongPin'):T('badWorker'));}
  }
  async function removeHolding(id){
    if(!profilePin||profileReadOnly)return;if(!confirm(T('confirmRemove')))return;
    try{const out=await portfolioAction('remove',{holdingId:id});profile=out.profile;renderPortfolio();toast(T('holdingRemoved'));}catch(err){console.error(err);toast(err.status===401?T('wrongPin'):T('badWorker'));}
  }
  function unlockProfile(){
    if(!profile)return;
    openModal('Unlock profile',`<form id="unlockForm" class="modal-form"><p class="modal-text">${escapeHtml(T('publicProfile'))}: <b>@${escapeHtml(profile.username)}</b></p><label><span>${T('pin')}</span><input id="unlockPin" type="password" inputmode="numeric" minlength="4" maxlength="32" required autofocus></label><button class="primary-btn wide" type="submit">${T('unlock')}</button></form>`);
    $('#unlockForm').addEventListener('submit',async e=>{e.preventDefault();const pin=$('#unlockPin').value;try{const out=await createOrOpenProfile(profile.username,pin,profile.displayName||'');profile=out.profile||out;profilePin=pin;profileReadOnly=false;closeModal();renderPortfolio();toast(T('profileCreated'));}catch(err){toast(err.status===401?T('wrongPin'):T('badWorker'));}});
  }

  function openModal(title,body){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#simpleModal').hidden=false;document.body.classList.add('modal-open');}
  function closeModal(){$('#simpleModal').hidden=true;$('#modalBody').innerHTML='';document.body.classList.remove('modal-open');}

  function openWorkerConfig(){
    openModal(T('configure'),`<form id="workerForm" class="modal-form"><p class="modal-text">${escapeHtml(T('workerMissing'))}</p><label><span>${T('workerEndpoint')}</span><input id="workerUrlInput" type="url" placeholder="https://your-worker.workers.dev" value="${escapeHtml(workerURL)}" required></label><button class="primary-btn wide" type="submit">${T('configure')}</button></form>`);
    $('#workerForm').addEventListener('submit',e=>{e.preventDefault();const val=$('#workerUrlInput').value.trim().replace(/\/+$/,'');if(!/^https?:\/\//i.test(val)){toast('Enter a valid http(s) URL.');return;}localStorage.setItem('arzpulse_worker_url',val);workerURL=val;closeModal();renderPortfolio();toast(T('workerEndpoint')+' ✓');});
  }
  async function shareProfile(){
    if(!profile)return;
    const u=new URL(location.href);u.searchParams.set('profile',profile.username);const value=u.toString();
    try{await navigator.clipboard.writeText(value);toast(T('copyDone'));}catch{prompt('Profile URL',value);}
  }
  async function exportProfileBackup(){
    if(!profile?.username){toast(T('needProfile'));return;}
    let pin=profilePin;
    if(!pin){pin=prompt(lang==='fa'?'PIN پروفایل را وارد کنید:':'Enter your profile PIN:')||'';}
    if(!pin){toast(T('wrongPin'));return;}
    try{
      const out=await apiRequest('/api/profile/export','POST',{username:profile.username,pin});
      const blob=new Blob([JSON.stringify(out.backup||out,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download=`arzpulse-profile-${profile.username}-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast(T('backupSaved'));
    }catch(err){console.error(err);toast(err.status===401?T('wrongPin'):T('backupFailed'));}
  }
  function logOutProfile(){profilePin='';profileReadOnly=true;renderPortfolio();}

  function setupEvents(){
    $('#langBtn').addEventListener('click',()=>{lang=lang==='en'?'fa':'en';localStorage.setItem('arzpulse_lang',lang);applyLanguage();});
    $('#themeBtn').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';localStorage.setItem('arzpulse_theme',theme);setTheme();});
    $('#refreshBtn').addEventListener('click',async()=>{await loadData();toast(T('refreshed'));});
    $('#shareBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast(T('copyDone'));}catch{toast(location.href);}});
    $('#resetWatchlist').addEventListener('click',()=>{watchlist=[];saveWatch();renderWatchlist();renderMarkets();});
    $('#closeDetail').addEventListener('click',closeDetail);$('#detailBackdrop').addEventListener('click',closeDetail);$('#detailWatch').addEventListener('click',()=>{if(detailAsset)toggleWatch(detailAsset)});
    $('#scrollTopBtn').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
    $('#marketFilters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;activeFilter=b.dataset.filter;$$('#marketFilters button').forEach(x=>x.classList.toggle('active',x===b));renderMarkets();});
    $('#currencyToggle').addEventListener('click',e=>{const b=e.target.closest('button[data-currency]');if(!b)return;currency=b.dataset.currency;localStorage.setItem('arzpulse_currency',currency);setCurrency();renderMarkets();renderOverview();renderGalaxy();renderStats();renderChart();renderPortfolio();});
    $('#densityToggle').addEventListener('click',e=>{const b=e.target.closest('button[data-density]');if(!b)return;density=b.dataset.density;localStorage.setItem('arzpulse_density',density);setDensity();});
    $('#chartRangeControls').addEventListener('click',e=>{const b=e.target.closest('button[data-range]');if(!b)return;chartRange=b.dataset.range;localStorage.setItem('arzpulse_chartRange',chartRange);renderChartControls();renderChart();renderComparison();});
    $$('.orbit-node').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.asset)));
    $('#profileForm').addEventListener('submit',handleProfileForm);$('#openPublicProfileBtn').addEventListener('click',()=>{const u=$('#profileUsername').value.trim().toLowerCase();if(!u){toast(T('needProfile'));return;}history.replaceState({},'',`${location.pathname}?profile=${encodeURIComponent(u)}${location.hash}`);maybeLoadStoredProfile();});
    $('#changeWorkerUrl').addEventListener('click',openWorkerConfig);$('#profileRefreshBtn')?.addEventListener('click',refreshProfile);$('#portfolioRefreshBtn').addEventListener('click',()=>refreshProfile(true));$('#portfolioShareBtn').addEventListener('click',shareProfile);$('#portfolioExportBtn')?.addEventListener('click',exportProfileBackup);$('#portfolioLogoutBtn').addEventListener('click',()=>profilePin?logOutProfile():unlockProfile());
    $('#holdingForm').addEventListener('submit',addHolding);$('#sellForm').addEventListener('submit',sellHolding);$('#holdingSymbol').addEventListener('change',updateHoldingQuote);$('#holdingQuantity').addEventListener('input',updateHoldingQuote);$('#holdingBuyPrice').addEventListener('input',updateHoldingQuote);$('#holdingBuyDate').value=nowLocalInput();
    $('#closeSimpleModal').addEventListener('click',closeModal);$('#simpleModal').addEventListener('click',e=>{if(e.target===$('#simpleModal'))closeModal();});
    addEventListener('keydown',e=>{if(e.key==='Escape'){closeDetail();closeModal();}});
    addEventListener('scroll',()=>{$('#scrollTopBtn').classList.toggle('show',scrollY>500);updateActiveNav();},{passive:true});
    setInterval(renderClock,1000);setInterval(()=>{if(latest)renderAll();},60000);
    window.addEventListener('beforeunload',()=>clearTimeout(tickerTimer));
  }

  function updateActiveNav(){const y=scrollY+130,sections=['markets','marketStatus','analytics','portfolio','compare'];let active='markets';for(const id of sections){const el=$('#'+id);if(el&&el.offsetTop<=y)active=id;}$$('.topnav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+active));}
  function boot(){
    chartRange=localStorage.getItem('arzpulse_chartRange')||'7d';workerURL=resolveWorkerURL();applyLanguage();setupEvents();setupAmbient();loadData();setTimeout(()=>$('#holdingBuyDate').value=nowLocalInput(),100);updateActiveNav();
  }
  boot();
})();