(() => {
  'use strict';

  const BASE = location.pathname.includes('/ArzPulse/') ? '/ArzPulse' : '';
  const DATA_URL = `${BASE}/data/latest.json`;
  const HISTORY_BASE = `${BASE}/data/history/`;

  const META = {
    BTC:{name:'Bitcoin',fa:'بیت‌کوین',short:'BTC',cat:'crypto',icon:'₿',color:'246,169,62',global:false, aliases:['BTC','bitcoin']},
    ETH:{name:'Ethereum',fa:'اتریوم',short:'ETH',cat:'crypto',icon:'Ξ',color:'98,126,234',global:false, aliases:['ETH','ethereum']},
    USDT:{name:'Tether',fa:'تتر',short:'USDT',cat:'crypto',icon:'₮',color:'38,190,150',global:false, aliases:['USDT','usdt']},
    NOT:{name:'Notcoin',fa:'نات‌کوین',short:'NOT',cat:'crypto',icon:'N',color:'171,150,255',global:false, aliases:['NOT','not']},
    BNB:{name:'BNB Chain',fa:'بایننس کوین',short:'BNB',cat:'crypto',icon:'◆',color:'243,184,74',global:false, aliases:['bnb','BNB']},
    SOL:{name:'Solana',fa:'سولانا',short:'SOL',cat:'crypto',icon:'◎',color:'143,102,255',global:false, aliases:['sol','SOL']},
    XRP:{name:'XRP',fa:'ریپل',short:'XRP',cat:'crypto',icon:'✕',color:'82,190,235',global:false, aliases:['xrp','XRP']},
    ADA:{name:'Cardano',fa:'کاردانو',short:'ADA',cat:'crypto',icon:'₳',color:'48,110,215',global:false, aliases:['ada','ADA']},
    DOGE:{name:'Dogecoin',fa:'دوج‌کوین',short:'DOGE',cat:'crypto',icon:'Ð',color:'197,164,94',global:false, aliases:['doge','DOGE']},
    TRX:{name:'TRON',fa:'ترون',short:'TRX',cat:'crypto',icon:'T',color:'239,58,77',global:false, aliases:['trx','TRX']},
    LINK:{name:'Chainlink',fa:'چین‌لینک',short:'LINK',cat:'crypto',icon:'⬡',color:'48,104,214',global:false, aliases:['link','LINK']},
    AVAX:{name:'Avalanche',fa:'آوالانچ',short:'AVAX',cat:'crypto',icon:'▲',color:'232,65,84',global:false, aliases:['avax','AVAX']},
    DOT:{name:'Polkadot',fa:'پولکادات',short:'DOT',cat:'crypto',icon:'●',color:'230,65,153',global:false, aliases:['dot','DOT']},
    LTC:{name:'Litecoin',fa:'لایت‌کوین',short:'LTC',cat:'crypto',icon:'Ł',color:'164,178,192',global:false, aliases:['ltc','LTC']},
    BCH:{name:'Bitcoin Cash',fa:'بیت‌کوین کش',short:'BCH',cat:'crypto',icon:'Ƀ',color:'134,196,108',global:false, aliases:['bch','BCH']},
    SHIB:{name:'Shiba Inu',fa:'شیبا اینو',short:'SHIB',cat:'crypto',icon:'S',color:'243,112,132',global:false, aliases:['shib','SHIB']},
    UNI:{name:'Uniswap',fa:'یونی‌سواپ',short:'UNI',cat:'crypto',icon:'🦄',color:'255,0,122',global:false, aliases:['uni','UNI']},
    NEAR:{name:'NEAR Protocol',fa:'نیر',short:'NEAR',cat:'crypto',icon:'N',color:'91,200,188',global:false, aliases:['near','NEAR']},
    SUI:{name:'Sui',fa:'سویی',short:'SUI',cat:'crypto',icon:'S',color:'88,172,255',global:false, aliases:['sui','SUI']},
    XLM:{name:'Stellar',fa:'استلار',short:'XLM',cat:'crypto',icon:'✦',color:'117,111,235',global:false, aliases:['xlm','XLM']},
    ETC:{name:'Ethereum Classic',fa:'اتریوم کلاسیک',short:'ETC',cat:'crypto',icon:'Ξ',color:'62,112,170',global:false, aliases:['etc','ETC']},
    ATOM:{name:'Cosmos',fa:'کازموس',short:'ATOM',cat:'crypto',icon:'⚛',color:'98,164,221',global:false, aliases:['atom','ATOM']},
    APT:{name:'Aptos',fa:'آپتوس',short:'APT',cat:'crypto',icon:'A',color:'66,171,244',global:false, aliases:['apt','APT']},
    FIL:{name:'Filecoin',fa:'فایل‌کوین',short:'FIL',cat:'crypto',icon:'F',color:'0,133,255',global:false, aliases:['fil','FIL']},
    ARB:{name:'Arbitrum',fa:'آربیتروم',short:'ARB',cat:'crypto',icon:'A',color:'43,116,220',global:false, aliases:['arb','ARB']},
    OP:{name:'Optimism',fa:'آپتیمیسم',short:'OP',cat:'crypto',icon:'O',color:'255,4,32',global:false, aliases:['op','OP']},
    HBAR:{name:'Hedera',fa:'هدرا',short:'HBAR',cat:'crypto',icon:'H',color:'130,89,214',global:false, aliases:['hbar','HBAR']},
    INJ:{name:'Injective',fa:'اینجکتیو',short:'INJ',cat:'crypto',icon:'I',color:'0,179,255',global:false, aliases:['inj','INJ']},
    AAVE:{name:'Aave',fa:'آوه',short:'AAVE',cat:'crypto',icon:'A',color:'176,85,207',global:false, aliases:['aave','AAVE']},
    PEPE:{name:'Pepe',fa:'پپه',short:'PEPE',cat:'crypto',icon:'P',color:'67,181,129',global:false, aliases:['pepe','PEPE']},
    GOLD:{name:'18K Gold',fa:'طلای ۱۸ عیار',short:'GOLD',cat:'commodity',icon:'Au',color:'245,197,91',global:false, aliases:['GOLD','gold18K']},
    DOLLAR:{name:'USD / USDT',fa:'دلار / تتر',short:'USD',cat:'index',icon:'$',color:'126,177,255',global:false, aliases:['DOLLAR','USD']},
    BRENT:{name:'Brent Crude',fa:'نفت برنت',short:'BRENT',cat:'commodity',icon:'Br',color:'78,221,179',global:true, aliases:['BRENT']},
    WTI:{name:'WTI Crude',fa:'نفت WTI',short:'WTI',cat:'commodity',icon:'WT',color:'111,223,204',global:true, aliases:['WTI']},
    XAUUSD:{name:'Gold Spot',fa:'انس جهانی طلا',short:'XAU',cat:'commodity',icon:'Au',color:'240,194,81',global:true, aliases:['XAUUSD']},
    SILVER:{name:'Silver',fa:'نقره',short:'XAG',cat:'commodity',icon:'Ag',color:'169,189,204',global:true, aliases:['SILVER']},
    SP500:{name:'S&P 500',fa:'S&P 500',short:'SPX',cat:'index',icon:'S',color:'104,181,255',global:true, aliases:['SP500']},
    NASDAQ:{name:'Nasdaq',fa:'نزدک',short:'NDX',cat:'index',icon:'N',color:'127,145,244',global:true, aliases:['NASDAQ']},
    DXY:{name:'US Dollar Index',fa:'شاخص دلار',short:'DXY',cat:'index',icon:'D',color:'190,155,255',global:true, aliases:['DXY']}
  };

  const CRYPTO_ORDER = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','LINK','AVAX','DOT','LTC','BCH','SHIB','UNI','NEAR','SUI','XLM','ETC','ATOM','APT','FIL','ARB','OP','HBAR','INJ','AAVE','PEPE','USDT','NOT'];
  const DEFAULT_ORDER = [...CRYPTO_ORDER,'GOLD','DOLLAR','BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'];
  const OVERVIEW_ORDER = ['BTC','SOL','GOLD','DOLLAR','BRENT','XAUUSD'];
  const CHARTABLE = ['BTC','ETH','SOL','BNB','XRP','ADA','GOLD','DOLLAR','BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'];

  const I18N = {
    en:{
      brandSubtitle:'Market Terminal',navMarkets:'Markets',navStatus:'Status',navChart:'Charts',navWatch:'Watchlist',navCompare:'Compare',
      checking:'Checking',liveMarket:'LIVE MARKET',eyebrow:'LIVE MARKET INTELLIGENCE',heroTitle:'Market intelligence, built to move.',
      heroText:'A dense, responsive terminal for crypto, local rates, commodities and global indices — with clear context, live status and a high-signal visual system.',
      coverage:'Coverage',trackedAssets:'tracked assets',exploreMarkets:'Explore markets',share:'Share',dataLayer:'GitHub data layer',
      updateSchedule:'Updated by automation',galaxyCaption:'Interactive market pulse',overviewTitle:'Fast market view',
      marketDrivers:'Market drivers & sentiment',marketDriversLead:'Global crypto breadth, positioning, sentiment and macro context. Indicators are informative, not predictions.',marketSignalsTitle:'Market signal radar',marketSignalsLead:'Rule-based watch signals from sudden moves, breadth, sentiment and derivatives. These are monitoring cues, not predictions.',noHighSignals:'No high-threshold conditions are active. Markets are being monitored.',signalCritical:'Critical',signalWarning:'Important',signalWatch:'Watch',signalSource:'Source',signalUpdated:'Updated',signalMove:'24h move',fearGreed:'Fear & Greed',globalCap:'Total crypto market cap',globalVolume:'24h global volume',btcDominance:'BTC / ETH dominance',capChange:'Market cap 24h',cryptoBreadth:'Global crypto breadth',fundingRates:'Perpetual funding',openInterest:'BTC open interest',positiveNegative:'Advance / decline',sentimentSource:'Source: Alternative.me · daily sentiment index',contextDisclaimer:'Funding and open interest describe derivatives positioning; neither predicts price direction on its own.',
      filterMarket:'Market',all:'All',crypto:'Crypto',commodities:'Commodities',indices:'Indices',unit:'Unit',comfortable:'Comfortable',compact:'Compact',
      marketStatusTitle:'Market status',marketStatusLead:'A compact view of breadth, momentum, pressure and data freshness.',pulseScoreLabel:'Pulse score',
      breadth:'Market breadth',momentum:'Momentum',volatility:'Volatility',dataHealth:'Data health',avgChange:'Average change',
      largestMove:'Largest move',freshness:'Freshness',sources:'Sources',errors:'Errors',topMovers:'Top movers',byDailyChange:'by daily change',
      marketSessions:'Market sessions',localAndGlobal:'local + global',keyStats:'Key stats',watchlist:'Watchlist',clear:'Clear',
      connected:'Connected',serviceHealth:'Service health',lastSnapshot:'Last snapshot',updateSource:'Update source',schedule:'Schedule',
      comparisonTitle:'Compare performance',dataNoteTitle:'Data & update model',
      dataNote:'ArzPulse reads the generated JSON data layer. Local market snapshots come from the project’s collector and global market snapshots are stored by the automated workflow. Global quotes can be delayed.',
      repo:'Repository ↗',footerText:'Built for fast, high-signal market monitoring.',
      up:'Up',down:'Down',balanced:'Balanced',fresh:'Fresh',stale:'Stale',veryFresh:'Live',none:'—',noData:'No data for this filter.',
      historyMissing:'Historical data is not available for this asset yet.',clickHint:'Click an asset card to inspect more details.',
      noWatch:'Your watchlist is empty. Tap ☆ on a card to add assets.',last:'Last',high:'High',low:'Low',volume:'Volume',bestBuy:'Best buy',bestSell:'Best sell',
      spread:'Spread',source:'Source',updated:'Updated',delayed:'Delayed',local:'Local',global:'Global',change:'Change',
      open:'Open',closed:'Closed',iran:'Iran',london:'London',newYork:'New York',asia:'Asia',status:'Status',
      marketOpen:'Open',marketClosed:'Closed',copyDone:'Share link copied.',refreshed:'Data refresh requested.',langPersian:'فارسی'
    },
    fa:{
      brandSubtitle:'ترمینال بازار',navMarkets:'بازارها',navStatus:'وضعیت',navChart:'نمودارها',navWatch:'واچ‌لیست',navCompare:'مقایسه',
      checking:'در حال بررسی',liveMarket:'بازار زنده',eyebrow:'هوشمندی زنده بازار',heroTitle:'اطلاعات بازار، آماده برای تصمیم.',
      heroText:'ترمینالی متراکم و واکنش‌گرا برای رمزارز، نرخ‌های داخلی، کالاها و شاخص‌های جهانی؛ با وضعیت لحظه‌ای و اطلاعات قابل استفاده.',
      coverage:'پوشش',trackedAssets:'دارایی تحت رصد',exploreMarkets:'مشاهده بازارها',share:'اشتراک‌گذاری',dataLayer:'لایه داده GitHub',
      updateSchedule:'به‌روزرسانی خودکار',galaxyCaption:'نبض تعاملی بازار',overviewTitle:'نمای سریع بازار',
      marketDrivers:'محرک‌ها و احساسات بازار',marketDriversLead:'عرض بازار جهانی کریپتو، موقعیت قراردادها، احساسات و شاخص‌های کلان. این شاخص‌ها اطلاعاتی‌اند، نه پیش‌بینی.',marketSignalsTitle:'رادار سیگنال بازار',marketSignalsLead:'هشدارهای قاعده‌محور بر اساس جهش قیمت، عرض بازار، احساسات و مشتقات؛ این‌ها ابزار رصد هستند، نه پیش‌بینی.',noHighSignals:'در حال حاضر شرط هشدار قوی فعالی دیده نمی‌شود؛ پایش بازار ادامه دارد.',signalCritical:'بحرانی',signalWarning:'مهم',signalWatch:'رصد',signalSource:'منبع',signalUpdated:'به‌روزرسانی',signalMove:'تغییر ۲۴ساعته',fearGreed:'ترس و طمع',globalCap:'ارزش کل بازار کریپتو',globalVolume:'حجم جهانی ۲۴ ساعته',btcDominance:'دامیننس BTC / ETH',capChange:'تغییر ارزش بازار ۲۴ ساعت',cryptoBreadth:'عرض بازار جهانی کریپتو',fundingRates:'فاندینگ قراردادهای دائمی',openInterest:'موقعیت باز بیت‌کوین',positiveNegative:'صعودی / نزولی',sentimentSource:'منبع: Alternative.me · شاخص روزانه احساسات',contextDisclaimer:'فاندینگ و موقعیت باز رفتار بازار مشتقه را نشان می‌دهند و به‌تنهایی جهت قیمت را پیش‌بینی نمی‌کنند.',
      filterMarket:'بازار',all:'همه',crypto:'کریپتو',commodities:'کالاها',indices:'شاخص‌ها',unit:'واحد',comfortable:'راحت',compact:'فشرده',
      marketStatusTitle:'وضعیت بازار',marketStatusLead:'نمایی فشرده از عرض بازار، مومنتوم، فشار و تازگی داده.',pulseScoreLabel:'امتیاز نبض',
      breadth:'عرض بازار',momentum:'مومنتوم',volatility:'نوسان',dataHealth:'سلامت داده',avgChange:'میانگین تغییر',
      largestMove:'بیشترین حرکت',freshness:'تازگی',sources:'منابع',errors:'خطاها',topMovers:'دارایی‌های پُرحرکت',byDailyChange:'بر اساس تغییر روزانه',
      marketSessions:'جلسات بازار',localAndGlobal:'داخلی + جهانی',keyStats:'آمار کلیدی',watchlist:'واچ‌لیست',clear:'پاک کردن',
      connected:'متصل',serviceHealth:'سلامت سرویس',lastSnapshot:'آخرین Snapshot',updateSource:'منبع به‌روزرسانی',schedule:'زمان‌بندی',
      comparisonTitle:'مقایسه عملکرد',dataNoteTitle:'مدل داده و بروزرسانی',
      dataNote:'ArzPulse داده را از لایه JSON تولیدشده می‌خواند. داده‌های داخلی از Collector پروژه و داده‌های جهانی از Workflow خودکار ذخیره می‌شوند. داده‌های بازار جهانی ممکن است با تأخیر همراه باشند.',
      repo:'مخزن ↗',footerText:'ساخته‌شده برای پایش سریع و پُر‌سیگنال بازار.',
      up:'مثبت',down:'منفی',balanced:'متعادل',fresh:'تازه',stale:'کهنه',veryFresh:'زنده',none:'—',noData:'داده‌ای برای این فیلتر موجود نیست.',
      historyMissing:'هنوز تاریخچه‌ای برای این دارایی ثبت نشده است.',clickHint:'برای جزئیات بیشتر روی کارت دارایی کلیک کنید.',
      noWatch:'واچ‌لیست خالی است. روی ☆ کارت‌ها بزنید تا دارایی اضافه شود.',last:'آخرین',high:'بیشترین',low:'کمترین',volume:'حجم',bestBuy:'بهترین خرید',bestSell:'بهترین فروش',
      spread:'اسپرد',source:'منبع',updated:'به‌روزرسانی',delayed:'با تأخیر',local:'داخلی',global:'جهانی',change:'تغییر',
      open:'باز',closed:'بسته',iran:'ایران',london:'لندن',newYork:'نیویورک',asia:'آسیا',status:'وضعیت',
      marketOpen:'باز',marketClosed:'بسته',copyDone:'لینک اشتراک‌گذاری کپی شد.',refreshed:'درخواست تازه‌سازی داده ارسال شد.',langPersian:'English'
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
  let tickerAnimation = null;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const T = k => I18N[lang][k] ?? k;
  const isGlobal = key => !!META[key]?.global;
  const num = n => {
    const v = Number(n);
    if(!Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
  };
  const faNum = n => {
    const v = Number(n);
    if(!Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(v);
  };
  const formatPct = n => {
    const v = Number(n);
    if(!Number.isFinite(v)) return '—';
    return `${v>0?'+':''}${v.toFixed(2)}%`;
  };
  const formatPrice = (key, value) => {
    const v = Number(value);
    if(!Number.isFinite(v) || v===0) return '—';
    if(isGlobal(key)) return `$${num(v)}`;
    if(lang==='fa'){
      if(currency==='USD'){
        const r = Number(latest?.dollarPrice || latest?.usdtPrice || 0);
        return r>0 ? `$${num(v/r)}` : `${faNum(v)} IRR`;
      }
      return `${faNum(v)} ریال`;
    }
    if(currency==='USD'){
      const r = Number(latest?.dollarPrice || latest?.usdtPrice || 0);
      return r>0 ? `$${num(v/r)}` : `${num(v)} IRR`;
    }
    return `${num(v)} IRR`;
  };
  const compactNumber = n => {
    const v=Number(n); if(!Number.isFinite(v)) return '—';
    if(Math.abs(v)>=1e9) return `${(v/1e9).toFixed(1)}B`;
    if(Math.abs(v)>=1e6) return `${(v/1e6).toFixed(1)}M`;
    if(Math.abs(v)>=1e3) return `${(v/1e3).toFixed(1)}K`;
    return num(v);
  };
  function formatUSD(value){
    const v=Number(value); if(!Number.isFinite(v)||v===0) return '—';
    if(Math.abs(v)>=1e12) return `$${(v/1e12).toFixed(2)}T`;
    if(Math.abs(v)>=1e9) return `$${(v/1e9).toFixed(2)}B`;
    if(Math.abs(v)>=1e6) return `$${(v/1e6).toFixed(2)}M`;
    return `$${new Intl.NumberFormat('en-US',{maximumFractionDigits:v<1?6:2}).format(v)}`;
  }

  function renderSignalRadar(){
    const grid=$('#signalGrid'); if(!grid) return;
    const signals=[];
    const crypto=Object.entries(latest?.globalCrypto||{}).map(([symbol,item])=>({symbol,...item})).filter(x=>!x.stale&&Number(x.last)>0&&Number.isFinite(Number(x.change)));
    const movers=crypto.filter(x=>Math.abs(Number(x.change))>=5).sort((a,b)=>Math.abs(Number(b.change))-Math.abs(Number(a.change))).slice(0,3);
    if(movers.length){
      for(const item of movers){
        const meta=META[item.symbol]||{name:item.symbol,fa:item.symbol,short:item.symbol,color:'89,216,255'};
        const move=Number(item.change),severity=Math.abs(move)>=9?'critical':'warning';
        signals.push({key:`mover-${item.symbol}`,symbol:item.symbol,color:meta.color,severity,title:`${lang==='fa'?meta.fa:meta.name} · ${move>0?(lang==='fa'?'جهش روزانه':'Daily surge'):(lang==='fa'?'افت روزانه':'Daily drop')}`,value:formatPct(move),body:lang==='fa'?`تغییر ۲۴ساعته از آستانه ${Math.abs(move)>=9?'۹٪':'۵٪'} عبور کرده است. حجم معاملات و وضعیت بازار مشتقه را هم بررسی کن.`:`The 24h move crossed the ${Math.abs(move)>=9?'9%':'5%'} watch threshold. Check volume and derivatives context as well.`,source:item.source||'Binance Spot',extra:Number(item.volumeUsd)>0?`${formatUSD(item.last)} · ${formatUSD(item.volumeUsd)} volume`:`${formatUSD(item.last)}`});
      }
    }
    const total=crypto.length,up=crypto.filter(x=>Number(x.change)>=2).length,down=crypto.filter(x=>Number(x.change)<=-2).length;
    if(total>=12 && Math.max(up,down)/total>=.75){
      const downSide=down>up, color=downSide?'255,113,133':'57,217,166';
      signals.push({key:'market-breadth',symbol:'BREADTH',color,severity:'critical',title:lang==='fa'?(downSide?'افت فراگیر بازار کریپتو':'صعود فراگیر بازار کریپتو'):(downSide?'Broad crypto sell-off':'Broad crypto rally'),value:`${downSide?down:up}/${total}`,body:lang==='fa'?`${Math.round(Math.max(up,down)/total*100)}٪ از رمزارزهای معتبر تغییر روزانه بیش از ۲٪ در یک جهت دارند؛ احتمال هم‌بستگی سبد بالاتر است.`:`${Math.round(Math.max(up,down)/total*100)}% of tracked coins have daily moves beyond 2% in the same direction; portfolio correlation risk may be elevated.`,source:'ArzPulse · breadth calculation',extra:`${up} ↑ · ${down} ↓`});
    }
    const context=latest?.marketContext||{};
    const fg=context.fearGreed;
    if(fg&&!fg.stale&&(Number(fg.value)<=20||Number(fg.value)>=80)){
      const fearful=Number(fg.value)<=20;
      signals.push({key:'fear-greed',symbol:'F&G',color:fearful?'255,113,133':'245,197,91',severity:'warning',title:lang==='fa'?(fearful?'ترس شدید در احساسات بازار':'طمع شدید در احساسات بازار'):(fearful?'Extreme fear sentiment':'Extreme greed sentiment'),value:`${Number(fg.value)}/100`,body:lang==='fa'?'این شاخص رفتار احساسی بازار را نشان می‌دهد و نباید به تنهایی مبنای تصمیم خرید و فروش قرار گیرد.':'Sentiment is at an extreme. This indicator is not a standalone buy/sell signal.',source:fg.source||'Alternative.me',extra:fg.classification||'—'});
    }
    const global=context.global;
    if(global&&!global.stale&&Math.abs(Number(global.marketCapChange24h))>=3){
      const change=Number(global.marketCapChange24h);
      signals.push({key:'market-cap',symbol:'TOTAL',color:change>=0?'57,217,166':'255,113,133',severity:Math.abs(change)>=5?'critical':'warning',title:lang==='fa'?'حرکت قابل‌توجه ارزش کل کریپتو':'Material move in total crypto market cap',value:formatPct(change),body:lang==='fa'?'تغییر ارزش کل بازار را همراه حجم جهانی و دامیننس BTC/ETH بررسی کن؛ این شاخص به‌تنهایی جهت بازار را مشخص نمی‌کند.':'Check this alongside global volume and BTC/ETH dominance; this metric alone does not determine market direction.',source:global.source||'Global crypto stats',extra:formatUSD(global.totalMarketCapUsd)});
    }
    const derivatives=context.derivatives||{};
    for(const symbol of ['BTC','ETH']){
      const item=derivatives[symbol]; const rate=Number(item?.fundingRate);
      if(item&&!item.stale&&Number.isFinite(rate)&&Math.abs(rate)>=.0005){
        const color=rate>=0?'243,184,74':'98,126,234';
        signals.push({key:`funding-${symbol}`,symbol,color,severity:Math.abs(rate)>=.001?'critical':'warning',title:`${symbol} · ${lang==='fa'?'فاندینگ غیرعادی':'Unusual funding'}`,value:`${(rate*100).toFixed(4)}%`,body:lang==='fa'?(rate>0?'نرخ مثبت یعنی لانگ‌ها معمولاً به شورت‌ها پرداخت می‌کنند. هزینه موقعیت‌گیری را بررسی کن.':'نرخ منفی می‌تواند نشان‌دهنده فشار موقعیت‌های شورت باشد؛ جهت بعدی قیمت قطعی نیست.'):(rate>0?'Positive funding typically means longs pay shorts. Check positioning costs.':'Negative funding can indicate short-side pressure; it does not guarantee the next price move.'),source:item.source||'Binance USD-M Futures',extra:item.nextFundingTime?relativeTime(item.nextFundingTime):'—'});
      }
    }
    for(const key of ['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY']){
      const item=latest?.market?.[key];
      if(!item||item.stale||!Number.isFinite(Number(item.change))||Math.abs(Number(item.change))<1.5) continue;
      const meta=META[key];
      signals.push({key:`macro-${key}`,symbol:key,color:meta?.color||'89,216,255',severity:Math.abs(Number(item.change))>=3?'critical':'warning',title:`${lang==='fa'?(meta?.fa||key):(meta?.name||key)} · ${lang==='fa'?'حرکت کلان':'Macro move'}`,value:formatPct(item.change),body:lang==='fa'?'تغییر این شاخص می‌تواند فضای ریسک و دارایی‌های مرتبط را تحت تأثیر قرار دهد؛ به زمان و تأخیر داده دقت کن.':'This instrument may influence related markets and risk sentiment. Check market hours and potential data delay.',source:item.source||'Yahoo Finance',extra:formatUSD(item.last)});
    }
    const priority={critical:3,warning:2,watch:1};
    signals.sort((a,b)=>(priority[b.severity]||0)-(priority[a.severity]||0)||Math.abs(Number.parseFloat(String(b.value).replace('%',''))||0)-Math.abs(Number.parseFloat(String(a.value).replace('%',''))||0));
    const selected=signals.slice(0,8);
    const stamp=latest?.timestamp?relativeTime(latest.timestamp):'—';
    $('#signalSummary').textContent=selected.length?(lang==='fa'?`${selected.length} وضعیت قابل‌توجه بر اساس آخرین Snapshot · داده: ${stamp}`:`${selected.length} notable conditions from latest snapshot · data: ${stamp}`):T('noHighSignals');
    grid.innerHTML=selected.length?selected.map(signal=>`<article class="signal-card ${signal.severity}" style="--signal:${signal.color}" data-signal="${escapeHtml(signal.key)}"><div class="signal-card-head"><span class="signal-emblem">${escapeHtml(signal.symbol)}</span><span class="signal-severity ${signal.severity}">${signal.severity==='critical'?T('signalCritical'):signal.severity==='warning'?T('signalWarning'):T('signalWatch')}</span></div><h3>${escapeHtml(signal.title)}</h3><strong class="signal-value">${escapeHtml(signal.value)}</strong><p>${escapeHtml(signal.body)}</p><div class="signal-extra"><span>${escapeHtml(signal.extra||'—')}</span><span>${escapeHtml(signal.source||T('signalSource'))}</span></div></article>`).join(''):`<article class="signal-card signal-idle"><div class="signal-card-head"><span class="signal-emblem">✓</span><span class="signal-severity watch">${lang==='fa'?'پایش فعال':'Monitoring'}</span></div><h3>${T('noHighSignals')}</h3><p>${lang==='fa'?'سیگنال بر پایهٔ آستانه‌های تعریف‌شده‌ای که نیاز به توجه فوری داشته باشد شناسایی نشد.':'No monitored threshold currently requires immediate attention.'}</p><div class="signal-extra"><span>${lang==='fa'?'آخرین Snapshot':'Last snapshot'}</span><span>${escapeHtml(stamp)}</span></div></article>`;
  }

  function renderMarketContext(){
    const c=latest?.marketContext||{};
    const fg=c.fearGreed;
    const global=c.global;
    const crypto=Object.entries(latest?.globalCrypto||{}).map(([symbol,x])=>({symbol,...x})).filter(x=>Number.isFinite(Number(x.change))&&!x.stale);
    const up=crypto.filter(x=>Number(x.change)>0).length, down=crypto.filter(x=>Number(x.change)<0).length;
    const top=[...crypto].sort((a,b)=>Number(b.change)-Number(a.change)).slice(0,3);
    const bottom=[...crypto].sort((a,b)=>Number(a.change)-Number(b.change)).slice(0,3);
    const fearValue=fg&&Number.isFinite(Number(fg.value))?Number(fg.value):null;
    $('#fearGreedValue').textContent=fearValue===null?'—':`${fearValue}/100`;
    $('#fearGreedLabel').textContent=fg?`${fg.classification||'—'}${fg.stale?' · '+(lang==='fa'?'قدیمی':'stale'):''}`:'—';
    $('#fearGreedMeter').style.left=`${fearValue===null?0:Math.max(0,Math.min(100,fearValue))}%`;
    $('#fearGreedMeter').style.width=fearValue===null?'0':'3px';
    $('#fearGreedDiff').textContent=fg?.yesterday&&fearValue!==null?`${fearValue-Number(fg.yesterday.value)>0?'+':''}${(fearValue-Number(fg.yesterday.value)).toFixed(0)} ${lang==='fa'?'نسبت به دیروز':'vs yesterday'}`:'—';
    $('#fearGreedUpdated').textContent=fg?.timestamp?relativeTime(fg.timestamp):'—';
    $('#globalCapValue').textContent=global?formatUSD(global.totalMarketCapUsd):'—';
    $('#globalVolumeValue').textContent=global?formatUSD(global.totalVolume24hUsd):'—';
    $('#btcDominanceValue').textContent=global?.btcDominance!=null?`BTC ${Number(global.btcDominance).toFixed(2)}% · ETH ${global?.ethDominance!=null?`${Number(global.ethDominance).toFixed(2)}%`:'—'}`:'—';
    $('#capChangeValue').textContent=global?.marketCapChange24h!=null&&Number.isFinite(Number(global.marketCapChange24h))?formatPct(global.marketCapChange24h):'—';
    $('#capChangeValue').className=`intel-value ${cls(global?.marketCapChange24h)}`;
    $('#cryptoBreadthValue').textContent=crypto.length?`${up} / ${down}`:'—';
    $('#cryptoBreadthNote').textContent=crypto.length?`${crypto.length} ${lang==='fa'?'نماد معتبر':'valid symbols'} · ${lang==='fa'?'هم‌اکنون':'now'}`:'—';
    $('#cryptoTopMovers').innerHTML=top.length?top.map(x=>`<span class="mover-chip"><b>${escapeHtml(x.symbol)}</b><i class="up">${formatPct(x.change)}</i></span>`).join(''):'<span class="subtle">—</span>';
    $('#cryptoBottomMovers').innerHTML=bottom.length?bottom.map(x=>`<span class="mover-chip"><b>${escapeHtml(x.symbol)}</b><i class="down">${formatPct(x.change)}</i></span>`).join(''):'<span class="subtle">—</span>';
    const derivatives=c.derivatives||{};
    $('#fundingRows').innerHTML=['BTC','ETH'].map(symbol=>{
      const item=derivatives[symbol];
      const rate=Number(item?.fundingRate);
      const funding=Number.isFinite(rate)?`${rate>0?'+':''}${(rate*100).toFixed(4)}%`:'—';
      const oi=symbol==='BTC'&&Number(item?.openInterestUsd)>0?formatUSD(item.openInterestUsd):'—';
      return `<div class="funding-row"><span>${symbol}</span><b class="${cls(rate)}">${funding}</b><small>${symbol==='BTC'?(lang==='fa'?'موقعیت باز':'Open interest')+': '+oi:(item?.nextFundingTime?relativeTime(item.nextFundingTime):'')}</small></div>`;
    }).join('');
    const times=[fg?.timestamp,global?.timestamp,derivatives?.fetchedAt].filter(Boolean).map(Date.parse).filter(Number.isFinite);
    $('#contextUpdated').textContent=times.length?relativeTime(new Date(Math.min(...times)).toISOString()):'—';
    const hasContext=Boolean(fg||global||crypto.length||derivatives.BTC||derivatives.ETH);
    $('#contextStatus').textContent=hasContext?(fg?.stale||global?.stale?'Partial · stale data':'Sources connected'):'Waiting for context data';
  }

  const escapeHtml = s => String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const cls = n => Number(n)>0?'up':Number(n)<0?'down':'neutral';

  function loadWatch(){ try { return JSON.parse(localStorage.getItem('arzpulse_watchlist')||'[]').filter(k=>META[k]); } catch { return []; } }
  function saveWatch(){ localStorage.setItem('arzpulse_watchlist',JSON.stringify(watchlist)); }
  function toggleWatch(key){
    if(watchlist.includes(key)) watchlist=watchlist.filter(k=>k!==key); else watchlist=[...watchlist,key];
    saveWatch(); renderMarkets(); renderWatchlist();
    if(detailAsset===key) updateDetailWatch();
  }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),2300); }

  function normalizeLocal(x){
    if(!x) return null;
    return {
      last:Number(x.last ?? x.lastPrice ?? x.latest ?? x.price ?? x.close ?? 0),
      high:Number(x.high ?? x.dayHigh ?? x.highest ?? x.regularMarketDayHigh ?? 0),
      low:Number(x.low ?? x.dayLow ?? x.lowest ?? x.regularMarketDayLow ?? 0),
      volume:Number(x.volume ?? x.baseVolume ?? x.quoteVolume ?? x.regularMarketVolume ?? 0),
      bestBuy:Number(x.bestBuy ?? x.buy ?? x.bid ?? 0),
      bestSell:Number(x.bestSell ?? x.sell ?? x.ask ?? 0),
      change:Number(x.change ?? x.percentChange ?? 0),
      timestamp:x.timestamp || latest?.timestamp || null,
      delayed:false,
      symbol:x.symbol || null
    };
  }
  function normalizeGlobal(x){ return normalizeLocal(x); }

  function getAsset(key){
    if(!latest) return null;
    const globalQuote = latest.globalCrypto?.[key] || null;
    if(key==='GOLD'){
      const x=normalizeLocal(latest.prices?.XAUT);
      return {...(x||{}),last:Number(latest.gold18K||0),change:Number(latest.goldChange||0),timestamp:latest.timestamp,source:'Nobitex · derived from XAUT/USDT',globalQuote:null};
    }
    if(key==='DOLLAR'){
      const x=normalizeLocal(latest.prices?.USDT);
      return {...(x||{}),last:Number(latest.dollarPrice || latest.usdtPrice || x?.last || 0),change:Number(latest.dollarChange ?? x?.change ?? 0),timestamp:latest.timestamp,source:'Nobitex USDT/IRR',globalQuote:null};
    }
    if(latest.prices?.[key]) return {...normalizeLocal(latest.prices[key]),source:'Nobitex',globalQuote};
    if(latest.market?.[key]) return {...normalizeGlobal(latest.market[key]),source:latest.market[key]?.source || 'Yahoo Finance'};
    if(globalQuote && Number(globalQuote.last)>0){
      const rate=Number(latest.usdtPrice || latest.dollarPrice || latest.prices?.USDT?.bestSell || 0);
      const fx=Number.isFinite(rate)&&rate>0?rate:0;
      const toLocal=(value)=>Number(value||0)*fx;
      return {
        last:toLocal(globalQuote.last), high:toLocal(globalQuote.high), low:toLocal(globalQuote.low),
        volume:Number(globalQuote.volumeBase||0), bestBuy:toLocal(globalQuote.bid), bestSell:toLocal(globalQuote.ask),
        change:Number(globalQuote.change||0), timestamp:globalQuote.timestamp || latest.timestamp, delayed:false,
        source:fx?'Binance Spot · estimated IRR':'Binance Spot · USD', quoteCurrency:fx?'IRR':'USD',
        globalQuote, globalVolumeUsd:Number(globalQuote.volumeUsd||0), tradeCount:Number(globalQuote.trades||0)
      };
    }
    return null;
  }

  function applyLanguage(){
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='fa'?'rtl':'ltr';
    document.body.classList.toggle('rtl',lang==='fa');
    $$('[data-i18n]').forEach(el=>{ el.textContent=T(el.dataset.i18n); });
    $('#langBtn').textContent=lang==='en'?'FA':'EN';
    $('#chartHint').textContent=T('clickHint');
    $('#chartEmpty').textContent=T('historyMissing');
    renderAll();
  }

  function setTheme(){
    document.body.classList.toggle('light',theme==='light');
    $('#themeGlyph').textContent=theme==='light'?'☀':'◐';
  }
  function setDensity(){
    document.body.classList.toggle('compact',density==='compact');
    $$('#densityToggle button').forEach(b=>b.classList.toggle('active',b.dataset.density===density));
  }
  function setCurrency(){
    $$('#currencyToggle button').forEach(b=>b.classList.toggle('active',b.dataset.currency===currency));
  }

  async function fetchJSON(url){
    const r=await fetch(`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function loadData(){
    $('#connectionPill b').textContent=T('checking');
    try{
      const data=await fetchJSON(DATA_URL);
      latest=data;
      await loadHistoryIndex();
      renderAll();
      setHealth(true);
    }catch(err){
      console.error(err);
      latest=null; history=[];
      renderAll();
      setHealth(false);
    }
  }

  async function refreshLatestSnapshot(){
    try{
      const data=await fetchJSON(DATA_URL);
      if(!data || typeof data!=='object') return;
      latest=data;
      renderAll();
      setHealth(true);
    }catch(error){ console.warn('[refresh] latest snapshot refresh failed:',error?.message||error); }
  }

  function normalizeHistoryPayload(payload){
    if(Array.isArray(payload)) return payload.flatMap(row=>Array.isArray(row)?normalizeHistoryPayload(row):[row]);
    if(Array.isArray(payload?.data)) return normalizeHistoryPayload(payload.data);
    if(Array.isArray(payload?.history)) return normalizeHistoryPayload(payload.history);
    return payload && typeof payload==='object' ? [payload] : [];
  }

  async function loadHistoryIndex(){
    // History files in ArzPulse are daily arrays of snapshots. Flatten them into one
    // chronological stream so every chart, sparkline and comparison can consume the
    // real data points directly. Never require history for the first paint.
    history=[];
    try{
      const idx=await fetchJSON(`${HISTORY_BASE}index.json`);
      const rows=normalizeHistoryPayload(idx);
      if(rows.length) history=rows;
    }catch{}

    if(!history.length){
      const latestDate=latest?.timestamp ? new Date(latest.timestamp) : new Date();
      const probes=[];
      for(let i=0;i<30;i++){
        const d=new Date(latestDate); d.setUTCDate(d.getUTCDate()-i);
        const s=d.toISOString().slice(0,10);
        probes.push(fetchJSON(`${HISTORY_BASE}${s}.json`).catch(()=>null));
      }
      const out=await Promise.all(probes);
      history=out.flatMap(normalizeHistoryPayload);
    }

    history=history
      .filter(row=>row && typeof row==='object')
      .map(row=>({ ...row, time: row.time || row.timestamp || row.date || null }))
      .sort((a,b)=>new Date(a.time||0)-new Date(b.time||0));
  }

  function allKeys(){
    return [...new Set([...DEFAULT_ORDER,...Object.keys(latest?.globalCrypto||{})])].filter(k=>META[k]&&getAsset(k));
  }

  function renderAll(){
    setTheme(); setDensity(); setCurrency();
    renderClock();
    renderTicker();
    renderOverview();
    renderMarkets();
    renderStatus();
    renderMarketContext();
    renderSignalRadar();
    renderChartControls();
    renderChart();
    renderStats();
    renderWatchlist();
    renderComparison();
    renderGalaxy();
    $('#coverageCount').textContent=allKeys().length || '—';
    const ts=latest?.timestamp;
    $('#lastUpdateText').textContent=ts ? relativeTime(ts) : '—';
    $('#ageText').textContent=ts ? relativeTime(ts) : '—';
    $('#overviewUpdated').textContent=ts ? relativeTime(ts) : '—';
    $('#dataCount').textContent=allKeys().length ? `${allKeys().length} ${lang==='en'?'assets':'دارایی'}` : '—';
    updateActiveNav();
  }

  function renderClock(){
    const now=new Date();
    const locale=lang==='fa'?'fa-IR':'en-US';
    $('#marketClock').textContent=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
  }

  function relativeTime(iso){
    const t=new Date(iso).getTime(); if(!Number.isFinite(t)) return '—';
    const sec=Math.max(0,Math.floor((Date.now()-t)/1000));
    if(lang==='en'){
      if(sec<60) return `${sec}s ago`;
      if(sec<3600) return `${Math.floor(sec/60)}m ago`;
      if(sec<86400) return `${Math.floor(sec/3600)}h ago`;
      return `${Math.floor(sec/86400)}d ago`;
    }
    if(sec<60) return `${faNum(sec)} ثانیه پیش`;
    if(sec<3600) return `${faNum(Math.floor(sec/60))} دقیقه پیش`;
    if(sec<86400) return `${faNum(Math.floor(sec/3600))} ساعت پیش`;
    return `${faNum(Math.floor(sec/86400))} روز پیش`;
  }

  function sparkSVG(values,color=`var(--cyan)`){
    const arr=values.map(Number).filter(v=>Number.isFinite(v)&&v>0).slice(-80);
    if(arr.length<2) return '';
    const min=Math.min(...arr), max=Math.max(...arr), span=max-min||1;
    const points=arr.map((v,i)=>`${(i/(arr.length-1))*100},${92-((v-min)/span)*78}`).join(' ');
    const area=`0,92 ${points} 100,92`;
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${area}" fill="${color}" opacity=".06"></polyline><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
  }

  function historyValue(row,key){
    if(!row) return NaN;
    const direct = row[key] ?? row?.prices?.[key]?.lastPrice ?? row?.prices?.[key]?.last ?? row?.market?.[key]?.last ?? row?.market?.[key]?.price;
    if(key==='GOLD') return Number(row.GOLD18K ?? row.gold18K ?? direct);
    if(key==='DOLLAR') return Number(row.DOLLAR ?? row.dollarPrice ?? row.USDT ?? direct);
    return Number(direct);
  }

  function getSeries(key){
    const cutoffDays={ '1d':1, '7d':7, '30d':30 }[chartRange] || 7;
    const cutoff=Date.now()-cutoffDays*24*60*60*1000;
    const vals=[];
    for(const row of history){
      const stamp=new Date(row?.time || row?.timestamp || 0).getTime();
      if(Number.isFinite(stamp) && stamp>0 && stamp<cutoff) continue;
      const v=historyValue(row,key);
      if(Number.isFinite(v)&&v>0) vals.push(v);
    }
    const current=Number(getAsset(key)?.last||0);
    if(current>0){
      if(vals.length===0) vals.push(current);
      else if(Math.abs(vals[vals.length-1]-current)>0.0000001) vals.push(current);
    }
    return vals.slice(-360);
  }

  function renderOverview(){
    const el=$('#overviewGrid');
    const html=OVERVIEW_ORDER.map(k=>{
      const a=getAsset(k); if(!a||!a.last) return '';
      const m=META[k], color=`rgb(${m.color})`;
      const s=getSeries(k);
      return `<button class="overview-tile" type="button" data-overview="${k}">
        <div class="overview-tile-top"><span>${lang==='en'?m.name:m.fa}</span><span>${m.short}</span></div>
        <div class="overview-tile-price">${escapeHtml(formatPrice(k,a.last))}</div>
        <div class="overview-tile-bottom"><span>${T('change')}</span><span class="${cls(a.change)}">${formatPct(a.change)}</span></div>
        <div class="overview-spark">${sparkSVG(s,color)}</div>
      </button>`;
    }).join('');
    el.innerHTML=html || skeletonOverview();
    $$('#overviewGrid [data-overview]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.overview)));
  }
  function skeletonOverview(){
    return Array.from({length:6},()=>`<div class="overview-tile"><div class="overview-tile-top"><span>Loading</span><span>—</span></div><div class="overview-tile-price">—</div><div class="overview-tile-bottom"><span>—</span><span>—</span></div><div class="overview-spark"></div></div>`).join('');
  }

  const COIN_LOGO_BASE='https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color';
  function coinLogoMarkup(key,m){
    if(m.cat!=='crypto') return `<span class="asset-brand-mark non-crypto"><span class="asset-symbol-fallback">${escapeHtml(m.icon)}</span></span>`;
    const imageSymbol=({XBT:'btc',USDT:'usdt'})[key]||key.toLowerCase();
    return `<span class="asset-brand-mark"><span class="asset-symbol-fallback">${escapeHtml(m.icon)}</span><img data-coin-logo src="${COIN_LOGO_BASE}/${imageSymbol}.png" alt="${escapeHtml(m.short)} logo" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>`;
  }

  function marketCard(key){
    const a=getAsset(key); if(!a||!a.last) return '';
    const m=META[key], color=m.color, favorite=watchlist.includes(key);
    const high=a.high||0, low=a.low||0, volume=a.volume||0, buy=a.bestBuy||0, sell=a.bestSell||0;
    const spread=(buy&&sell)?(sell-buy):0;
    const price=escapeHtml(formatPrice(key,a.last));
    const highText=high?escapeHtml(formatPrice(key,high)):'—';
    const lowText=low?escapeHtml(formatPrice(key,low)):'—';
    const global=isGlobal(key), isCrypto=m.cat==='crypto';
    const source=a.source || (global?'Yahoo Finance':'Nobitex');
    const rangeHigh=Number(a.globalQuote?.high||high), rangeLow=Number(a.globalQuote?.low||low);
    const rangeLast=Number(a.globalQuote?.last||a.last);
    const rangePct=rangeHigh>rangeLow?Math.max(0,Math.min(100,((rangeLast-rangeLow)/(rangeHigh-rangeLow))*100)):50;
    const quote=a.globalQuote;
    const badge=isCrypto?(quote?'GLOBAL + LOCAL':'CRYPTO'):(global?'GLOBAL':'LOCAL');
    return `<article class="market-card interactive ${isCrypto?'crypto-card':'macro-card'} asset-${key.toLowerCase()}" data-key="${key}" data-watermark="${escapeHtml(m.icon)}" style="--asset:${color}" tabindex="0">
      <span class="accent-line"></span>
      <div class="market-watermark" aria-hidden="true">${escapeHtml(m.icon)}</div>
      <div class="market-head">
        <div class="asset-title">${coinLogoMarkup(key,m)}<span class="asset-copy"><b>${escapeHtml(lang==='en'?m.name:m.fa)}</b><small>${m.short} · ${global?T('global'):T('local')}</small></span></div>
        <button class="favorite ${favorite?'active':''}" type="button" data-fav="${key}" aria-label="${T('watchlist')}" title="${T('watchlist')}">${favorite?'★':'☆'}</button>
      </div>
      <div class="asset-badge-row"><span class="asset-class-badge">${badge}</span><span class="asset-class-note">${isCrypto?(lang==='fa'?'دارایی دیجیتال':'Digital asset'):(m.cat==='commodity'?(lang==='fa'?'کالا':'Commodity'):(lang==='fa'?'شاخص':'Index'))}</span></div>
      <div class="market-price"><strong>${price}</strong><span class="change ${cls(a.change)}">${formatPct(a.change)}</span></div>
      ${quote?`<div class="crypto-reference-line"><span class="reference-label">GLOBAL SPOT</span><b>${escapeHtml(formatUSD(quote.last))}</b><span class="change ${cls(quote.change)}">${formatPct(quote.change)}</span></div>`:''}
      <div class="market-meta">
        <div class="meta-box"><span>${T('high')}</span><b>${quote?escapeHtml(formatUSD(quote.high)):highText}</b></div>
        <div class="meta-box"><span>${T('low')}</span><b>${quote?escapeHtml(formatUSD(quote.low)):lowText}</b></div>
        <div class="meta-box"><span>${quote?'GLOBAL VOL.':T('volume')}</span><b>${quote?escapeHtml(compactNumber(quote.volumeUsd)+' USD'):(volume?compactNumber(volume):'—')}</b></div>
        <div class="meta-box"><span>${quote?'TRADES':T('spread')}</span><b>${quote?escapeHtml(compactNumber(quote.trades)):(spread?escapeHtml(formatPrice(key,spread)):'—')}</b></div>
      </div>
      ${rangeHigh>rangeLow?`<div class="market-range"><div class="market-range-head"><span>${lang==='fa'?'محدوده روز':'24H RANGE'}</span><small>${rangePct.toFixed(0)}%</small></div><div class="market-range-track"><i style="width:${rangePct.toFixed(2)}%"></i><b style="left:${rangePct.toFixed(2)}%"></b></div></div>`:''}
      <div class="card-spark">${sparkSVG(getSeries(key),`rgb(${color})`)}</div>
      ${quote?`<div class="global-quote-line"><span>Weighted avg <b>${escapeHtml(formatUSD(quote.weightedAverage))}</b></span><span>Volume <b>${escapeHtml(compactNumber(quote.volumeUsd))}</b></span></div>`:''}
      <div class="card-footer"><span class="asset-source"><i class="source-bullet"></i>${escapeHtml(source)}</span><span>${a.delayed||quote?.stale?T('delayed'):a.timestamp?relativeTime(a.timestamp):'—'}</span></div>
    </article>`;
  }

  function renderMarkets(){
    const keys=allKeys().filter(k=>activeFilter==='all'||META[k].cat===activeFilter);
    $('#marketGrid').innerHTML=keys.map(marketCard).join('') || `<div class="notice glass"><div>${T('noData')}</div></div>`;
    $$('#marketGrid [data-coin-logo]').forEach(img=>{
      const fallback=img.previousElementSibling;
      img.addEventListener('load',()=>{if(fallback)fallback.hidden=true;},{once:true});
      img.addEventListener('error',()=>{img.hidden=true;if(fallback)fallback.hidden=false;},{once:true});
      if(img.complete && img.naturalWidth>0 && fallback)fallback.hidden=true;
      if(img.complete && img.naturalWidth===0 && fallback)fallback.hidden=false;
    });
    $$('#marketGrid [data-fav]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleWatch(b.dataset.fav)}));
    $$('#marketGrid [data-key]').forEach(card=>{
      card.addEventListener('click',e=>{if(!e.target.closest('[data-fav]'))openDetail(card.dataset.key)});
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(card.dataset.key)}});
    });
    setupTilt();
  }

  function renderTicker(){
    const keys=allKeys();
    const items=keys.map(k=>{
      const a=getAsset(k); if(!a?.last) return '';
      return `<div class="ticker-item"><span class="ticker-symbol">${META[k].short}</span><span class="ticker-price">${escapeHtml(formatPrice(k,a.last))}</span><span class="ticker-change ${cls(a.change)}">${formatPct(a.change)}</span></div>`;
    }).join('');
    const track=$('#tickerTrack');
    track.innerHTML=`<div class="ticker-group" data-ticker-group>${items}</div><div class="ticker-group" data-ticker-group>${items}</div>`;
    requestAnimationFrame(()=>{
      const groups=$$('#tickerTrack .ticker-group'); if(groups.length<2) return;
      const width=groups[0].getBoundingClientRect().width;
      track.style.setProperty('--loop-distance',`${-(width+2)}px`);
      const duration=Math.max(20,width/48);
      track.style.animation=`tickerMove ${duration}s linear infinite`;
      track.onmouseenter=()=>track.style.animationPlayState='paused';
      track.onmouseleave=()=>track.style.animationPlayState='running';
      track.ontouchstart=()=>track.style.animationPlayState='paused';
      track.ontouchend=()=>track.style.animationPlayState='running';
    });
  }

  function renderGalaxy(){
    const d=getAsset('DOLLAR'), b=getAsset('BTC'), g=getAsset('GOLD'), o=getAsset('BRENT');
    $('#galaxyDollar').textContent=d?.last?compactNumber(d.last):'—';
    $('#galaxyBtc').textContent=b?.last?compactNumber(b.last):'—';
    $('#galaxyGold').textContent=g?.last?compactNumber(g.last):'—';
    $('#galaxyOil').textContent=o?.last?`$${num(o.last)}`:'—';
  }

  function renderStatus(){
    const keys=allKeys();
    const changes=keys.map(k=>Number(getAsset(k)?.change)).filter(Number.isFinite);
    const up=changes.filter(x=>x>0).length, down=changes.filter(x=>x<0).length, flat=changes.length-up-down;
    const breadth=changes.length?Math.round((up/changes.length)*100):0;
    const avg=changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:0;
    const volatility=changes.length?Math.min(100,(changes.reduce((a,b)=>a+Math.abs(b),0)/changes.length)*12):0;
    const score=Math.max(0,Math.min(100,Math.round(50 + avg*4 + (breadth-50)*0.35 - volatility*0.1)));
    const label=score>=67?T('up'):score<=33?T('down'):T('balanced');
    $('#pulseScoreBig').textContent=changes.length?score:'—';
    $('#pulseLabel').textContent=changes.length?label:'—';
    $('#breadthValue').textContent=changes.length?`${breadth}%`:'—';
    $('#breadthLabel').textContent=changes.length?(breadth>=60?T('up'):breadth<=40?T('down'):T('balanced')):'—';
    $('#breadthMeter').style.width=`${breadth}%`;
    $('#breadthUp').textContent=`${up} ${T('up')}`;
    $('#breadthDown').textContent=`${down} ${T('down')}`;
    $('#avgChange').textContent=changes.length?formatPct(avg):'—';
    $('#momentumValue').textContent=changes.length?(avg>0?'+':avg<0?'-':'0'):'—';
    $('#momentumLabel').textContent=changes.length?label:'—';
    const bars=[.3,.5,.65,.8,1,Math.max(.18,Math.min(1,Math.abs(avg)/3))];
    $('#momentumBars').innerHTML=bars.map((h,i)=>`<i style="height:${Math.round(h*32)}px;opacity:${0.45+i*.08}"></i>`).join('');
    $('#volatilityValue').textContent=changes.length?`${volatility.toFixed(0)}`:'—';
    $('#volatilityLabel').textContent=changes.length?(volatility<25?T('fresh'):volatility<55?T('balanced'):T('down')):'—';
    $('#volatilityNeedle').style.left=`${Math.min(100,volatility)}%`;
    const maxMove=keys.map(k=>({k,v:Math.abs(Number(getAsset(k)?.change||0))})).sort((a,b)=>b.v-a.v)[0];
    $('#largestMove').textContent=maxMove&&maxMove.v?`${META[maxMove.k].short} ${formatPct(getAsset(maxMove.k).change)}`:'—';
    const good=keys.filter(k=>getAsset(k)?.last).length;
    const errors=Number(latest?.errorDetails?.length||0);
    const health=keys.length?Math.round((good/keys.length)*100 - errors*2):0;
    $('#healthPercent').textContent=keys.length?`${Math.max(0,Math.min(100,health))}%`:'—';
    $('#healthLabel').textContent=health>=80?T('fresh'):T('stale');
    $('#freshness').textContent=latest?.timestamp?relativeTime(latest.timestamp):'—';
    $('#sourceCount').textContent=new Set(keys.map(k=>getAsset(k)?.source?.includes('Binance')?'Binance':isGlobal(k)?'Yahoo':'Nobitex')).size || '—';
    $('#errorCount').textContent=errors;
    const leaders=keys.map(k=>({k,change:Number(getAsset(k)?.change||0)})).sort((a,b)=>b.change-a.change).slice(0,3);
    $('#leaderList').innerHTML=leaders.length?leaders.map(x=>`<div class="leader"><div class="leader-name"><i>${META[x.k].icon}</i><span>${escapeHtml(lang==='en'?META[x.k].name:META[x.k].fa)}</span></div><small class="${cls(x.change)}">${formatPct(x.change)}</small></div>`).join(''):'<span class="subtle">—</span>';
    renderSessions();
  }

  function renderSessions(){
    const sessions=[
      ['iran',T('iran'),new Date().getUTCHours()>=5 && new Date().getUTCHours()<12.5,'09:00–18:00 local'],
      ['london',T('london'),new Date().getUTCHours()>=7 && new Date().getUTCHours()<16,'08:00–17:00 local'],
      ['newYork',T('newYork'),new Date().getUTCHours()>=13 && new Date().getUTCHours()<21,'09:30–16:00 ET']
    ];
    $('#sessionGrid').innerHTML=sessions.map(([id,name,open,time])=>`<div class="session"><div class="session-top"><span class="session-name">${name}</span><span class="session-badge ${open?'session-open':'session-closed'}">${open?T('open'):T('closed')}</span></div><div class="session-time">${time}</div></div>`).join('');
  }

  function renderStats(){
    const a=getAsset(chartAsset)||getAsset('BTC');
    const rows=[
      [T('last'),a?.last?formatPrice(chartAsset,a.last):'—'],
      [T('high'),a?.high?formatPrice(chartAsset,a.high):'—'],
      [T('low'),a?.low?formatPrice(chartAsset,a.low):'—'],
      [T('volume'),a?.volume?compactNumber(a.volume):'—'],
      [T('bestBuy'),a?.bestBuy?formatPrice(chartAsset,a.bestBuy):'—'],
      [T('bestSell'),a?.bestSell?formatPrice(chartAsset,a.bestSell):'—'],
      [T('source'),a?.source||'—']
    ];
    $('#statsList').innerHTML=rows.map(([k,v])=>`<div class="stats-row"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('');
  }

  function renderWatchlist(){
    const items=watchlist.map(k=>({k,a:getAsset(k)})).filter(x=>x.a?.last);
    $('#watchlist').innerHTML=items.length?items.map(({k,a})=>`<div class="watch-row"><div class="watch-name"><i>${META[k].icon}</i><span>${escapeHtml(lang==='en'?META[k].name:META[k].fa)}</span></div><span class="${cls(a.change)}">${formatPct(a.change)}</span></div>`).join(''):`<div class="watch-empty">${T('noWatch')}</div>`;
  }

  function renderChartControls(){
    $('#chartAssetControls').innerHTML=CHARTABLE.filter(k=>getAsset(k)).slice(0,8).map(k=>`<button type="button" class="${k===chartAsset?'active':''}" data-chart-asset="${k}">${META[k].short}</button>`).join('');
    $$('#chartAssetControls button').forEach(b=>b.addEventListener('click',()=>{chartAsset=b.dataset.chartAsset;renderAll()}));
    $$('#chartRangeControls button').forEach(b=>b.classList.toggle('active',b.dataset.range===chartRange));
  }

  function renderChart(){
    const svg=$('#mainChart'), vals=getSeries(chartAsset);
    svg.innerHTML='';
    if(vals.length<2){
      $('#chartEmpty').style.display='grid';
      $('#chartEmpty').textContent=history.length ? (lang==='en'?'Not enough history points for this range yet.':'برای این بازه هنوز نقاط تاریخی کافی ثبت نشده است.') : T('historyMissing');
      return;
    }
    $('#chartEmpty').style.display='none';
    $('#chartEmpty').textContent=T('historyMissing');
    const W=1000,H=400,pad={l:50,r:24,t:22,b:32};
    const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
    const x=i=>pad.l+(i/(vals.length-1))*(W-pad.l-pad.r);
    const y=v=>pad.t+(1-(v-min)/span)*(H-pad.t-pad.b);
    const points=vals.map((v,i)=>[x(i),y(v)]);
    const line=points.map(p=>p.join(',')).join(' ');
    const area=`${pad.l},${H-pad.b} ${line} ${W-pad.r},${H-pad.b}`;
    const grid=[0,0.25,0.5,0.75,1].map(t=>{
      const yy=pad.t+t*(H-pad.t-pad.b);
      const val=max-(max-min)*t;
      return `<line class="chart-gridline" x1="${pad.l}" x2="${W-pad.r}" y1="${yy}" y2="${yy}"></line><text class="chart-label" x="8" y="${yy+4}">${escapeHtml(globalOrLocalChartLabel(val,chartAsset))}</text>`;
    }).join('');
    const m=META[chartAsset], color=`rgb(${m.color})`;
    svg.innerHTML=`${grid}<polyline class="chart-area" points="${area}" style="fill:${color};opacity:.07"></polyline><polyline class="chart-line" points="${line}" style="stroke:${color}"></polyline>`;
    $('#chartHeading').textContent=lang==='en'?m.name:m.fa;
  }

  function globalOrLocalChartLabel(v,key){ return isGlobal(key)?`$${num(v)}`:currency==='USD'?`$${num(v/(latest?.dollarPrice||1))}`:lang==='fa'?faNum(v):num(v); }

  function renderComparison(){
    const keys=allKeys().filter(k=>getSeries(k).length>=2).slice(0,5);
    $('#comparisonCaption').textContent=history.length?`${Math.min(history.length,30)} ${lang==='en'?'snapshots':'Snapshot اخیر'}`:'—';
    $('#comparisonGrid').innerHTML=keys.map(k=>{
      const s=getSeries(k), first=s[0], last=s[s.length-1], delta=first?((last/first)-1)*100:0;
      const width=Math.min(100,Math.abs(delta)*8+8), m=META[k];
      return `<div class="comparison-item"><div class="comparison-top"><span class="comparison-name">${escapeHtml(lang==='en'?m.name:m.fa)}</span><span class="${cls(delta)}">${formatPct(delta)}</span></div><div class="comparison-bar"><span style="width:${width}%;background:linear-gradient(90deg,rgb(${m.color}),rgba(${m.color},.35))"></span></div></div>`;
    }).join('')||`<div class="subtle">${T('historyMissing')}</div>`;
  }

  function openDetail(key){
    const a=getAsset(key); if(!a) return;
    detailAsset=key;
    const m=META[key];
    $('#detailLogo').textContent=m.icon;
    $('#detailName').textContent=lang==='en'?m.name:m.fa;
    $('#detailSymbol').textContent=`${m.short} · ${isGlobal(key)?T('global'):T('local')}`;
    $('#detailPrice').textContent=formatPrice(key,a.last);
    $('#detailChange').className=`change ${cls(a.change)}`;
    $('#detailChange').textContent=formatPct(a.change);
    const high=a.high?formatPrice(key,a.high):'—', low=a.low?formatPrice(key,a.low):'—', vol=a.volume?compactNumber(a.volume):'—';
    const spread=(a.bestBuy&&a.bestSell)?formatPrice(key,a.bestSell-a.bestBuy):'—';
    const rows=[[T('last'),formatPrice(key,a.last)],[T('high'),high],[T('low'),low],[T('volume'),vol],[T('bestBuy'),a.bestBuy?formatPrice(key,a.bestBuy):'—'],[T('bestSell'),a.bestSell?formatPrice(key,a.bestSell):'—'],[T('spread'),spread]];
    if(a.globalQuote){ rows.push([lang==='fa'?'قیمت جهانی (USD)':'Global price (USD)',formatUSD(a.globalQuote.last)]); rows.push([lang==='fa'?'تغییر جهانی ۲۴ساعت':'Global 24h change',formatPct(a.globalQuote.change)]); rows.push([lang==='fa'?'حجم جهانی ۲۴ساعت':'Global 24h volume',`$${compactNumber(a.globalQuote.volumeUsd)}`]); rows.push([lang==='fa'?'تعداد معاملات':'Trade count',compactNumber(a.globalQuote.trades)]); rows.push([lang==='fa'?'میانگین وزنی (USD)':'Weighted avg (USD)',formatUSD(a.globalQuote.weightedAverage)]); }
    rows.push([T('source'),a.source||'—'],[T('updated'),a.timestamp?relativeTime(a.timestamp):'—']);
    $('#detailGrid').innerHTML=rows.map(([k,v])=>`<div class="detail-stat"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('');
    updateDetailWatch();
    $('#detailPanel').hidden=false;
    document.body.style.overflow='hidden';
  }

  function updateDetailWatch(){ $('#detailWatch').textContent=watchlist.includes(detailAsset)?'★':'☆'; }
  function closeDetail(){ $('#detailPanel').hidden=true; document.body.style.overflow=''; }

  function setHealth(ok){
    const pill=$('#connectionPill'), dot=$('#healthDot');
    pill.classList.toggle('offline',!ok); pill.querySelector('i').style.background=ok?'var(--green)':'var(--red)';
    pill.querySelector('b').textContent=ok?T('liveMarket'):'Offline';
    dot.style.background=ok?'var(--green)':'var(--red)';
    $('#healthText').textContent=ok?(latest?.hasError?`Data loaded with ${latest.errorDetails?.length||0} collector issue(s).`:`${T('dataHealth')}: ${T('fresh')}.`):'Data file could not be loaded.';
    $('#healthAge').textContent=latest?.timestamp?relativeTime(latest.timestamp):'—';
    $('#overviewStatus').textContent=ok?T('connected') || 'Connected':'Offline';
  }

  function setupTilt(){
    if(matchMedia('(pointer:fine)').matches===false) return;
    $$('.interactive').forEach(el=>{
      if(el.dataset.tiltBound) return;
      el.dataset.tiltBound='1';
      el.addEventListener('pointermove',e=>{
        const r=el.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5;
        el.style.transform=`perspective(900px) rotateX(${(-y*2.2).toFixed(2)}deg) rotateY(${(x*2.6).toFixed(2)}deg) translateY(-2px)`;
      });
      el.addEventListener('pointerleave',()=>{el.style.transform=''});
    });
  }

  function setupAmbient(){
    const c=$('#ambientCanvas'), ctx=c.getContext('2d'); if(!ctx) return;
    let w=0,h=0,dpr=1,stars=[];
    function resize(){dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:Math.min(90,Math.floor(w/16))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.15+.25,a:Math.random()*.7+.15,s:Math.random()*.012+.003}))}
    function loop(){
      ctx.clearRect(0,0,w,h);
      for(const s of stars){s.a+=s.s*(Math.random()>.5?1:-1);if(s.a>.9)s.a=.9;if(s.a<.1)s.a=.1;ctx.beginPath();ctx.fillStyle=`rgba(118,207,238,${s.a*.55})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
      requestAnimationFrame(loop);
    }
    addEventListener('resize',resize,{passive:true}); resize(); loop();
  }

  function setupEvents(){
    $('#langBtn').addEventListener('click',()=>{lang=lang==='en'?'fa':'en';localStorage.setItem('arzpulse_lang',lang);applyLanguage()});
    $('#themeBtn').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';localStorage.setItem('arzpulse_theme',theme);setTheme()});
    $('#refreshBtn').addEventListener('click',()=>{loadData();toast(T('refreshed'))});
    $('#shareBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast(T('copyDone'))}catch{toast(location.href)}});
    $('#resetWatchlist').addEventListener('click',()=>{watchlist=[];saveWatch();renderWatchlist();renderMarkets()});
    $('#closeDetail').addEventListener('click',closeDetail); $('#detailBackdrop').addEventListener('click',closeDetail);
    $('#detailWatch').addEventListener('click',()=>{if(detailAsset)toggleWatch(detailAsset)});
    $('#scrollTopBtn').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
    $('#marketFilters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;activeFilter=b.dataset.filter;$$('#marketFilters button').forEach(x=>x.classList.toggle('active',x===b));renderMarkets()});
    $('#currencyToggle').addEventListener('click',e=>{const b=e.target.closest('button[data-currency]');if(!b)return;currency=b.dataset.currency;localStorage.setItem('arzpulse_currency',currency);setCurrency();renderMarkets();renderOverview();renderGalaxy();renderStats();renderChart();renderComparison()});
    $('#densityToggle').addEventListener('click',e=>{const b=e.target.closest('button[data-density]');if(!b)return;density=b.dataset.density;localStorage.setItem('arzpulse_density',density);setDensity()});
    $('#chartRangeControls').addEventListener('click',e=>{const b=e.target.closest('button[data-range]');if(!b)return;chartRange=b.dataset.range;renderChart()});
    addEventListener('scroll',()=>$('#scrollTopBtn').classList.toggle('show',scrollY>500),{passive:true});
    setInterval(renderClock,1000); setInterval(()=>{ if(latest) renderAll(); },60000); setInterval(refreshLatestSnapshot,300000);
  }

  function updateActiveNav(){
    const links=$$('.topnav a'); const sections=['markets','marketStatus','analytics','watch','compare'];
    const y=scrollY+120; let active='markets';
    for(const id of sections){const el=$('#'+id);if(el&&el.offsetTop<=y)active=id}
    links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+active || (active==='watch'&&a.getAttribute('href')==='#watch')));
  }

  function boot(){
    setTheme();setDensity();setCurrency();setupAmbient();setupEvents();applyLanguage();loadData();setupTilt();
    // First paint stays useful even if data fetch is delayed.
    renderAll();
  }

  boot();
})();
