// ================================================================
// ArzPulse Telegram Bot - Portfolio + Market Terminal Worker
// ================================================================

// ---------- تنظیمات ----------
const DATA_URL = 'https://mehrdadmb2.github.io/ArzPulse/data/latest.json';
const HISTORY_BASE = 'https://mehrdadmb2.github.io/ArzPulse/data/history/';
const GITHUB_API_BASE = 'https://api.github.com/repos';
const QUICKCHART_API = 'https://quickchart.io/chart';

const TWO_MINUTES = 2 * 60 * 1000;
const COUNTDOWN_SECONDS = 45;
const WORKFLOW_STALE_MS = 7 * 60 * 1000;
const WORKER_VERSION = '13.0.0';
const PBKDF2_ITERATIONS = 120000;
const PROFILE_SCHEMA_VERSION = 2;
const MAX_OPERATION_IDS = 160;

let pendingUpdates = new Map();
let isUpdating = false;
let d1SchemaPromise = null;

// ---------- KV Helper ----------
async function getChannelSettings(env) {
    const kv = env.SETTINGS_KV;
    if (!kv) return [];
    try {
        const data = await kv.get('channels', 'json');
        return data || [];
    } catch {
        return [];
    }
}

async function saveChannelSettings(env, channels) {
    const kv = env.SETTINGS_KV;
    if (!kv) return;
    await kv.put('channels', JSON.stringify(channels));
}


// ---------- پروفایل و پرتفوی پایدار ----------
const PROFILE_VERSION = 2;
const PROFILE_USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,24}$/;
const PROFILE_PIN_MIN = 4;
const PROFILE_MAX_HOLDINGS = 80;
const PROFILE_MAX_REALIZED = 250;
const PROFILE_RATE_LIMIT_WINDOW = 60;
const PROFILE_RATE_LIMIT_MAX = 30;
const PROFILE_ALLOWED_SYMBOLS = ['BTC','ETH','USDT','NOT','GOLD','DOLLAR','BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'];

function profileKey(username) { return `profile:${String(username).trim().toLowerCase()}`; }
function profileRateKey(username) { return `profile-rate:${String(username).trim().toLowerCase()}`; }
function cleanUsername(username) { return String(username || '').trim().toLowerCase(); }
function validUsername(username) { return PROFILE_USERNAME_RE.test(cleanUsername(username)); }
function cleanText(value, max=120) { return String(value ?? '').trim().slice(0, max); }
function toPositiveNumber(value) { const n=Number(value); return Number.isFinite(n)&&n>0?n:0; }
function normalizeSymbol(symbol) { const s=String(symbol||'').trim().toUpperCase(); const aliases={GOLD18K:'GOLD',XAUT:'GOLD',USD:'DOLLAR',USDC:'USDT'}; return aliases[s]||s; }
function supportedProfileSymbol(symbol) { return PROFILE_ALLOWED_SYMBOLS.includes(normalizeSymbol(symbol)); }
function validDisplayName(value) { return cleanText(value,60).replace(/[<>]/g,'').slice(0,60); }
function uniqueId(){ return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function bytesToBase64(bytes){ let binary=''; for(const b of bytes) binary+=String.fromCharCode(b); return btoa(binary); }
function base64ToBytes(value){ const binary=atob(String(value||'')); const out=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) out[i]=binary.charCodeAt(i); return out; }
function hexFromBytes(bytes){ return Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join(''); }
function constantTimeEqual(a,b){ const aa=typeof a==='string'?new TextEncoder().encode(a):new Uint8Array(a||[]); const bb=typeof b==='string'?new TextEncoder().encode(b):new Uint8Array(b||[]); if(aa.length!==bb.length)return false; let diff=0; for(let i=0;i<aa.length;i++) diff|=aa[i]^bb[i]; return diff===0; }
async function sha256(value){ const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))); return hexFromBytes(new Uint8Array(digest)); }
async function hashPin(pin){ const salt=new Uint8Array(16); crypto.getRandomValues(salt); const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pin)),'PBKDF2',false,['deriveBits']); const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},key,256); return {scheme:'pbkdf2-sha256',iterations:PBKDF2_ITERATIONS,salt:bytesToBase64(salt),hash:bytesToBase64(new Uint8Array(bits))}; }
async function verifyProfilePin(profile,pin){
    if(!profile||typeof pin!=='string'||pin.length<PROFILE_PIN_MIN) return false;
    if(profile.pinScheme==='pbkdf2-sha256' && profile.pinSalt && profile.pinHash){
        try{ const salt=base64ToBytes(profile.pinSalt); const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']); const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:Number(profile.pinIterations)||PBKDF2_ITERATIONS,hash:'SHA-256'},key,256); return constantTimeEqual(new Uint8Array(bits),base64ToBytes(profile.pinHash)); }catch{return false;}
    }
    // Legacy v12 profiles used a single unsalted SHA-256 hash. Verify once, then upgrade on write.
    if(profile.pinScheme==='legacy-sha256' || profile.pinHash){ return constantTimeEqual(await sha256(pin),String(profile.pinHash||'')); }
    return false;
}
function normalizeOperations(raw){ return Array.isArray(raw)?raw.filter(x=>typeof x==='string').slice(-MAX_OPERATION_IDS):[]; }
function sanitizeHolding(raw,fallbackId=uniqueId()){
    const symbol=normalizeSymbol(raw?.symbol),quantity=toPositiveNumber(raw?.quantity),buyPrice=toPositiveNumber(raw?.buyPrice);
    const buyDate=raw?.buyDate&&!Number.isNaN(new Date(raw.buyDate).getTime())?new Date(raw.buyDate).toISOString():new Date().toISOString();
    return {id:cleanText(raw?.id||fallbackId,80),symbol,quantity,buyPrice,buyDate,note:cleanText(raw?.note,120)};
}
function sanitizeRealized(raw){
    return {id:cleanText(raw?.id||uniqueId(),80),symbol:normalizeSymbol(raw?.symbol),quantity:toPositiveNumber(raw?.quantity),sellPrice:toPositiveNumber(raw?.sellPrice),pnl:Number.isFinite(Number(raw?.pnl))?Number(raw.pnl):0,date:raw?.date&&!Number.isNaN(new Date(raw.date).getTime())?new Date(raw.date).toISOString():new Date().toISOString(),sourceHoldingId:cleanText(raw?.sourceHoldingId,80)};
}
function normalizeProfile(raw, username){
    if(!raw)return null;
    const clean={
        schemaVersion:PROFILE_SCHEMA_VERSION,version:PROFILE_VERSION,username:cleanUsername(username||raw.username),
        displayName:validDisplayName(raw.displayName||raw.username)||cleanUsername(username||raw.username),
        pinScheme:raw.pinScheme||(raw.pinSalt?'pbkdf2-sha256':'legacy-sha256'),pinIterations:Number(raw.pinIterations)||PBKDF2_ITERATIONS,
        pinSalt:String(raw.pinSalt||''),pinHash:String(raw.pinHash||''),revision:Number(raw.revision)||1,
        createdAt:raw.createdAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString(),
        holdings:Array.isArray(raw.holdings)?raw.holdings.map(sanitizeHolding).filter(h=>supportedProfileSymbol(h.symbol)&&h.quantity>0&&h.buyPrice>0).slice(0,PROFILE_MAX_HOLDINGS):[],
        realized:Array.isArray(raw.realized)?raw.realized.map(sanitizeRealized).filter(x=>supportedProfileSymbol(x.symbol)).slice(-PROFILE_MAX_REALIZED):[],
        ops:normalizeOperations(raw.ops)
    };
    if(!validUsername(clean.username)) return null;
    return clean;
}
function publicProfile(profile){
    if(!profile)return null;
    return {version:profile.version||PROFILE_VERSION,schemaVersion:PROFILE_SCHEMA_VERSION,revision:Number(profile.revision)||1,username:profile.username,displayName:profile.displayName||profile.username,createdAt:profile.createdAt,updatedAt:profile.updatedAt,holdings:(profile.holdings||[]).filter(h=>h.quantity>0).map(h=>({id:h.id,symbol:h.symbol,quantity:h.quantity,buyPrice:h.buyPrice,buyDate:h.buyDate,note:h.note})),realized:(profile.realized||[]).slice(-PROFILE_MAX_REALIZED).map(sanitizeRealized)};
}
function privateBackup(profile){ return {...publicProfile(profile),backupVersion:'1',exportedAt:new Date().toISOString()}; }

async function getLegacyKVProfile(env,username){
    if(!env.SETTINGS_KV)return null;
    try{return normalizeProfile(await env.SETTINGS_KV.get(profileKey(username),'json'),username);}catch(e){console.error('KV profile read',e);return null;}
}
async function putLegacyKVProfile(env,profile, expectedRevision=null){
    if(!env.SETTINGS_KV)throw new Error('PROFILE_STORAGE_MISSING');
    const current=await getLegacyKVProfile(env,profile.username);
    if(expectedRevision!==null && current && Number(current.revision)!==Number(expectedRevision)){
        const e=new Error('CONFLICT');e.code='CONFLICT';throw e;
    }
    const clean=normalizeProfile(profile,profile.username);clean.updatedAt=new Date().toISOString();await env.SETTINGS_KV.put(profileKey(clean.username),JSON.stringify(clean));return clean;
}
async function d1GetProfile(env,username){
    if(!env.PORTFOLIO_DB)return null;
    const row=await env.PORTFOLIO_DB.prepare('SELECT username,display_name,pin_scheme,pin_iterations,pin_salt,pin_hash,revision,created_at,updated_at,holdings_json,realized_json,ops_json FROM profiles WHERE username = ?').bind(username).first();
    if(!row)return null;
    let holdings=[],realized=[],ops=[]; try{holdings=JSON.parse(row.holdings_json||'[]');}catch{} try{realized=JSON.parse(row.realized_json||'[]');}catch{} try{ops=JSON.parse(row.ops_json||'[]');}catch{}
    return normalizeProfile({username:row.username,displayName:row.display_name,pinScheme:row.pin_scheme,pinIterations:row.pin_iterations,pinSalt:row.pin_salt,pinHash:row.pin_hash,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,holdings,realized,ops},username);
}
async function ensureD1Schema(env){
    if(!env.PORTFOLIO_DB)return false;
    if(!d1SchemaPromise){
        d1SchemaPromise=(async()=>{await env.PORTFOLIO_DB.exec(`CREATE TABLE IF NOT EXISTS profiles (username TEXT PRIMARY KEY, display_name TEXT NOT NULL, pin_scheme TEXT NOT NULL, pin_iterations INTEGER NOT NULL, pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL, revision INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, holdings_json TEXT NOT NULL, realized_json TEXT NOT NULL, ops_json TEXT NOT NULL);`);return true;})().catch(e=>{d1SchemaPromise=null;throw e;});
    }
    return await d1SchemaPromise;
}
async function d1CreateProfile(env,profile){
    await ensureD1Schema(env);
    const clean=normalizeProfile(profile,profile.username);clean.revision=1;clean.updatedAt=new Date().toISOString();
    try{
        await env.PORTFOLIO_DB.prepare('INSERT INTO profiles (username,display_name,pin_scheme,pin_iterations,pin_salt,pin_hash,revision,created_at,updated_at,holdings_json,realized_json,ops_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(clean.username,clean.displayName,clean.pinScheme,clean.pinIterations,clean.pinSalt,clean.pinHash,clean.revision,clean.createdAt,clean.updatedAt,JSON.stringify(clean.holdings),JSON.stringify(clean.realized),JSON.stringify(clean.ops)).run();
        return clean;
    }catch(e){const msg=String(e?.message||'').toLowerCase();if(msg.includes('unique')||msg.includes('constraint')){const err=new Error('PROFILE_EXISTS');err.code='PROFILE_EXISTS';throw err;}throw e;}
}
async function d1UpdateProfile(env,profile,expectedRevision){
    await ensureD1Schema(env);
    const clean=normalizeProfile(profile,profile.username);clean.revision=Number(expectedRevision)+1;clean.updatedAt=new Date().toISOString();
    const result=await env.PORTFOLIO_DB.prepare('UPDATE profiles SET display_name=?,pin_scheme=?,pin_iterations=?,pin_salt=?,pin_hash=?,revision=?,updated_at=?,holdings_json=?,realized_json=?,ops_json=? WHERE username=? AND revision=?').bind(clean.displayName,clean.pinScheme,clean.pinIterations,clean.pinSalt,clean.pinHash,clean.revision,clean.updatedAt,JSON.stringify(clean.holdings),JSON.stringify(clean.realized),JSON.stringify(clean.ops),clean.username,Number(expectedRevision)).run();
    if(!Number(result?.meta?.changes||0)){const err=new Error('CONFLICT');err.code='CONFLICT';throw err;}
    return clean;
}
async function getProfile(env,username){
    const u=cleanUsername(username); if(!validUsername(u))return null;
    if(env.PORTFOLIO_DB){
        const d1=await d1GetProfile(env,u); if(d1)return d1;
        const legacy=await getLegacyKVProfile(env,u);
        if(legacy){
            try{await d1CreateProfile(env,legacy); await env.SETTINGS_KV?.delete(profileKey(u));}catch(e){if(e.code!=='PROFILE_EXISTS')console.error('D1 legacy migration failed',e);}
            return (await d1GetProfile(env,u))||legacy;
        }
        return null;
    }
    return await getLegacyKVProfile(env,u);
}
async function saveNewProfile(env,profile){
    const clean=normalizeProfile(profile,profile.username);clean.updatedAt=new Date().toISOString();
    if(env.PORTFOLIO_DB){ await ensureD1Schema(env); const existing=await d1GetProfile(env,clean.username); if(existing){const e=new Error('PROFILE_EXISTS');e.code='PROFILE_EXISTS';throw e;} await d1CreateProfile(env,clean); return await d1GetProfile(env,clean.username); }
    if(!env.SETTINGS_KV)throw new Error('PROFILE_STORAGE_MISSING');
    const existing=await getLegacyKVProfile(env,clean.username); if(existing){const e=new Error('PROFILE_EXISTS');e.code='PROFILE_EXISTS';throw e;} clean.revision=1; await env.SETTINGS_KV.put(profileKey(clean.username),JSON.stringify(clean)); return clean;
}
async function updateProfileSafe(env,profile,expectedRevision){
    if(env.PORTFOLIO_DB)return await d1UpdateProfile(env,profile,expectedRevision);
    return await putLegacyKVProfile(env,profile,expectedRevision);
}
async function migrateLegacyPinIfNeeded(env,profile,pin){
    if(profile?.pinScheme==='legacy-sha256' || (!profile?.pinScheme && profile?.pinHash)){
        try{const h=await hashPin(pin);profile.pinScheme=h.scheme;profile.pinIterations=h.iterations;profile.pinSalt=h.salt;profile.pinHash=h.hash;const saved=await updateProfileSafe(env,profile,Number(profile.revision));return saved;}catch(e){console.error('PIN upgrade failed',e);}
    }
    return profile;
}
async function profileRateAllowed(env,username){
    const now=Math.floor(Date.now()/1000); const key=profileRateKey(username); if(!env.SETTINGS_KV)return true;
    try{const bucket=await env.SETTINGS_KV.get(key,'json'); if(!bucket||Number(bucket.windowStart||0)<now-PROFILE_RATE_LIMIT_WINDOW){await env.SETTINGS_KV.put(key,JSON.stringify({windowStart:now,count:1}),{expirationTtl:PROFILE_RATE_LIMIT_WINDOW+5});return true;} if(Number(bucket.count||0)>=PROFILE_RATE_LIMIT_MAX)return false; await env.SETTINGS_KV.put(key,JSON.stringify({windowStart:bucket.windowStart,count:Number(bucket.count||0)+1}),{expirationTtl:PROFILE_RATE_LIMIT_WINDOW+5});return true;}catch{return true;}
}
function profileJson(body,status=200,origin='*'){const payload=status===204?null:JSON.stringify(body);return new Response(payload,{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, X-ArzPulse-Admin','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Vary':'Origin'}});}
function getAllowedOrigin(request,env){const configured=String(env.ALLOWED_ORIGINS||env.ALLOWED_ORIGIN||'*').split(',').map(s=>s.trim()).filter(Boolean); if(configured.includes('*'))return '*'; const origin=request.headers.get('Origin')||''; return configured.includes(origin)?origin:configured[0]||'*';}
function currentProfilePrice(data,symbol){const s=normalizeSymbol(symbol);if(s==='GOLD')return toPositiveNumber(data?.gold18K);if(s==='DOLLAR')return toPositiveNumber(data?.dollarPrice||data?.usdtPrice);const local=data?.prices?.[s];if(local)return toPositiveNumber(local.lastPrice||local.last||local.latest||local.close);const global=data?.market?.[s];if(global)return toPositiveNumber(global.last||global.price||global.close);return 0;}
function profilePortfolioReport(profile,data){
    const rows=[];let invested=0,current=0,dayPnl=0; for(const h of profile.holdings||[]){const qty=toPositiveNumber(h.quantity),entry=toPositiveNumber(h.buyPrice),price=currentProfilePrice(data,h.symbol),investedNative=qty*entry,currentNative=qty*price,pnlNative=currentNative-investedNative;const localAsset=data?.prices?.[normalizeSymbol(h.symbol)],globalAsset=data?.market?.[normalizeSymbol(h.symbol)],change=Number((localAsset||globalAsset)?.change||0);const quote=['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(normalizeSymbol(h.symbol))?'USD':'IRR',fx=toPositiveNumber(data?.dollarPrice||data?.usdtPrice),multiplier=quote==='USD'&&fx>0?fx:1,investedIRR=investedNative*multiplier,currentIRR=currentNative*multiplier,pnlIRR=pnlNative*multiplier;invested+=investedIRR;current+=currentIRR;dayPnl+=currentIRR*(change/100);rows.push({id:h.id,symbol:normalizeSymbol(h.symbol),quantity:qty,buyPrice:entry,currentPrice:price,invested:investedIRR,currentValue:currentIRR,pnl:pnlIRR,roi:investedIRR?(pnlIRR/investedIRR)*100:0,nativeCurrency:quote,change24h:change,buyDate:h.buyDate,note:h.note});}
    const realized=(profile.realized||[]).reduce((sum,sale)=>{const s=normalizeSymbol(sale.symbol),quote=['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(s)?'USD':'IRR',fx=toPositiveNumber(data?.dollarPrice||data?.usdtPrice);return sum+Number(sale.pnl||0)*(quote==='USD'&&fx>0?fx:1);},0);return {rows,invested,current,unrealized:current-invested,roi:invested?((current-invested)/invested)*100:0,dayPnl,realized,totalPnl:current-invested+realized};
}
function profileTelegramText(profile,data){const report=profilePortfolioReport(profile,data),fmt=n=>Math.round(Number(n)||0).toLocaleString('fa-IR').replace(/,/g,'،');let msg=`👤 <b>پرتفوی ${escapeHtmlTelegram(profile.displayName||profile.username)}</b>\n🔗 <code>@${escapeHtmlTelegram(profile.username)}</code>\n\n`; if(!report.rows.length)return msg+`📭 <i>هنوز خریدی ثبت نشده است.</i>`; msg+=`💼 سرمایه‌گذاری: <code>${fmt(report.invested)}</code> ریال\n${report.unrealized>=0?'🟢':'🔴'} سود/زیان باز: <code>${fmt(report.unrealized)}</code> ریال (${report.roi.toFixed(2)}%)\n📅 سود/زیان تخمینی ۲۴h: <code>${fmt(report.dayPnl)}</code> ریال\n✅ سود/زیان محقق‌شده: <code>${fmt(report.realized)}</code> ریال\n\n`; for(const r of report.rows.slice(0,15)){msg+=`${r.pnl>=0?'🟢':'🔴'} <b>${r.symbol}</b> · ${r.quantity}\n   خرید: <code>${fmt(r.buyPrice)}</code> ${r.nativeCurrency}\n   فعلی: <code>${fmt(r.currentPrice)}</code> ${r.nativeCurrency}\n   P/L: <code>${fmt(r.pnl)}</code> ریال · ${r.roi.toFixed(2)}%\n`; } return msg;}
function escapeHtmlTelegram(value){return String(value??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\\':'&#92;'}[m]||m));}

async function mutateProfile(env,{username,pin,action,payload={},operationId}){
    const u=cleanUsername(username); if(!validUsername(u))throw Object.assign(new Error('INVALID_USERNAME'),{code:'INVALID_USERNAME'});
    if(!(await profileRateAllowed(env,u)))throw Object.assign(new Error('RATE_LIMIT'),{code:'RATE_LIMIT'});
    for(let attempt=0;attempt<4;attempt++){
        const current=await getProfile(env,u); if(!current)throw Object.assign(new Error('PROFILE_NOT_FOUND'),{code:'PROFILE_NOT_FOUND'});
        if(!(await verifyProfilePin(current,String(pin||''))))throw Object.assign(new Error('INVALID_PIN'),{code:'INVALID_PIN'});
        if(operationId && normalizeOperations(current.ops).includes(String(operationId)))return {profile:publicProfile(current),duplicate:true};
        let next=structuredClone?structuredClone(current):JSON.parse(JSON.stringify(current));
        const opId=cleanText(operationId||uniqueId(),90);next.ops=[...normalizeOperations(current.ops),opId].slice(-MAX_OPERATION_IDS);
        if(action==='add'){
            if(next.holdings.length>=PROFILE_MAX_HOLDINGS)throw Object.assign(new Error('HOLDINGS_LIMIT'),{code:'HOLDINGS_LIMIT'});
            const h=sanitizeHolding(payload.holding); if(!supportedProfileSymbol(h.symbol)||!(h.quantity>0)||!(h.buyPrice>0))throw Object.assign(new Error('INVALID_HOLDING'),{code:'INVALID_HOLDING'}); next.holdings.push(h);
        }else if(action==='remove'){
            const id=cleanText(payload.holdingId,80);const before=next.holdings.length;next.holdings=next.holdings.filter(h=>h.id!==id);if(before===next.holdings.length)throw Object.assign(new Error('HOLDING_NOT_FOUND'),{code:'HOLDING_NOT_FOUND'});
        }else if(action==='sell'){
            const symbol=normalizeSymbol(payload.symbol),quantity=toPositiveNumber(payload.quantity),price=toPositiveNumber(payload.price); if(!supportedProfileSymbol(symbol)||!(quantity>0)||!(price>0))throw Object.assign(new Error('INVALID_SALE'),{code:'INVALID_SALE'});
            const lots=next.holdings.filter(h=>h.symbol===symbol&&h.quantity>0).sort((a,b)=>new Date(a.buyDate)-new Date(b.buyDate));const available=lots.reduce((s,h)=>s+Number(h.quantity||0),0); if(quantity>available+1e-12)throw Object.assign(new Error('INSUFFICIENT_QUANTITY'),{code:'INSUFFICIENT_QUANTITY',available});
            let remaining=quantity;for(const lot of lots){if(remaining<=1e-12)break;const take=Math.min(Number(lot.quantity),remaining);next.realized.push({id:uniqueId(),symbol,quantity:take,sellPrice:price,pnl:take*(price-Number(lot.buyPrice)),date:new Date().toISOString(),sourceHoldingId:lot.id});lot.quantity=Number(lot.quantity)-take;remaining-=take;} next.holdings=next.holdings.filter(h=>Number(h.quantity)>1e-12);next.realized=next.realized.slice(-PROFILE_MAX_REALIZED);
        }else throw Object.assign(new Error('UNKNOWN_ACTION'),{code:'UNKNOWN_ACTION'});
        try{
            const saved=await updateProfileSafe(env,next,Number(current.revision));
            return {profile:publicProfile(saved),duplicate:false};
        }catch(e){if(e.code==='CONFLICT'||e.message==='CONFLICT')continue;throw e;}
    }
    throw Object.assign(new Error('CONFLICT'),{code:'CONFLICT'});
}

async function handleProfileAPI(request,env){
    const origin=getAllowedOrigin(request,env);if(request.method==='OPTIONS')return profileJson({ok:true},204,origin);
    if(!env.PORTFOLIO_DB && !env.SETTINGS_KV)return profileJson({ok:false,error:'PROFILE_STORAGE_MISSING'},503,origin);
    const url=new URL(request.url),route=url.pathname.replace(/\/+$/,'');
    try{
        if(request.method==='GET'&&route==='/api/profile'){
            const username=cleanUsername(url.searchParams.get('username'));if(!validUsername(username))return profileJson({ok:false,error:'INVALID_USERNAME'},400,origin);const existing=await getProfile(env,username);if(!existing)return profileJson({ok:false,error:'PROFILE_NOT_FOUND'},404,origin);return profileJson({ok:true,profile:publicProfile(existing)},200,origin);
        }
        if(route==='/api/profile'&&request.method==='POST'){
            const body=await request.json();const username=cleanUsername(body?.username),pin=String(body?.pin||'');if(!validUsername(username))return profileJson({ok:false,error:'INVALID_USERNAME'},400,origin);if(pin.length<PROFILE_PIN_MIN||pin.length>64)return profileJson({ok:false,error:'INVALID_PIN'},400,origin);if(!await profileRateAllowed(env,username))return profileJson({ok:false,error:'RATE_LIMIT'},429,origin);
            const existing=await getProfile(env,username);
            if(existing){if(!(await verifyProfilePin(existing,pin)))return profileJson({ok:false,error:'INVALID_PIN'},401,origin);existing=await migrateLegacyPinIfNeeded(env,existing,pin);if(body.displayName!==undefined){existing.displayName=validDisplayName(body.displayName)||existing.displayName;try{const saved=await updateProfileSafe(env,existing,Number(existing.revision));return profileJson({ok:true,created:false,profile:publicProfile(saved)},200,origin);}catch(e){if(e.code==='CONFLICT')return profileJson({ok:false,error:'CONFLICT'},409,origin);throw e;}}return profileJson({ok:true,created:false,profile:publicProfile(existing)},200,origin);}
            const hash=await hashPin(pin),now=new Date().toISOString();const profile={schemaVersion:PROFILE_SCHEMA_VERSION,version:PROFILE_VERSION,username,displayName:validDisplayName(body?.displayName)||username,pinScheme:hash.scheme,pinIterations:hash.iterations,pinSalt:hash.salt,pinHash:hash.hash,revision:1,createdAt:now,updatedAt:now,holdings:[],realized:[],ops:[]};const stored=await saveNewProfile(env,profile);return profileJson({ok:true,created:true,profile:publicProfile(stored)},201,origin);
        }
        if(route==='/api/profile/portfolio'&&request.method==='POST'){
            const body=await request.json();const out=await mutateProfile(env,{username:body?.username,pin:String(body?.pin||''),action:String(body?.action||''),payload:body,operationId:body?.operationId});return profileJson({ok:true,profile:out.profile,duplicate:!!out.duplicate},200,origin);
        }
        if(route==='/api/profile/export'&&request.method==='POST'){
            const body=await request.json();const username=cleanUsername(body?.username),pin=String(body?.pin||'');if(!validUsername(username)||pin.length<PROFILE_PIN_MIN)return profileJson({ok:false,error:'INVALID_REQUEST'},400,origin);const existing=await getProfile(env,username);if(!existing)return profileJson({ok:false,error:'PROFILE_NOT_FOUND'},404,origin);if(!(await verifyProfilePin(existing,pin)))return profileJson({ok:false,error:'INVALID_PIN'},401,origin);return profileJson({ok:true,backup:privateBackup(existing)},200,origin);
        }
        if(route==='/api/profile'&&request.method==='DELETE'){
            const body=await request.json().catch(()=>({}));const username=cleanUsername(body?.username),pin=String(body?.pin||'');if(!validUsername(username))return profileJson({ok:false,error:'INVALID_USERNAME'},400,origin);const existing=await getProfile(env,username);if(!existing)return profileJson({ok:false,error:'PROFILE_NOT_FOUND'},404,origin);if(!(await verifyProfilePin(existing,pin)))return profileJson({ok:false,error:'INVALID_PIN'},401,origin);if(env.PORTFOLIO_DB)await env.PORTFOLIO_DB.prepare('DELETE FROM profiles WHERE username = ?').bind(username).run();if(env.SETTINGS_KV)await env.SETTINGS_KV.delete(profileKey(username));return profileJson({ok:true,deleted:true},200,origin);
        }
        return profileJson({ok:false,error:'NOT_FOUND'},404,origin);
    }catch(error){console.error('Profile API error:',error);const status=error.code==='INVALID_PIN'?401:error.code==='RATE_LIMIT'?429:['CONFLICT','INSUFFICIENT_QUANTITY','HOLDINGS_LIMIT'].includes(error.code)?409:error.code==='PROFILE_NOT_FOUND'?404:500;return profileJson({ok:false,error:error.code||error.message||'PROFILE_API_ERROR',available:error.available},status,origin);}
}

// ---------- دریافت داده‌ها ----------
async function fetchWithTimeout(url,options={},timeoutMs=8500,retries=2){
    let lastError=null;
    for(let attempt=0;attempt<=retries;attempt++){
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
        try{const response=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{...options,signal:controller.signal,cache:'no-store'});if(!response.ok){const e=new Error(`HTTP ${response.status}`);e.status=response.status;throw e;}return response;}
        catch(e){lastError=e;if(attempt<retries)await new Promise(r=>setTimeout(r,250*(attempt+1)));}
        finally{clearTimeout(timer);}
    }
    throw lastError||new Error('NETWORK_ERROR');
}
async function fetchLatestData(){
    try{const response=await fetchWithTimeout(DATA_URL,{headers:{'User-Agent':`ArzPulse-Bot/${WORKER_VERSION}`}},8500,2);return await response.json();}
    catch(error){console.error('❌ خطا در دریافت داده‌ها:',error);return null;}
}

// ---------- دریافت تاریخچه ----------
function normalizeHistoryWorker(payload){
    if(Array.isArray(payload))return payload.flatMap(row=>Array.isArray(row)?normalizeHistoryWorker(row):[row]);
    if(Array.isArray(payload?.data))return normalizeHistoryWorker(payload.data);
    if(Array.isArray(payload?.history))return normalizeHistoryWorker(payload.history);
    return payload&&typeof payload==='object'?[payload]:[];
}
async function fetchHistoryForSymbol(symbol,days=30){
    try{
        const baseDate=new Date(),requests=[];
        for(let i=0;i<days;i++){const d=new Date(baseDate);d.setUTCDate(d.getUTCDate()-i);const dateStr=d.toISOString().slice(0,10);requests.push(fetchWithTimeout(`${HISTORY_BASE}${dateStr}.json`,{},6500,1).then(r=>r.json()).catch(()=>null));}
        const allData=await Promise.all(requests);const results=allData.flatMap(normalizeHistoryWorker).filter(Boolean).map(x=>({...x,time:x.time||x.timestamp||x.date||null})).filter(x=>x.time).sort((a,b)=>new Date(a.time)-new Date(b.time));
        const filtered=results.filter(item=>{if(symbol==='GOLD')return Number(item.GOLD18K)>0;if(symbol==='DOLLAR')return Number(item.DOLLAR||item.USDT)>0;return Number(item[symbol])>0;});
        const values=filtered.map(item=>symbol==='GOLD'?Number(item.GOLD18K):symbol==='DOLLAR'?Number(item.DOLLAR||item.USDT):Number(item[symbol]));const times=filtered.map(item=>new Date(item.time));return {values,times,count:values.length};
    }catch(error){console.error('❌ خطا در دریافت تاریخچه:',error);return null;}
}

// ---------- تولید نمودار ----------
function generateChartUrl(symbol, symbolName, period, values, times) {
    const colors = {
        'BTC': { border: '#f7931a', bg: 'rgba(247, 147, 26, 0.15)', label: 'بیت‌کوین' },
        'ETH': { border: '#627eea', bg: 'rgba(98, 126, 234, 0.15)', label: 'اتریوم' },
        'USDT': { border: '#26a17b', bg: 'rgba(38, 161, 123, 0.15)', label: 'تتر' },
        'NOT': { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', label: 'نات‌کوین' },
        'GOLD': { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', label: 'طلا (۱۸ عیار)' },
        'DOLLAR': { border: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', label: 'دلار' }
    };

    const periodNames = {
        '24h': '۲۴ ساعت گذشته',
        '7d': '۷ روز گذشته',
        '30d': '۳۰ روز گذشته'
    };

    const colorInfo = colors[symbol] || { border: '#ffffff', bg: 'rgba(255,255,255,0.1)', label: symbol };

    const labels = times.map(t => {
        if (period === '24h') {
            return t.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        }
        return t.toLocaleDateString('fa-IR', { month: '2-digit', day: '2-digit' });
    });

    let sampledValues = values;
    let sampledLabels = labels;
    const maxPoints = period === '24h' ? 100 : 60;
    if (values.length > maxPoints) {
        const step = Math.ceil(values.length / maxPoints);
        sampledValues = [];
        sampledLabels = [];
        for (let i = 0; i < values.length; i += step) {
            sampledValues.push(values[i]);
            sampledLabels.push(labels[i]);
        }
    }

    const minVal = Math.min(...sampledValues) * 0.95;
    const maxVal = Math.max(...sampledValues) * 1.05;

    const chartConfig = {
        type: 'line',
        data: {
            labels: sampledLabels,
            datasets: [{
                label: `${colorInfo.label} (${symbol})`,
                data: sampledValues,
                borderColor: colorInfo.border,
                backgroundColor: colorInfo.bg,
                fill: true,
                tension: 0.35,
                pointRadius: 2.5,
                pointBackgroundColor: colorInfo.border,
                borderWidth: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#ffffff', font: { size: 13, family: 'Vazirmatn' } }
                },
                title: {
                    display: true,
                    text: `📈 قیمت ${colorInfo.label} (${periodNames[period]})`,
                    color: '#ffffff',
                    font: { size: 17, family: 'Vazirmatn' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString('fa-IR').replace(/,/g, '،')} ریال`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.4)',
                        font: { size: 10, family: 'Vazirmatn' },
                        maxTicksLimit: 15
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.4)',
                        font: { size: 10, family: 'Vazirmatn' },
                        callback: function(value) {
                            if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
                            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                            if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
                            return value.toString();
                        }
                    },
                    min: Math.floor(minVal),
                    max: Math.ceil(maxVal)
                }
            },
            interaction: { intersect: false, mode: 'index' }
        },
        backgroundColor: '#1a1a2e',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: { top: 20, bottom: 20, left: 20, right: 20 }
    };

    return `${QUICKCHART_API}?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=950&height=520&format=png&backgroundColor=%231a1a2e`;
}

// ---------- ارسال تصویر ----------
async function sendPhoto(chatId, photoUrl, caption, token) {
    try {
        const url = `https://api.telegram.org/bot${token}/sendPhoto`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photoUrl,
                caption: caption,
                parse_mode: 'HTML'
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ خطا در ارسال تصویر:', errorText);
            return false;
        }
        console.log(`✅ تصویر به ${chatId} ارسال شد`);
        return true;
    } catch (error) {
        console.error('❌ خطا در ارسال تصویر:', error);
        return false;
    }
}

// ---------- ارسال پیام ----------
async function sendMessage(chatId, text, token, parseMode = 'HTML') {
    try {
        if (!token) {
            console.error('❌ توکن وجود ندارد');
            return false;
        }
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: parseMode,
                disable_web_page_preview: true
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Telegram API error:', errorText);
            return false;
        }
        const result = await response.json();
        console.log(`✅ پیام به ${chatId} ارسال شد`);
        return result.result?.message_id || null;
    } catch (error) {
        console.error('❌ خطا در ارسال پیام:', error);
        return false;
    }
}

// ---------- ویرایش پیام ----------
async function editMessage(chatId, messageId, text, token, parseMode = 'HTML') {
    try {
        const url = `https://api.telegram.org/bot${token}/editMessageText`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: text,
                parse_mode: parseMode,
                disable_web_page_preview: true
            })
        });
        if (!response.ok) {
            console.error('❌ خطا در ویرایش پیام:', await response.text());
            return false;
        }
        console.log(`✅ پیام ${messageId} ویرایش شد`);
        return true;
    } catch (error) {
        console.error('❌ خطا در ویرایش پیام:', error);
        return false;
    }
}

// ---------- اجرای اکشن گیت‌هاب ----------
async function triggerGitHubAction(token, repo, workflowFile = 'update-prices.yml', ref = 'main') {
    try {
        const parts = String(repo || 'mehrdadmb2/ArzPulse').split('/');
        const owner = parts[0] || 'mehrdadmb2';
        const repoName = parts[1] || 'ArzPulse';
        const endpoint = `${GITHUB_API_BASE}/${owner}/${repoName}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': `ArzPulse-Bot/${WORKER_VERSION} (Cloudflare Worker)`
            },
            body: JSON.stringify({ ref })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ GitHub API error:', response.status, errorText);
            return { success: false, status: response.status, error: errorText };
        }

        console.log('✅ اکشن گیت‌هاب با موفقیت اجرا شد.');
        return { success: true, status: response.status };
    } catch (error) {
        console.error('❌ خطا در اجرای اکشن:', error);
        return { success: false, error: error.message };
    }
}

// ---------- توابع کمکی ----------
function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '۰';
    return Math.round(num).toLocaleString('fa-IR').replace(/,/g, '،');
}

function getChangeEmoji(change) {
    if (change > 0) return '🟢';
    if (change < 0) return '🔴';
    return '⚪';
}

function getChangeArrow(change) {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '–';
}

function isDataStale(data) {
    if (!data || !data.timestamp) return true;
    const lastUpdate = new Date(data.timestamp).getTime();
    return (Date.now() - lastUpdate) > TWO_MINUTES;
}

function getSymbolName(symbol) {
    const names = {
        'BTC': 'بیت‌کوین',
        'ETH': 'اتریوم',
        'USDT': 'تتر',
        'NOT': 'نات‌کوین',
        'GOLD': 'طلا (۱۸ عیار)',
        'DOLLAR': 'دلار'
    };
    return names[symbol] || symbol;
}

// ---------- امنیت مسیرهای Worker ----------
function adminAuthorized(request,env){const expected=String(env.ADMIN_SECRET||'');if(!expected)return false;return request.headers.get('X-ArzPulse-Admin')===expected;}
function webhookAuthorized(request,env){const expected=String(env.TELEGRAM_WEBHOOK_SECRET||'');if(!expected)return true;return request.headers.get('X-Telegram-Bot-Api-Secret-Token')===expected;}
function jsonResponse(body,status=200,extra={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});}
async function healthResponse(env){const data=await fetchLatestData();return jsonResponse({ok:true,workerVersion:WORKER_VERSION,storage:{d1:!!env.PORTFOLIO_DB,kv:!!env.SETTINGS_KV},telegram:!!env.TELEGRAM_BOT_TOKEN,github:!!env.GITHUB_TOKEN,timestamp:new Date().toISOString(),marketData:{available:!!data,timestamp:data?.timestamp||null,stale:isDataStale(data)}});}

// ---------- پیام‌های ثابت ----------
function getWelcomeMessage() {
    return `
<b>🏦 به ArzPulse خوش آمدید!</b>

🤖 ربات هوشمند قیمت‌های لحظه‌ای <b>نوبیتکس</b>

📌 <u>دستورات موجود:</u>

┌──────────────────────────────────────┐
│ <b>/start</b> – پیام خوش‌آمدگویی            │
│ <b>/help</b> – راهنمای کامل                │
│ <b>/prices</b> – قیمت‌های لحظه‌ای          │
│ <b>/gold</b> – قیمت طلا                   │
│ <b>/dollar</b> – قیمت دلار                │
│ <b>/btc</b> – قیمت بیت‌کوین               │
│ <b>/eth</b> – قیمت اتریوم                 │
│ <b>/usdt</b> – قیمت تتر                   │
│ <b>/not</b> – قیمت نات‌کوین               │
│ <b>/chart</b> – راهنمای نمودار             │
│ <b>/chartall</b> – نمودار همه نمادها       │
│ <b>/status</b> – وضعیت بروزرسانی           │
│ <b>/setchannel</b> – تنظیم کانال برای ارسال خودکار │
│ <b>/stopchannel</b> – توقف ارسال خودکار    │
│ <b>/setprofile</b> – ساخت/اتصال پروفایل     │
 │ <b>/portfolio</b> – مشاهده پرتفوی           │
 │ <b>/profile</b> – مشاهده پروفایل عمومی       │
 │ <b>/buy /sell</b> – ثبت خرید/فروش            │
└──────────────────────────────────────┘

💎 <i>پشتیبانی:</i> <code>BTC, ETH, USDT, NOT, GOLD</code>

📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>
    `;
}

function getHelpMessage() {
    return `
📖 <b>راهنمای کامل ArzPulse</b>

🤖 <u>دستورات و توضیحات:</u>

┌─────────────────────────────────────┐
│ <b>/start</b> – پیام خوش‌آمدگویی              │
│ <b>/help</b> – نمایش این راهنما              │
│ <b>/prices</b> – نمایش قیمت‌های همه دارایی‌ها │
│ <b>/gold</b> – نمایش قیمت طلا (۱۸ عیار)      │
│ <b>/dollar</b> – نمایش قیمت دلار (USDT)      │
│ <b>/btc</b> – نمایش قیمت بیت‌کوین            │
│ <b>/eth</b> – نمایش قیمت اتریوم              │
│ <b>/usdt</b> – نمایش قیمت تتر                │
│ <b>/not</b> – نمایش قیمت نات‌کوین            │
│ <b>/chart</b> – راهنمای دستورات نمودار       │
│ <b>/chartall</b> – نمودار جداگانه هر نماد    │
│ <b>/status</b> – نمایش وضعیت بروزرسانی       │
│ <b>/setchannel</b> – تنظیم کانال فعلی برای ارسال خودکار │
│ <b>/stopchannel</b> – توقف ارسال خودکار به کانال │
 │ <b>/setprofile</b> – ساخت/اتصال پروفایل          │
 │ <b>/portfolio</b> – مشاهده پرتفوی                │
 │ <b>/profile</b> – مشاهده پروفایل عمومی            │
 │ <b>/buy /sell</b> – ثبت خرید/فروش                 │
└─────────────────────────────────────┘

📊 <i>دستورات نمودار:</i>

• <b>/chart BTC 24h</b> – نمودار ۲۴ ساعته
• <b>/chart ETH 7d</b> – نمودار هفتگی
• <b>/chart NOT 30d</b> – نمودار ماهانه
• <b>/chartall</b> – ۴ نمودار جداگانه (BTC, ETH, USDT, NOT)

نمادها: <code>BTC, ETH, USDT, NOT, GOLD, DOLLAR</code>

👤 پروفایل: <code>/setprofile</code> · <code>/portfolio</code> · <code>/profile</code>
💼 پرتفوی: <code>/buy</code> · <code>/sell</code>
دوره‌ها: <code>24h, 7d, 30d</code>

📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>
    `;
}

function getChartHelpMessage() {
    return `
📈 <b>راهنمای دستورات نمودار</b>

برای دریافت نمودار قیمت، از دستور زیر استفاده کنید:

<b>/chart [نماد] [دوره]</b>

مثال‌ها:
• <b>/chart BTC 24h</b> – نمودار ۲۴ ساعته بیت‌کوین
• <b>/chart ETH 7d</b> – نمودار هفتگی اتریوم
• <b>/chart NOT 30d</b> – نمودار ماهانه نات‌کوین
• <b>/chart GOLD 7d</b> – نمودار هفتگی طلا
• <b>/chartall</b> – ۴ نمودار جداگانه (BTC, ETH, USDT, NOT)

نمادهای پشتیبانی‌شده:
<code>BTC, ETH, USDT, NOT, GOLD, DOLLAR</code>

دوره‌های پشتیبانی‌شده:
<code>24h (۲۴ ساعت), 7d (۷ روز), 30d (۳۰ روز)</code>

💡 <i>نکته:</i> برای دریافت نمودار، به حداقل ۵ نقطه داده نیاز است.
اگر داده‌ها کافی نباشند، پیام خطا نمایش داده می‌شود.

📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>
    `;
}

function generatePricesMessage(data, isStale = false) {
    const { prices, gold18K, usdtPrice, timestamp } = data;
    const time = new Date(timestamp).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });

    let msg = `
📊 <b>قیمت‌های لحظه‌ای نوبیتکس</b>
🕐 <code>${time}</code>
`;

    if (isStale) {
        msg += `\n⚠️ <b>داده‌ها بیش از ۲ دقیقه از بروزرسانی آنها گذشته است.</b>`;
    }

    msg += `
─────────────────
💵 <b>نرخ دلار (USDT):</b> <code>${formatNumber(usdtPrice)}</code> ریال
🏆 <b>طلا (۱۸ عیار):</b> <code>${formatNumber(gold18K)}</code> ریال

<pre>─────────────────</pre>
`;

    const assets = [
        { symbol: 'BTC', name: 'بیت‌کوین', emoji: '🪙' },
        { symbol: 'ETH', name: 'اتریوم', emoji: '💎' },
        { symbol: 'USDT', name: 'تتر', emoji: '💵' },
        { symbol: 'NOT', name: 'نات‌کوین', emoji: '📈' }
    ];

    for (const a of assets) {
        const p = prices[a.symbol];
        if (p && p.bestSell > 0) {
            const change = p.change || 0;
            const arrow = getChangeArrow(change);
            const emoji = getChangeEmoji(change);
            msg += `
${emoji} <b>${a.emoji} ${a.symbol}</b> <i>(${a.name})</i>
   خرید: <code>${formatNumber(p.bestBuy)}</code> ریال
   فروش: <code>${formatNumber(p.bestSell)}</code> ریال
   تغییر ۲۴h: ${arrow} <b>${Math.abs(change).toFixed(2)}%</b>
   حجم: <code>${formatNumber(p.volume)}</code> ${a.symbol}
`;
        } else {
            msg += `
⚠️ <b>${a.emoji} ${a.symbol}</b>: <i>داده در دسترس نیست</i>
`;
        }
    }

    msg += `
─────────────────
📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a> | 🔄 زنده`;

    return msg;
}

function generateGoldMessage(data) {
    const { gold18K, usdtPrice, timestamp } = data;
    const time = new Date(timestamp).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });

    return `
🏆 <b>قیمت طلا (لحظه‌ای)</b>
🕐 <code>${time}</code>

─────────────────
✨ <b>هر گرم طلای ۱۸ عیار:</b>
   <code>${formatNumber(gold18K)}</code> ریال

💵 <b>نرخ تتر (USDT):</b>
   <code>${formatNumber(usdtPrice)}</code> ریال

📊 <i>محاسبه از:</i> <code>XAUT/USDT</code> × <code>USDT/IRR</code>

─────────────────
📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>
    `;
}

function generateSingleAssetMessage(coin, name, symbol) {
    if (!coin || coin.bestSell === 0) {
        return `
⚠️ <b>${name} (${symbol})</b>: <i>داده در دسترس نیست</i>
📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>
        `;
    }

    const change = coin.change || 0;
    const arrow = getChangeArrow(change);
    const emoji = getChangeEmoji(change);

    return `
${emoji} <b>${name} (${symbol})</b>

─────────────────
💰 خرید: <code>${formatNumber(coin.bestBuy)}</code> ریال
💰 فروش: <code>${formatNumber(coin.bestSell)}</code> ریال
📊 آخرین: <code>${formatNumber(coin.lastPrice)}</code> ریال
📈 تغییر ۲۴h: ${arrow} <b>${Math.abs(change).toFixed(2)}%</b>
📦 حجم: <code>${formatNumber(coin.volume)}</code> ${symbol}
📈 بالا: <code>${formatNumber(coin.high)}</code> ریال
📉 پایین: <code>${formatNumber(coin.low)}</code> ریال

─────────────────
📊 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>
    `;
}

// ---------- پردازش اصلی ----------
async function handleUpdate(update, env) {
    try {
        const msg = update.message;
        if (!msg || !msg.text) {
            console.log('📭 پیام یا متن وجود ندارد');
            return;
        }

        const chatId = msg.chat.id;
        const chatType = msg.chat.type; // private, group, supergroup, channel
        const text = msg.text.trim();
        const telegramUserId = String(msg.from?.id || '');
        const token = env.TELEGRAM_BOT_TOKEN;
        const githubToken = env.GITHUB_TOKEN;
        const githubRepo = env.GITHUB_REPO || 'mehrdadmb2/ArzPulse';
        const githubWorkflow = env.GITHUB_WORKFLOW || 'update-prices.yml';
        const githubRef = env.GITHUB_REF || 'main';

        if (!token) {
            console.error('❌ توکن تلگرام وجود ندارد');
            return;
        }

        console.log(`📩 دریافت: "${text}" از ${chatId} (نوع: ${chatType})`);

        // ---- دستورات بدون نیاز به داده ----
        if (text === '/start') {
            await sendMessage(chatId, getWelcomeMessage(), token);
            return;
        }
        if (text === '/help') {
            await sendMessage(chatId, getHelpMessage(), token);
            return;
        }
        if (text === '/chart') {
            await sendMessage(chatId, getChartHelpMessage(), token);
            return;
        }


        // ---- پروفایل و پرتفوی ----
        if (text.startsWith('/profile ')) {
            const username = cleanUsername(text.split(/\s+/)[1]);
            if (!validUsername(username)) {
                await sendMessage(chatId, `⚠️ نام کاربری معتبر نیست.\n\nفرمت: <code>/profile username</code>`, token);
                return;
            }
            const profile = await getProfile(env, username);
            if (!profile) {
                await sendMessage(chatId, `❌ پروفایل <b>@${escapeHtmlTelegram(username)}</b> پیدا نشد.`, token);
                return;
            }
            await sendMessage(chatId, profileTelegramText(profile, await fetchLatestData()), token);
            return;
        }

        if (text === '/portfolio' || text === '/myportfolio') {
            const username = telegramUserId
                ? await env.SETTINGS_KV?.get(`telegram-profile:${telegramUserId}`)
                : null;
            if (!username) {
                await sendMessage(chatId, `👤 هنوز پروفایل تلگرامی تنظیم نشده است.\n\nفرمت:\n<code>/setprofile username PIN [display name]</code>`, token);
                return;
            }
            const profile = await getProfile(env, username);
            if (!profile) {
                await sendMessage(chatId, `⚠️ پروفایل <b>@${escapeHtmlTelegram(username)}</b> دیگر وجود ندارد.`, token);
                return;
            }
            await sendMessage(chatId, profileTelegramText(profile, await fetchLatestData()), token);
            return;
        }

        if (text.startsWith('/setprofile ')) {
            if (chatType !== 'private') { await sendMessage(chatId, `⚠️ تنظیم پروفایل فقط در گفت‌وگوی خصوصی انجام شود.`, token); return; }
            const parts=text.split(/\s+/),username=cleanUsername(parts[1]),pin=String(parts[2]||''),displayName=parts.slice(3).join(' ').trim();
            if(!validUsername(username)||pin.length<PROFILE_PIN_MIN){await sendMessage(chatId,`⚠️ فرمت:\n<code>/setprofile username PIN نام-نمایشی</code>`,token);return;}
            let existing=await getProfile(env,username);
            try{
                if(existing){if(!(await verifyProfilePin(existing,pin))){await sendMessage(chatId,`❌ PIN این پروفایل صحیح نیست.`,token);return;} if(displayName){existing.displayName=validDisplayName(displayName); await updateProfileSafe(env,existing,Number(existing.revision));}}
                else {const h=await hashPin(pin),now=new Date().toISOString(); existing=await saveNewProfile(env,{schemaVersion:PROFILE_SCHEMA_VERSION,version:PROFILE_VERSION,username,displayName:validDisplayName(displayName)||username,pinScheme:h.scheme,pinIterations:h.iterations,pinSalt:h.salt,pinHash:h.hash,revision:1,createdAt:now,updatedAt:now,holdings:[],realized:[],ops:[]});}
            }catch(e){await sendMessage(chatId,`❌ خطا در ذخیره پروفایل: <code>${escapeHtmlTelegram(e.code||e.message||'ERROR')}</code>`,token);return;}
            if(env.SETTINGS_KV&&telegramUserId)await env.SETTINGS_KV.put(`telegram-profile:${telegramUserId}`,username);
            await sendMessage(chatId,`✅ پروفایل <b>@${escapeHtmlTelegram(username)}</b> به حساب تلگرام شما متصل شد.\n\nبرای مشاهده: <b>/portfolio</b>`,token);return;
        }

        if (text.startsWith('/buy ')) {
            if(chatType!=='private'){await sendMessage(chatId,`⚠️ ثبت خرید فقط در گفت‌وگوی خصوصی انجام شود.`,token);return;}
            const parts=text.split(/\s+/),symbol=normalizeSymbol(parts[1]),quantity=toPositiveNumber(parts[2]),buyPrice=toPositiveNumber(parts[3]),pin=String(parts[4]||''),username=telegramUserId?(await env.SETTINGS_KV?.get(`telegram-profile:${telegramUserId}`)):null;
            if(!username||pin.length<PROFILE_PIN_MIN||!supportedProfileSymbol(symbol)||!(quantity>0)||!(buyPrice>0)){await sendMessage(chatId,`⚠️ فرمت:\n<code>/buy SYMBOL QUANTITY PRICE PIN</code>\nمثال: <code>/buy BTC 0.01 9500000000 1234</code>`,token);return;}
            try{const out=await mutateProfile(env,{username,pin,action:'add',payload:{holding:{symbol,quantity,buyPrice,buyDate:new Date().toISOString(),note:'Telegram'}},operationId:`tg-buy-${update?.update_id||`${chatId}-${Date.now()}`}`});const quoteLabel=['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(symbol)?'USD':'IRR';await sendMessage(chatId,`✅ خرید <b>${symbol}</b> ثبت شد.\nمقدار: <code>${quantity}</code>\nقیمت خرید: <code>${formatNumber(buyPrice)}</code> ${quoteLabel}\n\n<b>/portfolio</b>`,token);}catch(e){await sendMessage(chatId,e.code==='INVALID_PIN'?`❌ PIN صحیح نیست.`:e.code==='HOLDINGS_LIMIT'?`⚠️ سقف ${PROFILE_MAX_HOLDINGS} موقعیت باز پر شده است.`:`❌ خطا: <code>${escapeHtmlTelegram(e.code||e.message||'ERROR')}</code>`,token);}return;
        }

        if (text.startsWith('/sell ')) {
            if(chatType!=='private'){await sendMessage(chatId,`⚠️ ثبت فروش فقط در گفت‌وگوی خصوصی انجام شود.`,token);return;}
            const parts=text.split(/\s+/),symbol=normalizeSymbol(parts[1]),quantity=toPositiveNumber(parts[2]),price=toPositiveNumber(parts[3]),pin=String(parts[4]||''),username=telegramUserId?(await env.SETTINGS_KV?.get(`telegram-profile:${telegramUserId}`)):null;
            if(!username||pin.length<PROFILE_PIN_MIN||!supportedProfileSymbol(symbol)||!(quantity>0)||!(price>0)){await sendMessage(chatId,`⚠️ فرمت:\n<code>/sell SYMBOL QUANTITY PRICE PIN</code>`,token);return;}
            try{const out=await mutateProfile(env,{username,pin,action:'sell',payload:{symbol,quantity,price},operationId:`tg-sell-${update?.update_id||`${chatId}-${Date.now()}`}`});const quoteLabel=['BRENT','WTI','XAUUSD','SILVER','SP500','NASDAQ','DXY'].includes(symbol)?'USD':'IRR';await sendMessage(chatId,`✅ فروش <b>${symbol}</b> ثبت شد.\nقیمت فروش: <code>${formatNumber(price)}</code> ${quoteLabel}\n\n<b>/portfolio</b>`,token);}catch(e){if(e.code==='INSUFFICIENT_QUANTITY')await sendMessage(chatId,`⚠️ موجودی کافی نیست.\nموجود: <code>${e.available}</code>\nدرخواست: <code>${quantity}</code>`,token);else await sendMessage(chatId,e.code==='INVALID_PIN'?`❌ PIN صحیح نیست.`:`❌ خطا: <code>${escapeHtmlTelegram(e.code||e.message||'ERROR')}</code>`,token);}return;
        }

        // ---- دستورات مدیریت کانال ----
        if (text === '/setchannel') {
            // فقط در کانال‌ها یا گروه‌های عمومی قابل استفاده است
            if (chatType === 'private') {
                await sendMessage(
                    chatId,
                    `⚠️ این دستور فقط در کانال یا گروه قابل استفاده است.\n` +
                    `ربات را به کانال خود اضافه کنید و این دستور را در آنجا بفرستید.`,
                    token
                );
                return;
            }

            // بررسی اینکه کاربر ادمین است (اختیاری)
            // برای سادگی، هر کسی که در کانال پیام بفرستد می‌تواند تنظیم کند.
            // اما بهتر است بررسی شود که کاربر ادمین باشد.

            // ذخیره کانال در KV
            const channels = await getChannelSettings(env);
            if (!channels.includes(chatId)) {
                channels.push(chatId);
                await saveChannelSettings(env, channels);
                await sendMessage(
                    chatId,
                    `✅ <b>این کانال برای ارسال خودکار قیمت‌ها تنظیم شد.</b>\n\n` +
                    `از این پس هر ساعت قیمت‌های لحظه‌ای به این کانال ارسال می‌شوند.\n` +
                    `برای توقف، دستور <b>/stopchannel</b> را بفرستید.`,
                    token
                );
            } else {
                await sendMessage(
                    chatId,
                    `ℹ️ این کانال قبلاً تنظیم شده است.`,
                    token
                );
            }
            return;
        }

        if (text === '/stopchannel') {
            const channels = await getChannelSettings(env);
            const index = channels.indexOf(chatId);
            if (index !== -1) {
                channels.splice(index, 1);
                await saveChannelSettings(env, channels);
                await sendMessage(
                    chatId,
                    `✅ <b>ارسال خودکار به این کانال متوقف شد.</b>`,
                    token
                );
            } else {
                await sendMessage(
                    chatId,
                    `ℹ️ این کانال در لیست ارسال خودکار وجود ندارد.`,
                    token
                );
            }
            return;
        }

        // ---- دستور /status ----
        if (text === '/status') {
            const data = await fetchLatestData();
            const isStale = isDataStale(data);
            const lastUpdate = data?.timestamp ? new Date(data.timestamp).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : 'نامشخص';
            await sendMessage(
                chatId,
                `📊 <b>وضعیت بروزرسانی</b>\n\n` +
                `🕐 آخرین بروزرسانی: <code>${lastUpdate}</code>\n` +
                `📌 وضعیت: ${isStale ? '⚠️ نیاز به بروزرسانی' : '✅ به‌روز'}`,
                token
            );
            return;
        }

        // ---- دستور /chartall ----
        if (text === '/chartall') {
            const waitMsg = await sendMessage(
                chatId,
                `⏳ <b>در حال تولید نمودارهای همه نمادها...</b>\n\n` +
                `لطفاً چند لحظه صبر کنید...`,
                token
            );

            try {
                const symbols = ['BTC', 'ETH', 'USDT', 'NOT'];
                const results = [];
                let hasError = false;
                let errorMsg = '';

                for (const sym of symbols) {
                    const history = await fetchHistoryForSymbol(sym, 2);
                    if (!history || history.count === 0) {
                        hasError = true;
                        errorMsg += `\n⚠️ داده‌ای برای ${getSymbolName(sym)} موجود نیست.`;
                        continue;
                    }

                    const minPoints = 5;
                    if (history.count < minPoints) {
                        hasError = true;
                        errorMsg += `\n⚠️ داده‌های کافی برای ${getSymbolName(sym)} موجود نیست (${history.count}/${minPoints}).`;
                        continue;
                    }

                    const chartUrl = generateChartUrl(sym, getSymbolName(sym), '24h', history.values, history.times);
                    const caption =
                        `📈 <b>نمودار ${getSymbolName(sym)}</b>\n` +
                        `📅 بازه: ۲۴ ساعت گذشته\n` +
                        `📊 تعداد نقاط: <code>${history.count}</code>\n\n` +
                        `📊 @ArzPulseBot`;

                    results.push({ symbol: sym, url: chartUrl, caption });
                }

                if (hasError) {
                    await editMessage(
                        chatId,
                        waitMsg,
                        `⚠️ <b>برخی از نمودارها تولید نشدند</b>\n\n` +
                        `${errorMsg}\n\n` +
                        `نمودارهای موجود در حال ارسال هستند...`,
                        token
                    );
                } else {
                    await editMessage(
                        chatId,
                        waitMsg,
                        `✅ <b>${results.length} نمودار آماده ارسال هستند...</b>`,
                        token
                    );
                }

                let sentCount = 0;
                for (const item of results) {
                    const sent = await sendPhoto(chatId, item.url, item.caption, token);
                    if (sent) sentCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                if (sentCount === 0) {
                    await sendMessage(
                        chatId,
                        `❌ <b>هیچ نموداری ارسال نشد</b>\n\n` +
                        `لطفاً چند دقیقه دیگر تلاش کنید.`,
                        token
                    );
                } else if (sentCount < results.length) {
                    await sendMessage(
                        chatId,
                        `⚠️ <b>${sentCount} از ${results.length} نمودار ارسال شدند.</b>`,
                        token
                    );
                } else {
                    await sendMessage(
                        chatId,
                        `✅ <b>همه ${sentCount} نمودار با موفقیت ارسال شدند!</b>`,
                        token
                    );
                }

            } catch (error) {
                console.error('❌ خطا در /chartall:', error);
                await editMessage(
                    chatId,
                    waitMsg,
                    `❌ <b>خطا در تولید نمودارها</b>\n\n` +
                    `${error.message || 'خطای ناشناخته'}`,
                    token
                );
            }
            return;
        }

        // ---- دستورات نمودار تکی ----
        if (text.startsWith('/chart ')) {
            const parts = text.split(' ');
            if (parts.length < 3) {
                await sendMessage(chatId, getChartHelpMessage(), token);
                return;
            }

            const symbol = parts[1].toUpperCase();
            const period = parts[2].toLowerCase();

            const validSymbols = ['BTC', 'ETH', 'USDT', 'NOT', 'GOLD', 'DOLLAR'];
            if (!validSymbols.includes(symbol)) {
                await sendMessage(
                    chatId,
                    `⚠️ نماد <b>${symbol}</b> پشتیبانی نمی‌شود.\n\n` +
                    `نمادهای پشتیبانی‌شده:\n<code>${validSymbols.join(', ')}</code>`,
                    token
                );
                return;
            }

            const validPeriods = ['24h', '7d', '30d'];
            if (!validPeriods.includes(period)) {
                await sendMessage(
                    chatId,
                    `⚠️ دوره <b>${period}</b> پشتیبانی نمی‌شود.\n\n` +
                    `دوره‌های پشتیبانی‌شده:\n<code>24h (۲۴ ساعت)</code>\n<code>7d (۷ روز)</code>\n<code>30d (۳۰ روز)</code>`,
                    token
                );
                return;
            }

            const daysNeeded = period === '24h' ? 1 : (period === '7d' ? 7 : 30);
            const waitMsg = await sendMessage(
                chatId,
                `⏳ <b>در حال تولید نمودار ${getSymbolName(symbol)} (${period})...</b>\n\n` +
                `لطفاً چند لحظه صبر کنید...`,
                token
            );

            const history = await fetchHistoryForSymbol(symbol, daysNeeded + 2);
            if (!history || history.count === 0) {
                await editMessage(
                    chatId,
                    waitMsg,
                    `⚠️ <b>داده‌ای برای ${getSymbolName(symbol)} در بازه ${period} موجود نیست.</b>\n\n` +
                    `لطفاً چند دقیقه دیگر تلاش کنید.`,
                    token
                );
                return;
            }

            const minPoints = period === '24h' ? 10 : 5;
            if (history.count < minPoints) {
                await editMessage(
                    chatId,
                    waitMsg,
                    `⚠️ <b>داده‌های کافی برای ${getSymbolName(symbol)} در بازه ${period} موجود نیست.</b>\n\n` +
                    `تعداد نقاط داده‌ی موجود: <code>${history.count}</code>\n` +
                    `حداقل نیاز: <code>${minPoints}</code>`,
                    token
                );
                return;
            }

            try {
                const chartUrl = generateChartUrl(symbol, getSymbolName(symbol), period, history.values, history.times);
                const caption =
                    `📈 <b>نمودار ${getSymbolName(symbol)}</b>\n` +
                    `📅 بازه: ${period === '24h' ? '۲۴ ساعت گذشته' : (period === '7d' ? '۷ روز گذشته' : '۳۰ روز گذشته')}\n` +
                    `📊 تعداد نقاط: <code>${history.count}</code>\n\n` +
                    `📊 @ArzPulseBot`;

                const sent = await sendPhoto(chatId, chartUrl, caption, token);
                if (sent) {
                    await editMessage(chatId, waitMsg, `✅ <b>نمودار ${getSymbolName(symbol)} آماده شد!</b>`, token);
                } else {
                    await editMessage(
                        chatId,
                        waitMsg,
                        `❌ <b>خطا در ارسال نمودار</b>\n\n` +
                        `لطفاً چند دقیقه دیگر تلاش کنید.`,
                        token
                    );
                }
            } catch (error) {
                console.error('❌ خطا در تولید نمودار:', error);
                await editMessage(
                    chatId,
                    waitMsg,
                    `❌ <b>خطا در تولید نمودار</b>\n\n` +
                    `${error.message || 'خطای ناشناخته'}`,
                    token
                );
            }
            return;
        }

        // ---- دستورات قیمتی ----
        const data = await fetchLatestData();
        const isStale = isDataStale(data);

        if (text === '/prices') {
            if (isStale) {
                if (isUpdating) {
                    await sendMessage(
                        chatId,
                        `⏳ <b>در حال بروزرسانی داده‌ها...</b>\n\n` +
                        `لطفاً حدود ۱ دقیقه صبر کنید.`,
                        token
                    );
                    if (!pendingUpdates.has(chatId)) {
                        pendingUpdates.set(chatId, { timestamp: Date.now() });
                    }
                    return;
                }

                if (!githubToken) {
                    await sendMessage(
                        chatId,
                        `⚠️ <b>خطا در بروزرسانی داده‌ها</b>\n\n` +
                        `توکن گیت‌هاب تنظیم نشده است.`,
                        token
                    );
                    return;
                }

                const statusMsg =
                    `⏳ <b>در حال بروزرسانی داده‌ها...</b>\n\n` +
                    `داده‌های فعلی بیش از ۲ دقیقه از بروزرسانی آنها گذشته است.\n` +
                    `در حال اجرای اکشن گیت‌هاب...\n\n` +
                    `⏱️ زمان باقیمانده: <b>${COUNTDOWN_SECONDS}</b> ثانیه`;

                const sentMsgId = await sendMessage(chatId, statusMsg, token);
                if (!sentMsgId) return;

                pendingUpdates.set(chatId, { messageId: sentMsgId, timestamp: Date.now() });
                isUpdating = true;

                const result = await triggerGitHubAction(githubToken, githubRepo, githubWorkflow, githubRef);

                if (!result.success) {
                    await editMessage(
                        chatId,
                        sentMsgId,
                        `❌ <b>خطا در بروزرسانی داده‌ها</b>\n\n` +
                        `خطا: <code>${result.error || 'خطای ناشناخته'}</code>`,
                        token
                    );
                    pendingUpdates.delete(chatId);
                    isUpdating = false;
                    return;
                }

                let countdown = COUNTDOWN_SECONDS;
                let intervalId;

                const updateCountdown = async () => {
                    countdown--;
                    if (countdown > 0) {
                        await editMessage(
                            chatId,
                            sentMsgId,
                            `⏳ <b>در حال بروزرسانی داده‌ها...</b>\n\n` +
                            `اکشن گیت‌هاب با موفقیت اجرا شد.\n` +
                            `در حال دریافت داده‌های جدید...\n\n` +
                            `⏱️ زمان باقیمانده: <b>${countdown}</b> ثانیه`,
                            token
                        );
                    } else {
                        clearInterval(intervalId);
                        try {
                            const newData = await fetchLatestData();
                            const newIsStale = isDataStale(newData);

                            if (!newIsStale && newData && newData.prices) {
                                const pricesMsg = generatePricesMessage(newData, false);
                                for (const [cid, info] of pendingUpdates) {
                                    if (info.messageId) {
                                        await editMessage(
                                            cid,
                                            info.messageId,
                                            `✅ <b>داده‌ها با موفقیت بروزرسانی شدند!</b>`,
                                            token
                                        );
                                    }
                                    await sendMessage(cid, pricesMsg, token);
                                }
                                pendingUpdates.clear();
                            } else {
                                for (const [cid, info] of pendingUpdates) {
                                    await editMessage(
                                        cid,
                                        info.messageId,
                                        `⏳ <b>در حال دریافت داده‌ها...</b>\n\n` +
                                        `مدت زمان بیشتری طول کشید.\n` +
                                        `لطفاً چند لحظه دیگر صبر کنید یا دوباره <b>/prices</b> را بفرستید.`,
                                        token
                                    );
                                }
                            }
                            isUpdating = false;
                        } catch (error) {
                            console.error('❌ خطا در ارسال قیمت‌های جدید:', error);
                            isUpdating = false;
                        }
                    }
                };

                intervalId = setInterval(updateCountdown, 1000);
                setTimeout(updateCountdown, 1000);

                return;
            }

            if (data && data.prices) {
                await sendMessage(chatId, generatePricesMessage(data, false), token);
            } else {
                await sendMessage(chatId, '⚠️ داده‌های قیمت در دسترس نیست.', token);
            }
            return;
        }

        // ---- سایر دستورات قیمتی ----
        if (text === '/gold') {
            if (isStale) {
                await sendMessage(
                    chatId,
                    `⚠️ <b>داده‌ها قدیمی هستند.</b>\n\n` +
                    `لطفاً ابتدا <b>/prices</b> را بفرستید.`,
                    token
                );
                return;
            }
            if (data) {
                await sendMessage(chatId, generateGoldMessage(data), token);
            } else {
                await sendMessage(chatId, '⚠️ داده در دسترس نیست.', token);
            }
            return;
        }

        if (text === '/dollar') {
            if (isStale) {
                await sendMessage(
                    chatId,
                    `⚠️ <b>داده‌ها قدیمی هستند.</b>\n\n` +
                    `لطفاً ابتدا <b>/prices</b> را بفرستید.`,
                    token
                );
                return;
            }
            if (data) {
                const usdtPrice = data.usdtPrice || 0;
                await sendMessage(
                    chatId,
                    `💵 <b>قیمت دلار (لحظه‌ای)</b>\n\n` +
                    `💰 هر دلار آمریکا: <code>${formatNumber(usdtPrice)}</code> ریال\n\n` +
                    `📊 @ArzPulseBot`,
                    token
                );
            } else {
                await sendMessage(chatId, '⚠️ داده در دسترس نیست.', token);
            }
            return;
        }

        const singleCommands = {
            '/btc': { key: 'BTC', name: 'بیت‌کوین' },
            '/eth': { key: 'ETH', name: 'اتریوم' },
            '/usdt': { key: 'USDT', name: 'تتر' },
            '/not': { key: 'NOT', name: 'نات‌کوین' }
        };

        if (singleCommands[text]) {
            if (isStale) {
                await sendMessage(
                    chatId,
                    `⚠️ <b>داده‌ها قدیمی هستند.</b>\n\n` +
                    `لطفاً ابتدا <b>/prices</b> را بفرستید.`,
                    token
                );
                return;
            }
            const cmd = singleCommands[text];
            const coin = data?.prices?.[cmd.key];
            if (coin && coin.bestSell > 0) {
                await sendMessage(chatId, generateSingleAssetMessage(coin, cmd.name, cmd.key), token);
            } else {
                await sendMessage(chatId, `⚠️ داده‌ای برای ${cmd.name} در دسترس نیست.`, token);
            }
            return;
        }

        // ---- پاسخ هوشمند (فقط در پیام‌های خصوصی) ----
        if (chatType === 'private') {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('سلام') || lowerText.includes('hi') || lowerText.includes('salam')) {
                await sendMessage(
                    chatId,
                    `👋 <b>سلام!</b> به <b>ArzPulse</b> خوش آمدید.\n\n` +
                    `برای دیدن قیمت‌ها: <b>/prices</b>\n` +
                    `برای نمودار: <b>/chart</b>\n` +
                    `راهنمای کامل: <b>/help</b>`,
                    token
                );
                return;
            }

            if (lowerText.includes('قیمت') || lowerText.includes('price')) {
                await sendMessage(
                    chatId,
                    `🤔 برای مشاهده قیمت‌ها: <b>/prices</b>\n` +
                    `برای نمودار: <b>/chart</b>`,
                    token
                );
                return;
            }

            await sendMessage(
                chatId,
                `❓ دستور <b>"${text}"</b> شناسایی نشد.\n\n` +
                `راهنما: <b>/help</b>\n` +
                `قیمت‌ها: <b>/prices</b>\n` +
                `نمودار: <b>/chart</b>`,
                token
            );
        } else {
            // در گروه‌ها و کانال‌ها، به پیام‌های غیردستوری پاسخ نمی‌دهیم
            console.log(`📭 پیام غیردستوری در گروه/کانال نادیده گرفته شد.`);
        }

    } catch (error) {
        console.error('❌ خطای کلی:', error);
        try {
            const chatId = update.message?.chat?.id;
            if (chatId && env.TELEGRAM_BOT_TOKEN) {
                await sendMessage(
                    chatId,
                    `⚠️ <b>خطای داخلی</b>\n\n` +
                    `لطفاً چند لحظه دیگر تلاش کنید.`,
                    env.TELEGRAM_BOT_TOKEN
                );
            }
        } catch (e) {
            console.error('❌ خطا در ارسال پیام خطا:', e);
        }
    }
}

// ---------- ارسال خودکار به کانال‌ها ----------
async function sendAutoUpdates(env) {
    try {
        const channels = await getChannelSettings(env);
        if (channels.length === 0) return;

        const data = await fetchLatestData();
        if (!data || !data.prices) return;

        const isStale = isDataStale(data);
        const msg = generatePricesMessage(data, isStale);
        const token = env.TELEGRAM_BOT_TOKEN;
        if (!token) return;

        for (const chatId of channels) {
            await sendMessage(chatId, msg, token);
            // تأخیر بین ارسال به کانال‌ها
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`✅ قیمت‌ها به ${channels.length} کانال ارسال شدند.`);
    } catch (error) {
        console.error('❌ خطا در ارسال خودکار:', error);
    }
}

// ---------- بررسی دوره‌ای ----------
async function scheduledCheck(env) {
    try {
        console.log('⏰ بررسی دوره‌ای...');
        const data = await fetchLatestData();
        const isStale = isDataStale(data);
        const githubToken = env.GITHUB_TOKEN;
        const githubRepo = env.GITHUB_REPO || 'mehrdadmb2/ArzPulse';
        const githubWorkflow = env.GITHUB_WORKFLOW || 'update-prices.yml';
        const githubRef = env.GITHUB_REF || 'main';

        const workflowStale = !data?.timestamp || (Date.now() - new Date(data.timestamp).getTime()) > WORKFLOW_STALE_MS;
        if (workflowStale && !isUpdating && githubToken) {
            console.log('⏰ داده‌ها برای چرخه زمان‌بندی قدیمی هستند، اجرای اکشن...');
            isUpdating = true;
            const result = await triggerGitHubAction(githubToken, githubRepo, githubWorkflow, githubRef);
            isUpdating = false;
            if (result.success) {
                console.log('✅ اکشن با موفقیت اجرا شد.');
            } else {
                console.error('❌ خطا در اجرای اکشن:', result.error);
            }
        }
    } catch (error) {
        console.error('❌ خطا در بررسی دوره‌ای:', error);
    }
}

// ================================================================
// ورودی اصلی Worker
// ================================================================
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api/profile' || url.pathname === '/api/profile/' ||
            url.pathname === '/api/profile/portfolio' || url.pathname === '/api/profile/portfolio/') {
            return await handleProfileAPI(request, env);
        }

        // Backwards-compatible manual GitHub Action trigger endpoint, now admin-protected.
        if (url.pathname === '/trigger' && request.method === 'POST') {
            if(!adminAuthorized(request,env)) return jsonResponse({ok:false,error:env.ADMIN_SECRET?'UNAUTHORIZED':'ADMIN_SECRET_NOT_CONFIGURED'},env.ADMIN_SECRET?401:503);
            const githubToken=env.GITHUB_TOKEN,githubRepo=env.GITHUB_REPO||'mehrdadmb2/ArzPulse',githubWorkflow=env.GITHUB_WORKFLOW||'update-prices.yml',githubRef=env.GITHUB_REF||'main';
            if(!githubToken)return jsonResponse({ok:false,error:'GITHUB_TOKEN_MISSING'},500);
            const result=await triggerGitHubAction(githubToken,githubRepo,githubWorkflow,githubRef);return jsonResponse(result,result.success?200:502);
        }

        if (url.pathname === '/webhook') {
            if(!webhookAuthorized(request,env)) return new Response('Unauthorized',{status:401});
            try { const update=await request.json(); console.log('📩 Webhook received'); await handleUpdate(update,env); return new Response('OK',{status:200}); } catch(error){ console.error('❌ Webhook error:',error); return new Response('OK',{status:200}); }
        }

        if (url.pathname === '/health' || url.pathname === '/test') {
            return await healthResponse(env);
        }

        if (url.pathname === '/check') {
            if(!adminAuthorized(request,env)) return jsonResponse({ok:false,error:env.ADMIN_SECRET?'UNAUTHORIZED':'ADMIN_SECRET_NOT_CONFIGURED'},env.ADMIN_SECRET?401:503);
            await scheduledCheck(env); return jsonResponse({ok:true,completed:'check'});
        }

        if (url.pathname === '/send') {
            if(!adminAuthorized(request,env)) return jsonResponse({ok:false,error:env.ADMIN_SECRET?'UNAUTHORIZED':'ADMIN_SECRET_NOT_CONFIGURED'},env.ADMIN_SECRET?401:503);
            await sendAutoUpdates(env); return jsonResponse({ok:true,completed:'send'});
        }

        return new Response(`ArzPulse Worker ${WORKER_VERSION} is running.

/health  - public health/data check
/webhook - Telegram webhook
/api/profile - persistent portfolio API
/trigger  - admin-only GitHub dispatch
/check    - admin-only stale-data check
/send     - admin-only channel broadcast`,{status:200,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    },

    async scheduled(controller, env, ctx) {
        const job=(async()=>{
            await scheduledCheck(env);
            const hourKey=`auto-update-hour:${new Date(controller?.scheduledTime||Date.now()).toISOString().slice(0,13)}`;
            if(env.SETTINGS_KV){const alreadySent=await env.SETTINGS_KV.get(hourKey);if(!alreadySent){await sendAutoUpdates(env);await env.SETTINGS_KV.put(hourKey,'1',{expirationTtl:7200});}}
            else {await sendAutoUpdates(env);}
        })();
        ctx.waitUntil(job);
        await job;
    }
};