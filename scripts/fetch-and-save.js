// ArzPulse — market data collector
// Node 20+, no external dependencies.
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://apiv2.nobitex.ir';
const YAHOO = 'https://query1.finance.yahoo.com';
const DATA_DIR = path.join(__dirname, '..', 'docs', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const LATEST_PATH = path.join(DATA_DIR, 'latest.json');
const HISTORY_KEEP_DAYS = 30;

fs.mkdirSync(HISTORY_DIR, { recursive: true });

function fetchText(url, timeout=12000, retries=2) {
  return new Promise((resolve,reject)=>{
    let attempt=0;
    const run=()=>{
      attempt++;
      const req=https.get(url,{headers:{'User-Agent':'ArzPulse/4.0','Accept':'application/json,text/plain,*/*'}},res=>{
        let body='';
        res.setEncoding('utf8');
        res.on('data',chunk=>body+=chunk);
        res.on('end',()=>{
          if(res.statusCode && res.statusCode>=200 && res.statusCode<300) return resolve(body);
          const err=new Error(`HTTP ${res.statusCode || 'unknown'}`);
          if(attempt<=retries){ setTimeout(run, 900*attempt); } else reject(err);
        });
      });
      req.setTimeout(timeout,()=>req.destroy(new Error('Request timeout')));
      req.on('error',err=>{ if(attempt<=retries) setTimeout(run,900*attempt); else reject(err); });
    };
    run();
  });
}
async function fetchJSON(url){return JSON.parse(await fetchText(url));}
function readJSON(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJSON(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function convertXautToGram18K(xautPriceInUSDT, usdtPriceInIRR){ if(!xautPriceInUSDT||!usdtPriceInIRR)return 0;return Math.round((xautPriceInUSDT*usdtPriceInIRR/31.1034768)*0.75); }
async function fetchNobitex(src,dst){
  const json=await fetchJSON(`${BASE_URL}/market/stats?srcCurrency=${src}&dstCurrency=${dst}`);
  if(json?.status!=='ok'||!json.stats)throw new Error(`Nobitex invalid response ${src}-${dst}`);
  const key=`${src}-${dst}`; const d=json.stats[key]; if(!d)throw new Error(`Nobitex missing ${key}`);
  return {bestBuy:num(d.bestBuy),bestSell:num(d.bestSell),lastPrice:num(d.latest),volume:num(d.volumeSrc),high:num(d.dayHigh),low:num(d.dayLow),change:num(d.dayChange)};
}
async function fetchYahoo(symbol){
  const url=`${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&events=div%2Csplits`;
  const json=await fetchJSON(url); const r=json?.chart?.result?.[0]; if(!r)throw new Error(`Yahoo missing ${symbol}`);
  const q=r.indicators?.quote?.[0] || {}; const close=(q.close||[]).filter(v=>v!=null); const high=(q.high||[]).filter(v=>v!=null); const low=(q.low||[]).filter(v=>v!=null); const volume=(q.volume||[]).filter(v=>v!=null);
  const last=num(close.at(-1)); const prev=num(close.at(-2)||last); const change=prev?((last-prev)/prev)*100:0; const ts=(r.timestamp||[]).at(-1);
  return {last,change,high:num(high.at(-1)),low:num(low.at(-1)),volume:num(volume.at(-1)),timestamp:ts?new Date(ts*1000).toISOString():new Date().toISOString(),delayed:true,symbol};
}

(async()=>{
  console.log('🚀 ArzPulse collector v6');
  const previous=readJSON(LATEST_PATH,null);
  const errors=[]; const prices={};
  const localAssets=[['btc','rls','BTC'],['eth','rls','ETH'],['usdt','rls','USDT'],['not','rls','NOT'],['xaut','usdt','XAUT']];
  for(const [src,dst,key] of localAssets){
    try{prices[key]=await fetchNobitex(src,dst);console.log('✅',key);}
    catch(e){errors.push(`${key}: ${e.message}`);prices[key]=previous?.prices?.[key] || {bestBuy:0,bestSell:0,lastPrice:0,volume:0,high:0,low:0,change:0};console.log('↩️',key,e.message);}
  }
  const usdt=num(prices.USDT?.bestSell); const xaut=num(prices.XAUT?.bestSell); const gold18K=convertXautToGram18K(xaut,usdt); const dollarPrice=usdt;
  const market={};
  const globalSymbols={BRENT:'BZ=F',WTI:'CL=F',XAUUSD:'GC=F',SILVER:'SI=F',SP500:'^GSPC',NASDAQ:'^IXIC',DXY:'DX-Y.NYB'};
  for(const [key,symbol] of Object.entries(globalSymbols)){
    try{market[key]=await fetchYahoo(symbol);console.log('✅',key,symbol);}
    catch(e){errors.push(`${key}: ${e.message}`);market[key]=previous?.market?.[key] || {last:0,change:0,high:0,low:0,volume:0,timestamp:null,delayed:true,symbol};console.log('↩️',key,e.message);}
  }
  const now=new Date().toISOString(); const goldChange=prices.XAUT?.change || 0; const dollarChange=prices.USDT?.change || 0;
  const latest={version:6,timestamp:now,prices,gold18K,usdtPrice:usdt,dollarPrice,goldChange,dollarChange,market,hasError:errors.length>0,errorDetails:errors};
  writeJSON(LATEST_PATH,latest);
  const today=now.slice(0,10); const file=path.join(HISTORY_DIR,`${today}.json`); const history=readJSON(file,[]);
  history.push({time:now,BTC:num(prices.BTC?.lastPrice),ETH:num(prices.ETH?.lastPrice),USDT:num(prices.USDT?.bestSell),NOT:num(prices.NOT?.lastPrice),GOLD18K:gold18K,DOLLAR:dollarPrice,...Object.fromEntries(Object.entries(market).map(([k,v])=>[k,num(v.last)]))});
  const cutoff=Date.now()-HISTORY_KEEP_DAYS*86400000; const trimmed=history.filter(x=>new Date(x.time).getTime()>=cutoff); writeJSON(file,trimmed);
  const meta={version:6,lastUpdate:now,gold18K,usdtPrice:usdt,dollarPrice,marketSummary:Object.fromEntries(Object.entries(market).map(([k,v])=>[k,{last:v.last,change:v.change,delayed:v.delayed}])),hasError:errors.length>0,errorCount:errors.length,errors}; writeJSON(path.join(DATA_DIR,'meta.json'),meta);
  console.log(`✅ Saved ${LATEST_PATH} and ${file}`);
})().catch(e=>{console.error('❌ Collector failed:',e);process.exitCode=1;});
