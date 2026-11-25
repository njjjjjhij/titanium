'use strict';
/* ============================================================
   Titanium — core: state, theme, tabs, navigation, home screen
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = 'titanium.state.v1';
const VERSION = '1.0.0';

const RANK = { free: 0, premium: 1, ultimate: 2 };
const PLANS = {
  free: { name: 'Free', price: '$0', per: 'forever', blurb: 'Everything you need to browse privately.' },
  premium: { name: 'Premium', price: '$4.99', per: 'month', blurb: 'Strict blocking, real VPN servers, sync.' },
  ultimate: { name: 'Ultimate', price: '$9.99', per: 'month', blurb: 'No limits, custom filters, multi-device delegation.' }
};
const LIMITS = {
  extensions: { free: 2, premium: 10, ultimate: Infinity },
  vpnServers: { free: 3, premium: 12, ultimate: 16 },
  retention: { free: 7, premium: 90, ultimate: 365 }
};
const can = (need) => RANK[S.plan] >= RANK[need];

const ENGINES = [
  { id: 'duckduckgo', name: 'DuckDuckGo', letter: 'D', color: '#de5833', search: 'https://duckduckgo.com/?q=%s', note: 'No tracking, no search profile' },
  { id: 'google', name: 'Google', letter: 'G', color: '#4285f4', search: 'https://www.google.com/search?q=%s', note: 'Best coverage, most data collection' },
  { id: 'brave', name: 'Brave Search', letter: 'B', color: '#fb542b', search: 'https://search.brave.com/search?q=%s', note: 'Independent index, private by default' },
  { id: 'ecosia', name: 'Ecosia', letter: 'E', color: '#1f8a4c', search: 'https://www.ecosia.org/search?q=%s', note: 'Plants trees with its ad revenue' },
  { id: 'bing', name: 'Bing', letter: 'B', color: '#00897b', search: 'https://www.bing.com/search?q=%s', note: 'Microsoft index' },
  { id: 'yahoo', name: 'Yahoo', letter: 'Y', color: '#6001d2', search: 'https://search.yahoo.com/search?p=%s', note: 'Powered by Bing' },
  { id: 'startpage', name: 'Startpage', letter: 'S', color: '#4b6bfb', search: 'https://www.startpage.com/sp/search?query=%s', note: 'Google results, zero tracking' },
  { id: 'qwant', name: 'Qwant', letter: 'Q', color: '#5c97ff', search: 'https://www.qwant.com/?q=%s', note: 'European privacy index' },
  { id: 'mojeek', name: 'Mojeek', letter: 'M', color: '#ef7d1a', search: 'https://www.mojeek.com/search?q=%s', note: 'Own crawler, no profiling' },
  { id: 'swisscows', name: 'Swisscows', letter: 'S', color: '#0a86b8', search: 'https://swisscows.com/en/web?query=%s', note: 'Swiss-hosted, family safe' },
  { id: 'presearch', name: 'Presearch', letter: 'P', color: '#1f7dff', search: 'https://presearch.com/search?q=%s', note: 'Community-run and decentralized' },
  { id: 'searx', name: 'SearXNG', letter: 'X', color: '#5a7d8c', search: 'https://searx.be/search?q=%s', note: 'Open-source metasearch' },
  { id: 'yandex', name: 'Yandex', letter: 'Y', color: '#fc3f1d', search: 'https://yandex.com/search/?text=%s', note: 'Strong for regional results' },
  { id: 'kagi', name: 'Kagi', letter: 'K', color: '#ffb319', search: 'https://kagi.com/search?q=%s', note: 'Paid, ad-free, no ranking games' },
  { id: 'baidu', name: 'Baidu', letter: 'B', color: '#2932e1', search: 'https://www.baidu.com/s?wd=%s', note: 'Chinese-language index' }
];

const BRAND_ALIAS = { searx: 'searxng' };
ENGINES.forEach((e) => { e.brand = BRAND_ALIAS[e.id] || e.id; });

const ACCENTS = [
  { id: 'blue', name: 'Titanium blue', color: '#8ab4f8', need: 'free' },
  { id: 'violet', name: 'Violet', color: '#b9a6ff', need: 'premium' },
  { id: 'mint', name: 'Mint', color: '#7ee0c0', need: 'premium' },
  { id: 'amber', name: 'Amber', color: '#f5c26b', need: 'premium' },
  { id: 'rose', name: 'Rose', color: '#f6a5b8', need: 'premium' },
  { id: 'lime', name: 'Lime', color: '#b6e36a', need: 'premium' },
  { id: 'ice', name: 'Ice', color: '#cfd8e3', need: 'premium' }
];

const THEMES = [
  { id: 'midnight', name: 'Midnight', need: 'free' },
  { id: 'slate', name: 'Slate', need: 'premium' },
  { id: 'oled', name: 'OLED black', need: 'premium' },
  { id: 'day', name: 'Daylight', need: 'premium' },
  { id: 'sepia', name: 'Sepia', need: 'premium' }
];

const DEFAULT_STATE = {
  onboarded: false,
  heardFrom: '',
  device: 'mobile',
  pageDesktop: false,
  plan: 'free',
  engine: 'duckduckgo',
  customEngine: { name: '', url: '' },
  account: null,
  theme: { preset: 'minimal', mode: 'midnight', accent: '#8ab4f8', accentId: 'blue', radius: 14, density: 'cozy', font: 15, wallpaper: false, tabLabels: true, iconStyle: 'color', searchShape: 'pill', animations: true },
  home: { shortcuts: true, safety: true, quicklinks: true, recent: true, suggestions: true, engines: true, greeting: true, status: true },
  privacy: { adblock: 'balanced', safeBrowsing: true, dnt: true, httpsOnly: true, cookies: true, filters: '' },
  vpn: { on: false, server: 'auto', protocol: 'wireguard', killSwitch: false, split: false },
  history: { on: true, retention: 7, incognito: false, items: [] },
  delegation: { active: null, pending: { label: '', scope: { titles: true, urls: true, downloads: false }, days: 30 }, log: [] },
  shortcuts: [
    { name: 'Wikipedia', url: 'https://wikipedia.org' },
    { name: 'YouTube', url: 'https://youtube.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Reddit', url: 'https://reddit.com' },
    { name: 'Hacker News', url: 'https://news.ycombinator.com' },
    { name: 'MDN', url: 'https://developer.mozilla.org' },
    { name: 'Maps', url: 'https://maps.google.com' },
    { name: 'X', url: 'https://x.com' }
  ]
};

let S = loadState();
let tabs = [{ id: 't1', url: null, title: 'New tab', stack: [], idx: -1 }];
let activeId = 't1';
let sheetStack = [];
let frameTimer = null;

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(base)) if (patch && k in patch) out[k] = deepMerge(base[k], patch[k]);
    for (const k of Object.keys(patch || {})) if (!(k in base)) out[k] = patch[k];
    return out;
  }
  return patch === undefined ? base : patch;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    const merged = deepMerge(structuredClone(DEFAULT_STATE), parsed);
    merged.history.retention = clamp(Number(merged.history.retention) || 7, 1, LIMITS.retention[merged.plan] || 7);
    return merged;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch { /* storage full / blocked */ }
}

function getPath(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
}
function setPath(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], S);
  target[last] = value;
}
function engine() {
  const custom = S.customEngine;
  if (custom && custom.name && custom.url) return { id: 'custom', name: custom.name, brand: null, letter: custom.name[0].toUpperCase(), color: '#8b93a1', search: custom.url };
  return ENGINES.find((e) => e.id === S.engine) || ENGINES[0];
}
function deviceName() {
  return S.device === 'pc' ? 'Desktop' : 'Mobile';
}
function greet() {
  const h = new Date().getHours();
  const part = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const first = S.account?.name ? S.account.name.split(' ')[0] : '';
  return first ? `${part}, ${first}` : part;
}
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
function hueFor(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}
function badgeFor(url) {
  const host = hostOf(url);
  return { letter: (host[0] || '?').toUpperCase(), color: `hsl(${hueFor(host)} 48% 42%)` };
}
function timeAgo(ts) {
  const d = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (d < 60) return `${d} min ago`;
  const h = Math.round(d / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/* ---------- theme + device ---------- */
function applySettings() {
  const t = S.theme;
  const html = document.documentElement;
  html.dataset.theme = t.mode;
  html.dataset.device = S.device;
  html.dataset.density = t.density;
  html.dataset.icons = t.iconStyle || 'color';
  html.dataset.shape = t.searchShape || 'pill';
  html.classList.toggle('no-anim', t.animations === false);
  html.style.setProperty('--accent', t.accent);
  html.style.setProperty('--r', `${t.radius}px`);
  html.style.setProperty('--font-size', `${t.font}px`);
  html.style.fontSize = `${t.font}px`;
  document.body.style.fontSize = `${t.font}px`;
  document.body.style.background = t.wallpaper
    ? undefined
    : 'var(--bg-deep)';
  $('.home')?.classList.toggle('no-glow', !t.wallpaper);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(html).getPropertyValue('--bg').trim() || '#15161a';
  if (S.privacy.adblock === 'off') S.privacy.safeBrowsing = S.privacy.safeBrowsing; // no-op, keeps shape
}

/* ---------- tabs ---------- */
function activeTab() {
  return tabs.find((t) => t.id === activeId) || tabs[0];
}

function renderTopbar() {
  const strip = $('#tabstrip');
  if (!strip) return;
  const showLabels = S.theme.tabLabels !== false;
  strip.innerHTML = tabs.map((t) => {
    const label = t.url ? hostOf(t.url) : 'New tab';
    const mark = t.url ? brandMarkForUrl(t.url, 18, label) : '<img class="brand-img" src="icon.svg" width="18" height="18" alt="">';
    return `<button class="tab-tile ${t.id === activeId ? 'active' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === activeId}" title="${esc(label)}">
      ${mark}
      ${showLabels ? `<span class="tab-label">${esc(label.length > 14 ? label.slice(0, 13) + '…' : label)}</span>` : ''}
    </button>`;
  }).join('');
  $('#tabCountBtn').textContent = String(tabs.length);
  $$('#tabstrip .tab-tile').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
}

function switchTab(id) {
  activeId = id;
  renderTopbar();
  renderView();
}

function newTab(url = null) {
  const cap = S.plan === 'free' ? 5 : S.plan === 'premium' ? 20 : Infinity;
  if (tabs.length >= cap) {
    toast(`Your plan allows ${cap} tabs at once`);
    openSheet('plans');
    return;
  }
  const id = 't' + uid();
  tabs.push({ id, url: null, title: 'New tab', stack: [], idx: -1 });
  activeId = id;
  renderTopbar();
  if (url) navigate(url);
  else renderView();
  $('#searchInput')?.focus();
}

function closeTab(id) {
  if (tabs.length === 1) {
    const t = tabs[0];
    t.url = null; t.stack = []; t.idx = -1;
    renderTopbar(); renderView();
    return;
  }
  const i = tabs.findIndex((t) => t.id === id);
  tabs = tabs.filter((t) => t.id !== id);
  if (activeId === id) activeId = tabs[Math.max(0, i - 1)].id;
  renderTopbar(); renderView();
}

function goHome() {
  const t = activeTab();
  t.url = null;
  renderTopbar(); renderView();
}

/* ---------- navigation ---------- */
function toURL(input) {
  const q = String(input || '').trim();
  if (!q) return null;
  if (/^(https?|file):\/\//i.test(q)) return q;
  if (/^(about|chrome|titanium):/i.test(q)) return q;
  if (/^localhost(:\d+)?(\/|$)/i.test(q)) return 'http://' + q;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !/\s/.test(q)) return 'https://' + q;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(q)) return 'http://' + q;
  return engine().search.replace('%s', encodeURIComponent(q));
}

function navigate(input, opts = {}) {
  const url = toURL(input);
  if (!url) return;
  const t = activeTab();
  if (!opts.replace) {
    t.stack = t.stack.slice(0, t.idx + 1);
    t.stack.push(url);
    t.idx = t.stack.length - 1;
  } else {
    t.stack[t.idx] = url;
  }
  t.url = url;
  recordHistory(url);
  $('#suggest').hidden = true;
  renderTopbar();
  renderView();
}

function back() {
  const t = activeTab();
  if (t.idx > 0) {
    t.idx -= 1;
    t.url = t.stack[t.idx];
    renderView();
  } else {
    goHome();
  }
}

function recordHistory(url) {
  if (!S.history.on) return;
  if (S.history.incognito) return;
  if (/^titanium:/i.test(url)) return;
  const entry = { id: uid(), url, title: hostOf(url), ts: Date.now() };
  S.history.items = [entry, ...S.history.items.filter((h) => h.url !== url)].slice(0, 600);
  pruneHistory();
  save();
  renderHome();
}

function pruneHistory() {
  const days = LIMITS.retention[S.plan] || 7;
  if (S.history.retention > days) S.history.retention = days;
  const cutoff = Date.now() - S.history.retention * 86400000;
  S.history.items = S.history.items.filter((h) => h.ts >= cutoff);
}

/* ---------- views ---------- */
function renderView() {
  const t = activeTab();
  const homeView = $('#homeView');
  const pageView = $('#pageView');
  if (!homeView || !pageView) return;
  const isHome = !t.url;
  homeView.hidden = !isHome;
  pageView.hidden = isHome;
  if (isHome) {
    renderHome();
    return;
  }
  $('#addressInput').value = t.url;
  const lock = $('#lockIcon');
  lock.classList.toggle('insecure', !/^https:/i.test(t.url));
  applyPageMode();
  loadFrame(t.url);
}

function loadFrame(url) {
  const frame = $('#frame');
  const fallback = $('#frameFallback');
  fallback.hidden = true;
  clearTimeout(frameTimer);
  if (!/^https?:/i.test(url)) {
    $('#ffSite').textContent = 'Titanium only loads http and https pages in the tab frame.';
    fallback.hidden = false;
    return;
  }
  frame.src = url;
  setTimeout(fitPageFrame, 60);
  frameTimer = setTimeout(() => {
    let blocked = false;
    try {
      const doc = frame.contentDocument;
      if (doc && (doc.location.href === 'about:blank' || !doc.body || doc.body.childElementCount === 0)) blocked = true;
    } catch { blocked = false; }
    if (blocked) {
      $('#ffSite').textContent = `${hostOf(url)} refused to be embedded (X-Frame-Options or a frame-ancestors CSP). A single-file browser can't strip that header — open it in your installed browser instead.`;
      fallback.hidden = false;
    }
  }, 3200);
}

/* ---------- page mode (mobile vs desktop site) ---------- */
function fitPageFrame() {
  const wrap = $('#frameWrap');
  if (!wrap) return;
  if (!wrap.classList.contains('desktop')) {
    wrap.style.removeProperty('--fit');
    wrap.style.removeProperty('--vh');
    return;
  }
  const w = wrap.clientWidth || 1;
  const h = wrap.clientHeight || 1;
  // fit the desktop width to the screen, then grow the desktop viewport height
  // so the site fills the whole area instead of sitting in a letterbox
  const fit = Math.max(0.15, w / 1280);
  wrap.style.setProperty('--fit', String(fit));
  wrap.style.setProperty('--vh', Math.max(600, Math.round(h / fit)) + 'px');
}

function applyPageMode() {
  const wrap = $('#frameWrap');
  const btn = $('#modeBtn');
  if (!wrap) return;
  const on = !!S.pageDesktop;
  wrap.classList.toggle('desktop', on);
  if (btn) {
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Mobile site — switch back to the phone layout' : 'PC mode — load the desktop version of this site';
  }
  fitPageFrame();
  requestAnimationFrame(fitPageFrame);
}

window.addEventListener('resize', () => {
  clearTimeout(window.__fitTimer);
  window.__fitTimer = setTimeout(fitPageFrame, 120);
});

/* ---------- home ---------- */
function renderHome() {
  if (!$('#homeView')) return;
  $('#hello').textContent = greet();
  $('#hello').hidden = S.home.greeting === false;
  const pill = $('#planPill');
  pill.textContent = PLANS[S.plan].name;
  pill.classList.toggle('ult', S.plan === 'ultimate');

  const eng = engine();
  const badge = $('#engineBadge');
  badge.innerHTML = eng.brand ? brandMark(eng.brand, 26) : `<span class="brand-fallback">${esc(eng.letter || 'S')}</span>`;
  $('#searchInput').placeholder = `Search ${eng.name} or type URL`;

  const safety = $('#safetyCard');
  safety.classList.toggle('armed', S.privacy.safeBrowsing);
  if (S.privacy.safeBrowsing) {
    $('#safetyTitle').textContent = 'Safe Browsing is on';
    $('#safetyText').textContent = 'Dangerous sites and downloads are flagged';
    $('#safetyBtn').textContent = 'Review protections';
  } else {
    $('#safetyTitle').textContent = 'Turn on Safe Browsing';
    $('#safetyText').textContent = 'Get protection against dangerous sites';
    $('#safetyBtn').textContent = 'Go to settings';
  }

  $('#quicklinks').innerHTML = (S.shortcuts || []).slice(0, can('premium') ? 12 : 8).map((s, i) => {
    return `<button class="quicklink" data-shortcut="${i}" title="${esc(s.url)}">
      <span class="ql-badge">${brandMarkForUrl(s.url, 26, s.name)}</span>
      <span>${esc(s.name)}</span>
    </button>`;
  }).join('');
  $$('#quicklinks .quicklink').forEach((b) => b.addEventListener('click', () => navigate(S.shortcuts[Number(b.dataset.shortcut)].url)));

  $('#vpnStatus').textContent = S.vpn.on ? `VPN on · ${serverName(S.vpn.server)}` : 'VPN off';
  $('#vpnSub').textContent = S.vpn.on ? `${S.vpn.protocol} tunnel active` : 'No tunnel active';
  $('#dotVpn').className = 'dot' + (S.vpn.on ? ' on' : '');

  const adLabels = { off: 'Ad block off', balanced: 'Ad block on', strict: 'Strict blocking', aggressive: 'Ultimate blocking' };
  $('#blockStatus').textContent = adLabels[S.privacy.adblock] || 'Ad block on';
  $('#blockSub').textContent = S.privacy.adblock === 'off' ? 'Nothing is filtered' : 'Trackers, ads and annoyances filtered';
  $('#dotBlock').className = 'dot' + (S.privacy.adblock === 'off' ? '' : ' on');

  $('#histStatus').textContent = S.history.incognito ? 'Private mode' : S.history.on ? 'History on' : 'History off';
  $('#histSub').textContent = S.history.on && !S.history.incognito ? `Kept ${S.history.retention} days` : S.history.incognito ? 'New tabs start private' : 'Nothing is recorded';
  $('#dotHist').className = 'dot' + (S.history.on && !S.history.incognito ? ' on' : ' warn');

  const recent = S.history.items.slice(0, 4);
  const recentWrap = $('#recent');
  recentWrap.hidden = !S.home.recent || recent.length === 0;
  recentWrap.innerHTML = recent.length ? `
    <div class="recent-head"><h3>Jump back in</h3><button data-act="history">History</button></div>
          ${recent.map((h) => `<button class="recent-item" data-url="${esc(h.url)}">
      <span class="r-badge">${brandMarkForUrl(h.url, 20, h.title)}</span>
      <span class="r-body"><b>${esc(h.title)}</b><small>${esc(h.url)} · ${timeAgo(h.ts)}</small></span>
    </button>`).join('')}` : '';
  $$('#recent .recent-item').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.url)));

  if (!S.home.quicklinks) $('#quicklinks').hidden = true; else $('#quicklinks').hidden = false;
  $('#safetyCard').hidden = !S.home.safety;
  $('#addShortcutBtn').hidden = !S.home.shortcuts;
  $('#statusCard').hidden = S.home.status === false;

  const strip = $('#engineStrip');
  if (strip) {
    strip.hidden = S.home.engines === false;
    strip.innerHTML = ENGINES.map((e) => `<button class="engine-chip" data-act="engine" data-engine="${e.id}"
      title="${esc(e.name)}" aria-label="Search with ${esc(e.name)}"
      aria-pressed="${S.engine === e.id && !S.customEngine.name}">${brandMark(e.brand, 24)}</button>`).join('');
  }
}

/* ---------- sheet router ---------- */
function openSheet(name, params = {}) {
  if (!name || name === sheetStack[sheetStack.length - 1]) {
    renderSheet();
    $('#sheet').hidden = false;
    return;
  }
  sheetStack.push(name);
  sheetParams = params;
  $('#sheet').hidden = false;
  renderSheet();
}
let sheetParams = {};

function navigateSheet(name, params = {}) {
  sheetStack.push(name);
  sheetParams = params;
  renderSheet(true);
}

function sheetBack() {
  if (sheetStack.length > 1) sheetStack.pop();
  renderSheet(true);
}

function closeSheet() {
  $('#sheet').hidden = true;
  sheetStack = [];
  sheetParams = {};
}

function renderSheet(keepScroll = false) {
  const body = $('#sheetBody');
  const scroll = keepScroll ? body.scrollTop : 0;
  if (!sheetStack.length) sheetStack = ['root'];
  const name = sheetStack[sheetStack.length - 1];
  const panel = PANELS[name] || PANELS.root;
  const out = panel(sheetParams);
  $('#sheetTitle').textContent = out.title;
  body.innerHTML = out.html;
  $('#sheetBack').style.visibility = sheetStack.length > 1 ? 'visible' : 'hidden';
  body.scrollTop = scroll;
  if (out.bind) out.bind(body);
}

/* ---------- toast + modal ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function openModal(html, onMount) {
  $('#modal').hidden = false;
  $('#modalCard').innerHTML = html;
  if (onMount) onMount($('#modalCard'));
}
function closeModal() {
  $('#modal').hidden = true;
  $('#modalCard').innerHTML = '';
}

/* ---------- adblock + vpn helpers ---------- */
const SERVERS = [
  { id: 'auto', name: 'Auto (fastest)', need: 'free', flag: '⚡' },
  { id: 'us', name: 'United States', need: 'free', flag: '🇺🇸' },
  { id: 'nl', name: 'Netherlands', need: 'free', flag: '🇳🇱' },
  { id: 'de', name: 'Germany', need: 'premium', flag: '🇩🇪' },
  { id: 'uk', name: 'United Kingdom', need: 'premium', flag: '🇬🇧' },
  { id: 'ca', name: 'Canada', need: 'premium', flag: '🇨🇦' },
  { id: 'fr', name: 'France', need: 'premium', flag: '🇫🇷' },
  { id: 'se', name: 'Sweden', need: 'premium', flag: '🇸🇪' },
  { id: 'ch', name: 'Switzerland', need: 'premium', flag: '🇨🇭' },
  { id: 'jp', name: 'Japan', need: 'premium', flag: '🇯🇵' },
  { id: 'sg', name: 'Singapore', need: 'premium', flag: '🇸🇬' },
  { id: 'au', name: 'Australia', need: 'premium', flag: '🇦🇺' },
  { id: 'br', name: 'Brazil', need: 'ultimate', flag: '🇧🇷' },
  { id: 'in', name: 'India', need: 'ultimate', flag: '🇮🇳' },
  { id: 'za', name: 'South Africa', need: 'ultimate', flag: '🇿🇦' },
  { id: 'is', name: 'Iceland', need: 'ultimate', flag: '🇮🇸' }
];
function serverName(id) {
  return (SERVERS.find((s) => s.id === id) || SERVERS[0]).name;
}

/* ---------- events ---------- */
function wire() {
  $('#homeBtn').addEventListener('click', goHome);
  $('#newTabBtn').addEventListener('click', () => newTab());
  $('#tabCountBtn').addEventListener('click', () => openSheet('tabs'));
  $('#menuBtn').addEventListener('click', () => openSheet('root'));
  $('#planPill').addEventListener('click', () => openSheet('plans'));

  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#searchInput').value;
    if (!v.trim()) return;
    navigate(v);
    $('#searchInput').value = '';
  });
  $('#searchInput').addEventListener('input', renderSuggest);
  $('#searchInput').addEventListener('focus', renderSuggest);
  $('#micBtn').addEventListener('click', voiceSearch);

  $('#addShortcutBtn').addEventListener('click', addShortcutDialog);
  $('#safetyBtn').addEventListener('click', () => openSheet('privacy'));

  $('#addressForm').addEventListener('submit', (e) => {
    e.preventDefault();
    navigate($('#addressInput').value, { replace: true });
  });
  $('#backBtn').addEventListener('click', back);
  $('#modeBtn').addEventListener('click', () => ACTIONS.pageMode());
  if (window.ResizeObserver && $('#frameWrap')) {
    new ResizeObserver(() => fitPageFrame()).observe($('#frameWrap'));
  }
  $('#reloadBtn').addEventListener('click', () => loadFrame(activeTab().url));

  $('#ffOpen').addEventListener('click', () => {
    const u = activeTab().url;
    if (u) window.open(u, '_blank', 'noopener');
  });
  $('#ffCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(activeTab().url); toast('Link copied'); } catch { toast('Copy failed'); }
  });

  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheetBack').addEventListener('click', sheetBack);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  $('#homeView').addEventListener('scroll', () => {
    $('#topbar').classList.toggle('scrolled', $('#homeView').scrollTop > 6);
  }, { passive: true });

  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const fn = window.ACTIONS && ACTIONS[act.dataset.act];
      if (fn) { e.preventDefault(); fn(act, e); }
      return;
    }
    if (!e.target.closest('.searchpill') && !e.target.closest('#suggest')) $('#suggest').hidden = true;
  });

  document.addEventListener('change', (e) => {
    const node = e.target.closest('[data-input]');
    if (!node) return;
    const fn = window.ACTIONS && ACTIONS.input;
    if (fn) fn(node, e);
  });

  document.addEventListener('keydown', (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 't') { e.preventDefault(); newTab(); }
    if (meta && e.key.toLowerCase() === 'l') { e.preventDefault(); $('#searchInput')?.focus(); }
    if (meta && e.key.toLowerCase() === 'w') { e.preventDefault(); closeTab(activeId); }
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) closeModal();
      else if (!$('#sheet').hidden) closeSheet();
    }
  });
}

function renderSuggest() {
  const q = $('#searchInput').value.trim();
  const box = $('#suggest');
  if (!S.home.suggestions || q.length < 2) { box.hidden = true; return; }
  const local = S.history.items
    .filter((h) => (h.title + ' ' + h.url).toLowerCase().includes(q.toLowerCase()))
    .slice(0, 3);
  const rows = [
    ...local.map((h) => ({ text: h.title, url: h.url, type: 'history' })),
    { text: q, type: 'search' },
    { text: q + ' news', type: 'search' }
  ];
  box.innerHTML = rows.map((r) => `<button data-sug="${esc(r.text)}">
    <span>${esc(r.text)}</span><span class="sug-type">${r.type === 'history' ? 'history' : engine().name}</span>
  </button>`).join('');
  box.hidden = false;
  $$('#suggest button').forEach((b) => b.addEventListener('click', () => {
    const text = b.dataset.sug;
    const hit = rows.find((r) => r.text === text && r.url);
    navigate(hit ? hit.url : text);
    $('#searchInput').value = '';
    box.hidden = true;
  }));
}

function voiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#micBtn');
  if (!SR) { toast('Voice search needs a browser with the Web Speech API'); return; }
  const rec = new SR();
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = false;
  btn.classList.add('live');
  rec.onresult = (ev) => {
    const text = ev.results[0][0].transcript;
    navigate(text);
    $('#searchInput').value = '';
  };
  rec.onerror = () => toast('Could not hear that — try again');
  rec.onend = () => btn.classList.remove('live');
  try { rec.start(); } catch { btn.classList.remove('live'); }
}

function addShortcutDialog() {
  openModal(`<h3>Add a shortcut</h3>
    <p>Shortcuts sit on your start page. They never leave this device.</p>
    <div class="field"><label>Name</label><input id="scName" type="text" placeholder="Example" maxlength="24"></div>
    <div class="field"><label>Address</label><input id="scUrl" type="text" placeholder="example.com"></div>
    <div class="modal-actions"><button class="ghost-btn" id="scCancel">Cancel</button><button class="primary-btn" id="scSave">Add</button></div>`,
    (root) => {
      $('#scCancel', root).addEventListener('click', closeModal);
      $('#scSave', root).addEventListener('click', () => {
        const name = $('#scName', root).value.trim();
        const url = toURL($('#scUrl', root).value.trim());
        if (!name || !url) { toast('Add a name and an address'); return; }
        if (!S.home.shortcuts) { S.home.shortcuts = true; }
        const max = can('premium') ? 12 : 8;
        S.shortcuts = [...S.shortcuts, { name, url }].slice(-max);
        save(); renderHome(); closeModal(); toast('Shortcut added');
      });
    });
}
