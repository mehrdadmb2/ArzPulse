/* Universal Event Insights Browser SDK — Basic mode, one request per page load.
 * Sourced from: https://github.com/mehrdadmb2/github-page-insights
 * MIT License
 */
(function () {
  "use strict";
  if (window.__PAGE_INSIGHTS_SDK_STARTED__) return;
  window.__PAGE_INSIGHTS_SDK_STARTED__ = true;
  var C = window.PAGE_INSIGHTS_CONFIG || {};
  var worker = String(C.workerUrl || "").replace(/\/+$/, "");
  var meta = function (name) {
    var node = document.querySelector('meta[name="' + name + '"]');
    return node && node.content ? node.content : "";
  };
  var platformId = String(C.platformId || meta("page-insights-platform-id") || meta("page-insights-site-id") || location.hostname || "web").trim();
  var platformName = String(C.platformName || meta("page-insights-platform-name") || meta("page-insights-site-name") || platformId).trim();
  var platformType = String(C.platformType || meta("page-insights-platform-type") || "web").trim();
  var environment = String(C.environment || meta("page-insights-environment") || "production").trim();
  if (!worker || !platformId) return;
  var storagePrefix = "uei_v122_" + platformId;
  var getId = function (scope, name) {
    try {
      var store = scope === "session" ? sessionStorage : localStorage;
      var key = storagePrefix + "_" + name;
      var current = store.getItem(key);
      if (current) return current;
      var value = crypto.randomUUID();
      store.setItem(key, value);
      return value;
    } catch (_) {
      return crypto.randomUUID();
    }
  };
  var visitorId = getId("local", "visitor");
  var sessionId = getId("session", "session");
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  var pageStart = Date.now();

  function safeJson(value) {
    try { return JSON.stringify(value); } catch (_) { return "{}"; }
  }
  var screenInfo = {
    width: window.screen && screen.width || null,
    height: window.screen && screen.height || null,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen && window.screen.colorDepth || 24
  };

  var viewport = {
    width: window.innerWidth || null,
    height: window.innerHeight || null
  };
  var connectionInfo = {
    effectiveType: connection && connection.effectiveType || null,
    type: connection && connection.type || null,
    downlink: connection && connection.downlink != null ? connection.downlink : null,
    rtt: connection && connection.rtt != null ? connection.rtt : null,
    saveData: !!(connection && connection.saveData)
  };
  var page = {
    url: location.href,
    path: location.pathname,
    queryString: location.search.replace(/^\?/, ""),
    title: document.title,
    referrer: document.referrer || null
  };
  var body = {
    platformId: platformId,
    platformName: platformName,
    platformType: platformType,
    platformUrl: location.origin,
    platformDomain: location.hostname,
    environment: environment,
    appVersion: C.appVersion || null,
    source: "browser",
    sdkName: "universal-event-insights-browser",
    sdkVersion: "12.2.0",
    eventType: "pageview",
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    identity: {
      visitorId: visitorId,
      sessionId: sessionId,
      userId: C.userId || null,
      anonymousId: C.anonymousId || null
    },
    page: page,
    screen: screenInfo,
    viewport: viewport,
    connection: connectionInfo,
    durationMs: 0,
    maxScroll: 0,
    clicks: 0,
    outboundClicks: 0,
    data: {
      sdkMode: "basic",
      requestPolicy: "one_pageview_per_page_load"
    },
    metadata: {
      language: navigator.language || null,
      languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 8) : [],
      timezone: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || null,
      platform: navigator.platform || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      userAgent: navigator.userAgent || null,
      userAgentData: navigator.userAgentData ? {
        mobile: !!navigator.userAgentData.mobile,
        platform: navigator.userAgentData.platform || null,
        brands: Array.isArray(navigator.userAgentData.brands) ? navigator.userAgentData.brands.slice(0, 8) : []
      } : null,
      firstPaintCandidate: performance && performance.getEntriesByType ? (performance.getEntriesByType("paint")[0] || null) : null
    }
  };
  function send() {
    body.durationMs = Math.max(0, Date.now() - pageStart);
    var payload = safeJson(body);
    var sent = false;

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
        sent = navigator.sendBeacon(worker + "/v1/events", blob);
      }
    } catch (_) {}

    if (sent) return;
    try {
      fetch(worker + "/v1/events", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: payload,
        keepalive: true,
        cache: "no-store",
        credentials: "omit"
      }).catch(function () {});
    } catch (_) {}
  }

  send();
})();
