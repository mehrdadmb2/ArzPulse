/*
 * ArzPulse × GitHub Page Insights bridge
 * Uses the production Worker/API from github-page-insights.
 * Does not touch ArzPulse's market data code or existing visual components.
 */
(() => {
  'use strict';
  if (window.__ARZPULSE_PAGE_INSIGHTS_WIDGET__) return;
  window.__ARZPULSE_PAGE_INSIGHTS_WIDGET__ = true;

  const CONFIG = Object.freeze({
    workerUrl: 'https://github-page-insights-worker.game-developer-mb.workers.dev',
    platformId: 'arzpulse',
    platformName: 'ArzPulse | Market Terminal',
    platformType: 'web',
    environment: 'production',
    days: 7,
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 10000,
    cacheKey: 'arzpulse_page_insights_v1'
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const i18n = {
    en: {
      eyebrow: 'SITE ANALYTICS',
      title: 'ArzPulse audience & traffic',
      subtitle: 'Visitor statistics collected by GitHub Page Insights and aggregated by its Cloudflare Worker.',
      connected: 'Telemetry connected',
      offline: 'Analytics unavailable',
      views: 'Page views',
      visitors: 'Unique visitors',
      sessions: 'Sessions',
      duration: 'Avg. visit time',
      allTimeViews: 'All-time views',
      allTimeVisitors: 'All-time visitors',
      recent: 'Last 7 days',
      trend: 'Traffic trend',
      topCountries: 'Top countries',
      devices: 'Device mix',
      refreshed: 'Updated',
      noData: 'No analytics data has arrived for this site yet. The first page views will appear after the Insights collector receives them.',
      refresh: 'Refresh analytics',
      source: 'Source: github-page-insights',
      lastSeen: 'Last collected',
      empty: 'No data yet'
    },
    fa: {
      eyebrow: 'SITE ANALYTICS',
      title: 'آمار بازدید و مخاطبان ArzPulse',
      subtitle: 'آمار بازدید که توسط GitHub Page Insights جمع‌آوری و توسط Cloudflare Worker تجمیع می‌شود.',
      connected: 'اتصال آمار فعال است',
      offline: 'آمار در دسترس نیست',
      views: 'بازدید صفحات',
      visitors: 'بازدیدکننده یکتا',
      sessions: 'نشست‌ها',
      duration: 'میانگین زمان بازدید',
      allTimeViews: 'کل بازدیدها',
      allTimeVisitors: 'کل بازدیدکنندگان',
      recent: '۷ روز اخیر',
      trend: 'روند بازدید',
      topCountries: 'کشورهای برتر',
      devices: 'نوع دستگاه',
      refreshed: 'به‌روزرسانی',
      noData: 'هنوز داده‌ای برای این سایت ثبت نشده است. بعد از دریافت اولین بازدید توسط سیستم Insights، آمار در این بخش نمایش داده می‌شود.',
      refresh: 'تازه‌سازی آمار',
      source: 'منبع: github-page-insights',
      lastSeen: 'آخرین جمع‌آوری',
      empty: 'هنوز داده‌ای نیست'
    }
  };

  let state = {
    data: null,
    loading: false,
    error: false,
    updatedAt: null
  };

  function lang() {
    return document.documentElement.lang === 'fa' || document.body.classList.contains('rtl') ? 'fa' : 'en';
  }
  function T(key) { return i18n[lang()][key] ?? i18n.en[key] ?? key; }
  function number(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat(lang() === 'fa' ? 'fa-IR' : 'en-US', { maximumFractionDigits: 0 }).format(n);
  }
  function duration(ms) {
    const n = Number(ms || 0);
    if (!Number.isFinite(n) || n <= 0) return '—';
    let seconds = Math.max(0, Math.round(n / 1000));
    if (seconds < 60) return lang() === 'fa' ? `${seconds} ثانیه` : `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (minutes < 60) return lang() === 'fa' ? `${minutes}د ${rem}ث` : `${minutes}m ${rem}s`;
    const hours = Math.floor(minutes / 60);
    return lang() === 'fa' ? `${hours}س ${minutes % 60}د` : `${hours}h ${minutes % 60}m`;
  }
  function dateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return '—';
    return new Intl.DateTimeFormat(lang() === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }
  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  function loadCache() {
    try {
      const raw = localStorage.getItem(CONFIG.cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function saveCache(data) {
    try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) {}
  }
  function metric(label, value, icon, meta) {
    return `<article class="arzpi-metric"><div class="arzpi-metric-label"><span>${escapeHtml(label)}</span><span class="arzpi-metric-icon">${icon}</span></div><strong class="arzpi-metric-value">${escapeHtml(value)}</strong><small class="arzpi-metric-meta">${escapeHtml(meta || '')}</small></article>`;
  }
  function maxOf(arr) { return arr.reduce((m, x) => Math.max(m, Number(x || 0)), 0); }
  function svgTrend(daily) {
    const rows = Array.isArray(daily) ? daily.slice(-7) : [];
    if (!rows.length || !rows.some(r => Number(r.views || r.pageviews || 0) > 0)) return `<div class="arzpi-empty">${escapeHtml(T('empty'))}</div>`;
    const width = 900, height = 260, padX = 28, padY = 24;
    const values = rows.map(r => Number(r.views ?? r.pageviews ?? 0));
    const max = Math.max(1, ...values);
    const x = i => padX + (i * (width - padX * 2) / Math.max(1, values.length - 1));
    const y = v => height - padY - (v / max) * (height - padY * 2);
    const points = values.map((v,i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    const area = `${padX},${height-padY} ${points} ${x(values.length-1)},${height-padY}`;
    const dots = values.map((v,i) => `<circle class="arzpi-chart-dot" cx="${x(i)}" cy="${y(v)}" r="4"/>`).join('');
    const labels = rows.map(r => String(r.day || '').slice(5)).filter(Boolean);
    return `<svg class="arzpi-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(T('trend'))}">
      <line class="arzpi-chart-grid" x1="${padX}" y1="${padY}" x2="${width-padX}" y2="${padY}"/>
      <line class="arzpi-chart-grid" x1="${padX}" y1="${height/2}" x2="${width-padX}" y2="${height/2}"/>
      <line class="arzpi-chart-grid" x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}"/>
      <polygon class="arzpi-chart-area" fill="url(#arzpiGrad)" points="${area}"/>
      <defs><linearGradient id="arzpiGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#59d8ff"/><stop offset="100%" stop-color="#59d8ff" stop-opacity="0"/></linearGradient></defs>
      <polyline class="arzpi-chart-line" points="${points}"/>${dots}
    </svg>
    <div class="arzpi-chart-legend"><span>${escapeHtml(labels[0] || '')}</span><b>${number(values.reduce((a,b)=>a+b,0))}</b><span>${escapeHtml(labels[labels.length-1] || '')}</span></div>`;
  }
  function listBlock(items, valueKey, labelKey) {
    if (!Array.isArray(items) || !items.length) return `<div class="arzpi-empty">${escapeHtml(T('empty'))}</div>`;
    const clipped = items.slice(0,5);
    const max = maxOf(clipped.map(x => x[valueKey]));
    return `<div class="arzpi-list">${clipped.map(row => {
      const value = Number(row[valueKey] || 0);
      const label = row[labelKey] ?? row.label ?? 'Other';
      const width = max > 0 ? Math.max(4, Math.round(value / max * 100)) : 0;
      return `<div class="arzpi-list-row"><span>${escapeHtml(label || 'Unknown')}</span><div class="arzpi-list-bar"><i style="width:${width}%"></i></div><b>${number(value)}</b></div>`;
    }).join('')}</div>`;
  }
  function mount() {
    if ($('#arzpulseInsights')) return $('#arzpulseInsights');
    const mountPoint = $('#siteAnalyticsMount');
    const anchor = mountPoint || $('#marketStatus') || $('#analytics') || $('.market-grid');
    if (!anchor || !anchor.parentNode) return null;
    const wrapper = document.createElement('section');
    wrapper.id = 'arzpulseInsights';
    wrapper.className = 'arzpulse-insights';
    wrapper.innerHTML = `<div class="arzpulse-insights-shell">
      <div class="arzpulse-insights-head">
        <div>
          <div class="arzpulse-insights-eyebrow"><i></i><span data-pi="eyebrow">${escapeHtml(T('eyebrow'))}</span></div>
          <h2 class="arzpulse-insights-title" data-pi="title">${escapeHtml(T('title'))}</h2>
          <p class="arzpulse-insights-subtitle" data-pi="subtitle">${escapeHtml(T('subtitle'))}</p>
        </div>
        <div id="arzpiStatus" class="arzpulse-insights-status"><span class="arzpulse-insights-status-dot"></span><span data-pi="status">${escapeHtml(T('connected'))}</span></div>
      </div>
      <div class="arzpulse-insights-metrics" id="arzpiMetrics"></div>
      <div class="arzpulse-insights-body">
        <article class="arzpi-panel"><div class="arzpi-panel-head"><strong data-pi="trend">${escapeHtml(T('trend'))}</strong><span data-pi="recent">${escapeHtml(T('recent'))}</span></div><div id="arzpiTrend"></div></article>
        <article class="arzpi-panel"><div class="arzpi-panel-head"><strong data-pi="topCountries">${escapeHtml(T('topCountries'))}</strong><span>${escapeHtml(T('recent'))}</span></div><div id="arzpiCountries"></div></article>
        <article class="arzpi-panel"><div class="arzpi-panel-head"><strong data-pi="devices">${escapeHtml(T('devices'))}</strong><span>${escapeHtml(T('recent'))}</span></div><div id="arzpiDevices"></div></article>
        <article class="arzpi-panel"><div class="arzpi-panel-head"><strong>${escapeHtml(T('source'))}</strong><span id="arzpiLastSeen">—</span></div><div class="arzpi-empty" id="arzpiEmpty">${escapeHtml(T('noData'))}</div></article>
      </div>
      <div class="arzpi-footer"><div class="arzpi-footer-left"><span>${escapeHtml(T('source'))}</span><span id="arzpiUpdated">—</span></div><button type="button" id="arzpiRefresh">↻ ${escapeHtml(T('refresh'))}</button></div>
    </div>`;
    if (anchor.id === 'siteAnalyticsMount') {
      anchor.appendChild(wrapper);
    } else {
      anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
    }
    $('#arzpiRefresh', wrapper).addEventListener('click', () => load(true));
    return wrapper;
  }
  function updateTexts() {
    const root = $('#arzpulseInsights'); if (!root) return;
    root.querySelectorAll('[data-pi]').forEach(el => { const key = el.dataset.pi; el.textContent = T(key); });
    const refresh = $('#arzpiRefresh', root); if (refresh) refresh.textContent = `↻ ${T('refresh')}`;
  }
  function render() {
    const root = mount(); if (!root) return;
    updateTexts();
    const status = $('#arzpiStatus', root);
    const metrics = $('#arzpiMetrics', root);
    const trend = $('#arzpiTrend', root);
    const countries = $('#arzpiCountries', root);
    const devices = $('#arzpiDevices', root);
    const lastSeen = $('#arzpiLastSeen', root);
    const updated = $('#arzpiUpdated', root);
    const empty = $('#arzpiEmpty', root);
    if (!state.data) {
      metrics.innerHTML = [metric(T('views'),'—','↗',T('recent')),metric(T('visitors'),'—','◎',T('recent')),metric(T('sessions'),'—','◫',T('recent')),metric(T('duration'),'—','◷',T('recent')),metric(T('allTimeViews'),'—','Σ',T('allTimeViews')),metric(T('allTimeVisitors'),'—','◌',T('allTimeVisitors'))].join('');
      trend.innerHTML = `<div class="arzpi-empty">${escapeHtml(T('noData'))}</div>`;
      countries.innerHTML = `<div class="arzpi-empty">${escapeHtml(T('noData'))}</div>`;
      devices.innerHTML = `<div class="arzpi-empty">${escapeHtml(T('noData'))}</div>`;
      status.classList.toggle('is-offline', state.error);
      $('[data-pi="status"]', root).textContent = state.error ? T('offline') : T('connected');
      lastSeen.textContent = '—'; updated.textContent = state.updatedAt ? `${T('refreshed')}: ${dateTime(state.updatedAt)}` : '—';
      empty.textContent = T('noData');
      return;
    }
    const d = state.data;
    const totals = d.totals || {};
    const p = d.platform || {};
    metrics.innerHTML = [
      metric(T('views'), number(totals.views), '↗', T('recent')),
      metric(T('visitors'), number(totals.uniqueVisitors), '◎', T('recent')),
      metric(T('sessions'), number(totals.sessions), '◫', T('recent')),
      metric(T('duration'), duration(totals.avgDurationMs), '◷', T('recent')),
      metric(T('allTimeViews'), number(p.totalPageviews ?? totals.views), 'Σ', T('allTimeViews')),
      metric(T('allTimeVisitors'), number(p.totalVisitors ?? totals.uniqueVisitors), '◌', T('allTimeVisitors'))
    ].join('');
    trend.innerHTML = svgTrend(d.daily || []);
    countries.innerHTML = listBlock(d.countries || [], 'count', 'label');
    devices.innerHTML = listBlock(d.devices || [], 'count', 'device');
    status.classList.remove('is-offline');
    $('[data-pi="status"]', root).textContent = T('connected');
    lastSeen.textContent = dateTime(p.lastSeen);
    updated.textContent = `${T('refreshed')}: ${dateTime(state.updatedAt || Date.now())}`;
    empty.textContent = T('noData');
  }
  async function load(force = false) {
    if (state.loading && !force) return;
    state.loading = true;
    render();
    const endpoint = `${CONFIG.workerUrl.replace(/\/+$/, '')}/v1/platforms/${encodeURIComponent(CONFIG.platformId)}?days=${CONFIG.days}`;
    try {
      const data = await fetchJson(endpoint);
      state = { data, loading: false, error: false, updatedAt: Date.now() };
      saveCache(data);
    } catch (error) {
      console.warn('[ArzPulse Page Insights] analytics fetch failed:', error);
      const cached = loadCache();
      state = { data: cached?.data || null, loading: false, error: true, updatedAt: cached?.savedAt || null };
    }
    render();
  }
  function initConfig() {
    if (!window.PAGE_INSIGHTS_CONFIG) {
      window.PAGE_INSIGHTS_CONFIG = {
        workerUrl: CONFIG.workerUrl,
        platformId: CONFIG.platformId,
        platformName: CONFIG.platformName,
        platformType: CONFIG.platformType,
        environment: CONFIG.environment,
        appVersion: 'ArzPulse',
      };
    }
  }
  function watchLanguage() {
    const observer = new MutationObserver(() => render());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang','dir'] });
    const bodyObserver = new MutationObserver(() => render());
    if (document.body) bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  function boot() {
    initConfig();
    mount();
    render();
    load();
    watchLanguage();
    window.setInterval(() => load(false), CONFIG.refreshMs);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
