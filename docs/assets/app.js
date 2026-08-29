(() => {
  'use strict';

  const BASE = location.pathname.includes('/ArzPulse/') ? '/ArzPulse' : '';
  const DATA_URL = `${BASE}/data/latest.json`;
  const HISTORY_BASE = `${BASE}/data/history/`;
  const ASSET_META = {
    BTC:{name:'بیت‌کوین',short:'BTC',cat:'crypto',icon:'₿'},
    ETH:{name:'اتریوم',short:'ETH',cat:'crypto',icon:'Ξ'},
    USDT:{name:'تتر',short:'USDT',cat:'crypto',icon:'₮'},
    NOT:{name:'نات‌کوین',short:'NOT',cat:'crypto',icon:'N'},
    GOLD:{name:'طلای ۱۸ عیار',short:'GOLD',cat:'commodity',icon:'Au'},
    DOLLAR:{name:'دلار / تتر',short:'USD',cat:'index',icon:'$'},
    BRENT:{name:'نفت برنت',short:'BRENT',cat:'commodity',icon:'Br'},
    WTI:{name:'نفت WTI',short:'WTI',cat:'commodity',icon:'WT'},
    XAUUSD:{name:'انس جهانی طلا',short:'XAU',cat:'commodity',icon:'Au'},
    SILVER:{name:'نقره',short:'XAG',cat:'commodity',icon:'Ag'},
    SP500:{name:'S&P 500',short:'SPX',cat:'index',icon:'S'},
    NASDAQ:{name:'Nasdaq',short:'NDX',cat:'index',icon:'N'},
    DXY:{name:'شاخص دلار',short:'DXY',cat:'index',icon:'D'}
  };
  const CHARTABLE = ['BTC','ETH','USDT','NOT','GOLD','DOLLAR','BRENT','WTI','XAUUSD','SILVER'];
  let currency = localStorage.getItem('arzpulse_currency') || 'IRR';
  let density = localStorage.getItem('arzpulse_density') || 'comfortable';
  let latest = null;
  let history = [];
  let activeFilter = 'all';
  let chartAsset = 'BTC';
  let chartRange = '7d';
  let mainChart = null;
  const sparkCharts = new Map();
  let watchlist = JSON.parse(localStorage.getItem('arzpulse_watchlist') || '[]');

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const fa = n => Number(n || 0).toLocaleString('fa-IR').replace(/,/g,'،');
  const num = n => Number(n || 0).toLocaleString('en-US',{maximumFractionDigits:2});
  const pct = n => `${n > 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;
  const fmtDate = iso => { try { return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)); } catch { return '—'; } };
  const age = iso => { const m = Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000)); if(m<1)return 'همین الان'; if(m<60)return `${fa(m)} دقیقه پیش`; const h=Math.floor(m/60); if(h<24)return `${fa(h)} ساعت پیش`; return `${fa(Math.floor(h/24))} روز پیش`; };
  const price = (n, key='') => {
    const v = Number(n || 0); if(!v) return '—';
    if(currency === 'USD' && !['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(key)) {
      const rate = Number(latest?.dollarPrice || latest?.usdtPrice || 0);
      if(rate>0) return `$${num(v/rate)}`;
    }
    if(['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(key)) return num(v);
    return `${fa(v)} ریال`;
  };
  const changeClass = c => Number(c)>0?'up':Number(c)<0?'down':'neutral';
  const changeHTML = c => `<span class="change ${changeClass(c)}">${pct(c)}</span>`;
  const toast = msg => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),2300); };

  function setTheme() {
    const mode = localStorage.getItem('arzpulse_theme') || 'dark';
    document.body.classList.toggle('light', mode==='light');
    $('#themeBtn i').className = mode==='light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  function setDensity() {
    document.body.classList.toggle('compact', density==='compact');
    $$('#densityToggle button').forEach(b=>b.classList.toggle('active', b.dataset.density===density));
  }
  function setCurrency() {
    $$('#currencyToggle button').forEach(b=>b.classList.toggle('active', b.dataset.currency===currency));
  }
  function validGlobal(key){ return Number(latest?.market?.[key]?.last || 0)>0; }
  function getAsset(key) {
    if(key==='GOLD') return {last:latest?.gold18K,change:latest?.goldChange,high:0,low:0,volume:0};
    if(key==='DOLLAR') return {last:latest?.dollarPrice,change:latest?.dollarChange,high:0,low:0,volume:0};
    return latest?.prices?.[key] || latest?.market?.[key] || null;
  }
  function renderSummary(){
    const gp=Number(latest?.gold18K||0), dp=Number(latest?.dollarPrice||0);
    $('#goldPrice').textContent=price(gp,'GOLD'); $('#goldSub').textContent=`تتر: ${dp?fa(dp)+' ریال':'—'}`; $('#goldChange').innerHTML=changeHTML(latest?.goldChange||0);
    $('#dollarPrice').textContent=price(dp,'DOLLAR'); $('#dollarChange').innerHTML=changeHTML(latest?.dollarChange||latest?.prices?.USDT?.change||0);
    const br=latest?.market?.BRENT; $('#brentPrice').textContent=br?.last?`$${num(br.last)}`:'—'; $('#brentSub').textContent=br?.delayed?'بازار جهانی · با تأخیر':'بازار جهانی'; $('#brentChange').innerHTML=changeHTML(br?.change||0);
    renderPulse();
    drawSpark($('#goldSpark'), history.map(x=>Number(x.GOLD18K||0)).filter(Boolean));
    drawSpark($('#dollarSpark'), history.map(x=>Number(x.DOLLAR||0)).filter(Boolean));
    drawSpark($('#brentSpark'), history.map(x=>Number(x.BRENT||0)).filter(Boolean));
  }
  function renderPulse(){
    const keys=['BTC','ETH','USDT','GOLD','BRENT','WTI']; const changes=keys.map(k=>Number(getAsset(k)?.change||latest?.market?.[k]?.change||0)).filter(Number.isFinite);
    const score = changes.length ? Math.max(0,Math.min(100,50 + changes.reduce((a,b)=>a+b,0)*3.4)) : 50;
    const label=score>=67?'مثبت':score<=33?'احتیاطی':'متعادل';
    $('#marketPulse').textContent=label; $('#pulseSub').textContent=`${fa(changes.length)} نماد در محاسبه`; $('#pulseScore').textContent=`${fa(Math.round(score))}/100`; $('#pulseMeter').style.width=`${score}%`;
  }
  function marketCard(key){
    const a=getAsset(key), m=ASSET_META[key]; if(!a) return '';
    const last=Number(a.last ?? a.latest ?? 0); if(!last) return '';
    const change=Number(a.change||0), fav=watchlist.includes(key);
    const high=a.high ?? a.dayHigh ?? 0, low=a.low ?? a.dayLow ?? 0, vol=a.volume ?? 0;
    const display = ['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(key) ? num(last) : price(last,key);
    return `<article class="market-card interactive" data-key="${key}" data-tilt><div class="market-head"><div class="asset-title"><span class="asset-icon">${m.icon}</span><span><b>${m.name}</b><small>${m.short}</small></span></div><button class="favorite ${fav?'active':''}" type="button" data-fav="${key}" aria-label="واچ‌لیست">★</button></div><div class="market-price"><strong>${display}</strong><span class="market-change">${changeHTML(change)}</span></div><div class="market-meta"><div class="meta-row"><span>بالا</span><b>${high?(['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(key)?num(high):price(high,key)):'—'}</b></div><div class="meta-row"><span>پایین</span><b>${low?(['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(key)?num(low):price(low,key)):'—'}</b></div><div class="meta-row"><span>حجم</span><b>${vol?num(vol):'—'}</b></div><div class="meta-row"><span>منبع</span><b>${m.cat==='crypto'||key==='GOLD'||key==='DOLLAR'?'Nobitex':'Yahoo'}</b></div></div><div class="card-spark"><canvas data-spark="${key}"></canvas></div></article>`;
  }
  function renderMarkets(){
    const keys=Object.keys(ASSET_META).filter(k=>getAsset(k)).filter(k=>activeFilter==='all'||ASSET_META[k].cat===activeFilter);
    const el=$('#marketGrid'); el.innerHTML=keys.map(marketCard).join('') || '<div class="notice glass"><div>داده‌ای برای این فیلتر موجود نیست.</div></div>';
    $$('#marketGrid [data-fav]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();toggleWatch(btn.dataset.fav)}));
    keys.forEach(k=>drawSpark(document.querySelector(`[data-spark="${k}"]`), seriesFor(k)));
    setupTilt();
  }
  function seriesFor(key){ return history.map(x=> Number(x[key] ?? x?.market?.[key] ?? 0)).filter(Number.isFinite).filter(v=>v>0).slice(-90); }
  function renderTicker(){
    const keys=['BTC','ETH','USDT','GOLD','BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'];
    const items=keys.map(k=>{const a=getAsset(k),m=ASSET_META[k];if(!a||!Number(a.last||0))return '';const global=['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(k);return `<div class="ticker-item"><span>${m.short}</span><b>${global?num(a.last):price(a.last,k)}</b><span class="t-change ${changeClass(a.change)}">${pct(a.change)}</span></div>`}).join(''); $('#tickerTrack').innerHTML=items+items;
  }
  function renderStats(){
    const br=latest?.market?.BRENT, wt=latest?.market?.WTI, x=latest?.market?.XAUUSD;
    const rows=[['فاصله برنت تا WTI',br&&wt?`$${num(br.last-wt.last)}`:'—'],['طلای ۱۸ عیار',latest?.gold18K?fa(latest.gold18K)+' ریال':'—'],['دلار / تتر',latest?.dollarPrice?fa(latest.dollarPrice):'—'],['نفت برنت',br?.last?`$${num(br.last)}`:'—'],['انس طلا',x?.last?`$${num(x.last)}`:'—']];
    $('#statsList').innerHTML=rows.map(([a,b])=>`<div class="stats-row"><span>${a}</span><b>${b}</b></div>`).join('');
  }
  function renderWatchlist(){
    const keys=watchlist.filter(k=>getAsset(k)?.last || getAsset(k)?.bestSell); if(!keys.length){$('#watchlist').innerHTML='<div class="watch-row"><span>هنوز چیزی اضافه نشده</span><b>★</b></div>';return;}
    $('#watchlist').innerHTML=keys.map(k=>{const m=ASSET_META[k],a=getAsset(k),v=Number(a.last||a.latest||a.bestSell||0);return `<div class="watch-row"><span>${m.name}</span><b>${['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(k)?num(v):price(v,k)}</b></div>`}).join('');
  }
  function renderComparison(){
    const keys=['BTC','ETH','GOLD','BRENT','XAUUSD']; $('#comparisonGrid').innerHTML=keys.map(k=>{const s=seriesFor(k);if(s.length<2)return '';const ret=(s.at(-1)/s[0]-1)*100;const width=Math.min(100,Math.abs(ret)*8);return `<div class="compare-item"><div class="c-head"><span>${ASSET_META[k].name}</span><span class="${changeClass(ret)}">${pct(ret)}</span></div><strong>${ret>0?'▲':'▼'} ${Math.abs(ret).toFixed(2)}%</strong><div class="compare-bar"><span style="width:${Math.max(3,width)}%"></span></div></div>`}).join('');}
  function chartValue(key,row){ if(key==='GOLD')return Number(row.GOLD18K||0); if(key==='DOLLAR')return Number(row.DOLLAR||0); return Number(row[key]||row?.market?.[key]||0); }
  function labelFor(k){return ASSET_META[k]?.name||k;}
  function renderChartControls(){
    $('#chartAssetControls').innerHTML=CHARTABLE.filter(k=>seriesFor(k).length).map(k=>`<button type="button" class="${chartAsset===k?'active':''}" data-chart-asset="${k}">${ASSET_META[k].short}</button>`).join('');
    $$('#chartAssetControls button').forEach(b=>b.addEventListener('click',()=>{chartAsset=b.dataset.chartAsset;drawMainChart()}));
    $$('#chartRangeControls button').forEach(b=>{b.classList.toggle('active',b.dataset.range===chartRange);b.onclick=()=>{chartRange=b.dataset.range;drawMainChart()}});
  }
  function drawMainChart(){
    renderChartControls(); const all=history.filter(r=>chartValue(chartAsset,r)>0); const n=chartRange==='1d'?Math.min(145,all.length):chartRange==='7d'?Math.min(1008,all.length):all.length; const rows=all.slice(-n);
    $('#chartHeading').textContent=`روند ${labelFor(chartAsset)}`; const empty=$('#chartEmpty');
    if(!rows.length){empty.style.display='grid';if(mainChart){mainChart.destroy();mainChart=null}return;} empty.style.display='none';
    const vals=rows.map(r=>chartValue(chartAsset,r)); const labels=rows.map(r=>new Date(r.time).toLocaleDateString('fa-IR',{month:'2-digit',day:'2-digit'}));
    const ctx=$('#mainChart').getContext('2d'); const grad=ctx.createLinearGradient(0,0,0,390);grad.addColorStop(0,'rgba(89,216,255,.28)');grad.addColorStop(1,'rgba(89,216,255,0)');
    if(mainChart)mainChart.destroy(); mainChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:'#59d8ff',backgroundColor:grad,fill:true,tension:.35,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{rtl:true,displayColors:false,backgroundColor:'#0c1c2c',borderColor:'rgba(255,255,255,.1)',borderWidth:1,titleColor:'#a5dff0',bodyColor:'#f4fbff',padding:10,callbacks:{label:c=>`${labelFor(chartAsset)}: ${chartAsset==='GOLD'||chartAsset==='DOLLAR'?price(c.raw,chartAsset):['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(chartAsset)?num(c.raw):price(c.raw,chartAsset)}`}}},scales:{x:{display:false,grid:{display:false}},y:{grid:{color:'rgba(255,255,255,.055)'},ticks:{color:'#71869a',font:{family:'Vazirmatn',size:9},callback:v=>Number(v).toLocaleString('fa-IR')}}}}});
  }
  function drawSpark(canvas, vals){
    if(!canvas||!vals||vals.length<2)return; const old=sparkCharts.get(canvas); if(old)old.destroy(); const c=canvas.getContext('2d'); const col=getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#59d8ff'; const chart=new Chart(c,{type:'line',data:{labels:vals.map((_,i)=>i),datasets:[{data:vals,borderColor:col,backgroundColor:col+'22',fill:true,tension:.4,pointRadius:0,borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});sparkCharts.set(canvas,chart);
  }
  async function fetchJSON(url){ const r=await fetch(url+`?t=${Date.now()}`,{cache:'no-store'}); if(!r.ok)throw new Error(`HTTP ${r.status}`); return r.json(); }
  async function loadHistory(){ const dates=[];for(let i=0;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);dates.push(d.toISOString().slice(0,10));}const res=await Promise.all(dates.map(d=>fetchJSON(`${HISTORY_BASE}${d}.json`).catch(()=>null)));history=res.filter(Array.isArray).flat().sort((a,b)=>new Date(a.time)-new Date(b.time)); }
  async function loadData(showToast=false){
    const pill=$('#connectionPill'); pill.querySelector('b').textContent='در حال بروزرسانی';
    try{ latest=await fetchJSON(DATA_URL); await loadHistory(); renderAll(); pill.querySelector('b').textContent=latest?.hasError?'داده با هشدار':'متصل'; pill.classList.toggle('warning',!!latest?.hasError); if(showToast)toast('داده‌ها بروزرسانی شدند'); }
    catch(e){ console.error(e); pill.querySelector('b').textContent='خطای اتصال'; toast('دریافت داده ناموفق بود'); $('#healthDot').classList.add('bad'); $('#healthText').textContent='آخرین داده قابل استفاده نیست؛ کش محلی یا تلاش مجدد را امتحان کنید.'; }
  }
  function renderAll(){
    setCurrency(); setDensity(); renderSummary(); renderMarkets(); renderTicker(); renderStats(); renderWatchlist(); renderComparison(); renderChartControls(); drawMainChart();
    const ts=latest?.timestamp; $('#lastUpdateText').textContent=ts?`${age(ts)} · ${fmtDate(ts)}`:'—'; $('#healthAge').textContent=ts?age(ts):'—'; $('#healthDot').classList.toggle('bad',!!latest?.hasError); $('#healthText').textContent=latest?.hasError?`منبع اصلی با هشدار بروزرسانی شده است: ${latest?.errorDetails?.length||0} خطا.`:'سرویس داده سالم است و آخرین snapshot در دسترس است.';
  }
  function toggleWatch(key){ watchlist=watchlist.includes(key)?watchlist.filter(x=>x!==key):[...watchlist,key].slice(-8);localStorage.setItem('arzpulse_watchlist',JSON.stringify(watchlist));renderMarkets();renderWatchlist(); }
  function setupTilt(){ if(matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches){ $$('.interactive[data-tilt],.market-card').forEach(el=>{if(el.dataset.tiltReady)return;el.dataset.tiltReady='1';el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(900px) rotateX(${y*-2.6}deg) rotateY(${x*2.6}deg) translateY(-3px)`});el.addEventListener('pointerleave',()=>el.style.transform='');});}}
  function initAmbient(){ const c=$('#ambientCanvas'),ctx=c.getContext('2d');let w=0,h=0;const dots=[];const resize=()=>{w=c.width=innerWidth*devicePixelRatio;h=c.height=innerHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);}; if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;resize();addEventListener('resize',()=>{ctx.setTransform(1,0,0,1,0,0);resize()});for(let i=0;i<55;i++)dots.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.18,r:.5+Math.random()*1.7});const loop=()=>{ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of dots){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>innerWidth)p.vx*=-1;if(p.y<0||p.y>innerHeight)p.vy*=-1;ctx.fillStyle='rgba(115,190,220,.28)';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}requestAnimationFrame(loop)};loop();}
  function bind(){
    $('#year').textContent=new Date().getFullYear(); setTheme(); setDensity(); setCurrency(); initAmbient(); setupTilt();
    $$('#themeBtn,#refreshBtn').forEach(btn=>btn.onclick=()=>{ if(btn.id==='themeBtn'){const isLight=document.body.classList.contains('light');localStorage.setItem('arzpulse_theme',isLight?'dark':'light');setTheme();renderAll();}else loadData(true); });
    $$('#currencyToggle button').forEach(b=>b.onclick=()=>{currency=b.dataset.currency;localStorage.setItem('arzpulse_currency',currency);renderAll();});
    $$('#densityToggle button').forEach(b=>b.onclick=()=>{density=b.dataset.density;localStorage.setItem('arzpulse_density',density);setDensity();});
    $$('#marketFilters button').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;$$('#marketFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMarkets();});
    $('#resetWatchlist').onclick=()=>{watchlist=[];localStorage.setItem('arzpulse_watchlist','[]');renderMarkets();renderWatchlist();};
    $('#shareBtn').onclick=async()=>{try{if(navigator.share){await navigator.share({title:'ArzPulse',text:'داشبورد بازار ArzPulse',url:location.href})}else{await navigator.clipboard.writeText(location.href);toast('لینک سایت کپی شد')}}catch{}};
    const up=$('#scrollTopBtn');addEventListener('scroll',()=>up.classList.toggle('visible',scrollY>500));up.onclick=()=>scrollTo({top:0,behavior:'smooth'});
  }
  bind(); loadData(false); setInterval(()=>loadData(false),5*60*1000);
})();
