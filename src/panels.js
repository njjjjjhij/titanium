'use strict';
/* ============================================================
   Titanium — panels part 1: building blocks, home, tabs,
   appearance, search engines, privacy
   ============================================================ */

const ICON = {
  palette: '<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="9.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="15" r="1.1" fill="currentColor" stroke="none"/><path d="M14 15.2c1.5.4 2.6-.3 2.9-1.6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  shield: '<path d="M12 3.2 19 6v6.1c0 4.3-3 7.6-7 8.9-4-1.3-7-4.6-7-8.9V6l7-2.8Z"/><path d="M9.2 12l2 2 3.6-4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 2.4 14.5 0 17M12 3.5c-2.4 2.5-2.4 14.5 0 17"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>',
  puzzle: '<path d="M9 4.5h6v3a2 2 0 1 0 3.5 1.6V15h-3a2 2 0 1 0-1.6 3.5H5V9.5h3a2 2 0 1 0 1-5Z"/>',
  star: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6M12 7.6v.1"/>',
  tabs: '<rect x="3.5" y="7" width="13" height="12" rx="2.5"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 16h-1"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1-3.4 3.6-5.2 7-5.2s6 1.8 7 5.2"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  download: '<path d="M12 4v11M8 11.5l4 4 4-4M5 19h14"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2"/>',
  power: '<path d="M12 4v8M7.5 6.8a7 7 0 1 0 9 0"/>',
  sparkle: '<path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8Z"/><path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-2.4-5.3M19 4v5h-5"/>',
  mobile: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  monitor: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 20h6M12 17v3"/>',
  ext: '<path d="M9 4.5h6v3a2 2 0 1 0 3.5 1.6V15h-3a2 2 0 1 0-1.6 3.5H5V9.5h3a2 2 0 1 0 1-5Z"/>',
  code: '<path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13 5l-2 14"/>'
};

const LOOK_PRESETS = {
  minimal: { mode: 'midnight', accentId: 'blue', accent: '#8ab4f8', radius: 14, density: 'cozy', font: 15, wallpaper: false, iconStyle: 'color', searchShape: 'pill', animations: true },
  reference: { mode: 'midnight', accentId: 'blue', accent: '#8ab4f8', radius: 22, density: 'comfortable', font: 15, wallpaper: true, iconStyle: 'color', searchShape: 'pill', animations: true },
  mono: { iconStyle: 'mono', wallpaper: false, radius: 16, searchShape: 'rounded', density: 'comfortable', animations: true },
  compact: { radius: 12, density: 'cozy', font: 14, wallpaper: false, iconStyle: 'color', searchShape: 'pill', animations: true },
  bold: { accentId: 'violet', accent: '#b9a6ff', radius: 26, density: 'spacious', font: 16, wallpaper: true, iconStyle: 'color', searchShape: 'rounded', animations: true }
};

function ico(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`;
}

function toggleRow({ title, sub, path, checked, need, disabled }) {
  const locked = need && !can(need);
  return `<div class="list-row">
    <span class="lr-body"><b>${esc(title)}${locked ? ' <span class="perm">' + (need === 'premium' ? 'Premium' : 'Ultimate') + '</span>' : ''}</b><small>${esc(sub)}</small></span>
    <button class="toggle" data-act="toggle" data-path="${path}" ${need ? `data-need="${need}"` : ''} aria-pressed="${!!checked}" aria-label="${esc(title)}" ${disabled ? 'disabled' : ''}></button>
  </div>`;
}

function rowButton({ icon, title, sub, panel, act, right }) {
  return `<button class="list-row" ${panel ? `data-act="sheet" data-panel="${panel}"` : `data-act="${act}"`}>
    <span class="lr-icon">${ico(icon)}</span>
    <span class="lr-body"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
    ${right || '<span class="chev">›</span>'}
  </button>`;
}

function planLock(need, label = '') {
  if (!need || can(need)) return '';
  return `<span class="perm">${need === 'premium' ? 'Premium' : 'Ultimate'}${label ? ' · ' + label : ''}</span>`;
}

const PANELS = {};

/* ---------------- home / menu root ---------------- */
PANELS.root = () => ({
  title: 'Menu',
  html: `
    <button class="list-row" data-act="sheet" data-panel="account">
      <span class="lr-icon" style="background:${S.account ? `hsl(${hueFor(S.account.name)} 45% 40%)` : 'var(--card-3)'};color:#fff;font-weight:800">${esc((S.account?.name || 'T')[0].toUpperCase())}</span>
      <span class="lr-body">
        <b>${esc(S.account ? S.account.name : 'No profile yet')}${S.account?.guest ? ' (guest)' : ''}</b>
        <small>${esc(S.account?.email || 'Local profile')} · ${PLANS[S.plan].name} plan</small>
      </span>
      <span class="chev">›</span>
    </button>
    <button class="list-row" data-act="sheet" data-panel="plans" style="border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);border-radius:14px;background:color-mix(in srgb,var(--accent) 10%,var(--card))">
      <span class="lr-icon">${ico('star')}</span>
      <span class="lr-body"><b>${S.plan === 'free' ? 'Upgrade Titanium' : PLANS[S.plan].name + ' is active'}</b><small>${S.plan === 'free' ? 'From $4.99 · strict blocking, VPN, delegation' : 'Manage your plan and receipts'}</small></span>
      <span class="chev">›</span>
    </button>

    <div class="section-label">Browser</div>
    <div class="list">
      ${rowButton({ icon: 'tabs', title: 'Tabs', sub: `${tabs.length} open`, panel: 'tabs' })}
      ${rowButton({ icon: 'search', title: 'Search engine', sub: engine().name, panel: 'engines' })}
      ${rowButton({ icon: 'monitor', title: 'PC mode', sub: S.pageDesktop ? 'Sites load their desktop version' : 'Sites load their mobile version', act: 'pageMode', right: `<span class="perm">${S.pageDesktop ? 'On' : 'Off'}</span>` })}
      ${rowButton({ icon: 'clock', title: 'History', sub: S.history.on ? `${S.history.items.length} entries · ${S.history.retention} days` : 'Off', panel: 'history' })}
      ${rowButton({ icon: 'download', title: 'Delegation', sub: S.delegation.active ? `Granted to ${S.delegation.active.label}` : 'Not delegated', panel: 'delegation' })}
    </div>

    <div class="section-label">Protection</div>
    <div class="list">
      ${rowButton({ icon: 'shield', title: 'Privacy & ad blocking', sub: S.privacy.adblock === 'off' ? 'Blocking off' : `${S.privacy.adblock} blocking · Safe Browsing ${S.privacy.safeBrowsing ? 'on' : 'off'}`, panel: 'privacy' })}
      ${rowButton({ icon: 'globe', title: 'VPN', sub: S.vpn.on ? `${serverName(S.vpn.server)} · connected` : 'Off', panel: 'vpn' })}
      ${rowButton({ icon: 'puzzle', title: 'Extensions', sub: 'Chrome extensions, loaded locally', panel: 'extensions' })}
    </div>

    <div class="section-label">Make it yours</div>
    <div class="list">
      ${rowButton({ icon: 'palette', title: 'Appearance', sub: `${THEMES.find((x) => x.id === S.theme.mode)?.name || 'Midnight'} · ${deviceName()} layout`, panel: 'appearance' })}
      ${rowButton({ icon: 'sparkle', title: 'Start page shortcuts', sub: `${S.shortcuts.length} shortcuts`, panel: 'shortcuts' })}
      ${rowButton({ icon: 'code', title: 'Source code', sub: 'View, edit and download every file', act: 'openSource' })}
      ${rowButton({ icon: 'info', title: 'About Titanium', sub: `v${VERSION} · MIT licensed`, panel: 'about' })}
    </div>
    <div class="list">
      <button class="list-row" data-act="reset"><span class="lr-icon" style="color:var(--danger)">${ico('refresh')}</span><span class="lr-body"><b>Reset Titanium</b><small>Wipe local profile, history and settings</small></span></button>
    </div>
    <p class="hint" style="text-align:center;color:var(--muted-2);font-size:11.5px;margin:4px 0 0">Titanium ${VERSION} · everything is stored on this device</p>`
});

/* ---------------- tabs ---------------- */
PANELS.tabs = () => ({
  title: 'Tabs',
  html: `
    <div class="list" id="tabList">
      ${tabs.map((t) => `<button class="list-row" data-act="switchTab" data-id="${t.id}">
        <span class="lr-icon">${t.url ? esc(badgeFor(t.url).letter) : ico('home')}</span>
        <span class="lr-body"><b>${esc(t.url ? hostOf(t.url) : 'New tab')}</b><small>${esc(t.url || 'Start page')}</small></span>
        <span class="mini-btn danger" data-act="closeTab" data-id="${t.id}" role="button">Close</span>
      </button>`).join('')}
    </div>
    <div class="plan-actions">
      <button class="mini-btn accent" data-act="newtab">New tab</button>
      <button class="mini-btn" data-act="closeOthers">Close others</button>
    </div>
    <div class="banner">${ico('info')}<div><b>Tab limit</b><span>${S.plan === 'free' ? 'Free allows 5 tabs at once — Premium raises it to 20, Ultimate is unlimited.' : 'Your plan has room for ' + (S.plan === 'premium' ? '20 tabs' : 'unlimited tabs') + '.'}</span></div></div>`
});

/* ---------------- appearance ---------------- */
PANELS.appearance = () => ({
  title: 'Appearance',
  html: `
    <div class="section-label">Presets</div>
    <div class="chips">
      ${[['minimal', 'Minimal'], ['reference', 'Reference'], ['mono', 'Monochrome'], ['compact', 'Compact'], ['bold', 'Bold']].map(([id, label]) => `<button class="chip" data-act="preset" data-preset="${id}" aria-pressed="${S.theme.preset === id}">${label}</button>`).join('')}
    </div>

    <div class="section-label">Theme</div>
    <div class="chips">
      ${THEMES.map((t) => `<button class="chip" data-act="theme" data-theme="${t.id}" aria-pressed="${S.theme.mode === t.id}">${t.name}</button>`).join('')}
    </div>

    <div class="section-label">Accent</div>
    <div class="swatches">
      ${ACCENTS.map((a) => `<button class="swatch" title="${a.name}" data-act="accent" data-accent="${a.id}" aria-pressed="${S.theme.accentId === a.id}" style="background:${a.color}"></button>`).join('')}
      <label class="swatch" title="Custom accent" style="background:conic-gradient(#ff6b6b,#ffd166,#7ee0c0,#8ab4f8,#b9a6ff,#ff6b6b);display:grid;place-items:center;cursor:pointer">
        <input type="color" data-input="theme.accent" value="${S.theme.accent}" style="opacity:0;width:100%;height:100%;border:0;cursor:pointer">
      </label>
    </div>

    <div class="section-label">Layout</div>
    <div class="list">
      <div class="list-row">
        <span class="lr-icon">${ico(S.device === 'mobile' ? 'mobile' : 'monitor')}</span>
        <span class="lr-body"><b>Device layout</b><small>Optimised for ${deviceName().toLowerCase()}</small></span>
        <div class="chips" style="padding:0">
          <button class="chip" data-act="device" data-device="mobile" aria-pressed="${S.device === 'mobile'}">Mobile</button>
          <button class="chip" data-act="device" data-device="pc" aria-pressed="${S.device === 'pc'}">PC</button>
        </div>
      </div>
      <div class="range-row"><span class="lr-body"><b style="font-size:13.5px">Corner radius</b></span>
        <input type="range" min="8" max="30" step="1" value="${S.theme.radius}" data-input="theme.radius">
        <output>${S.theme.radius}px</output>
      </div>
      <div class="range-row"><span class="lr-body"><b style="font-size:13.5px">Text size</b></span>
        <input type="range" min="13" max="18" step="1" value="${S.theme.font}" data-input="theme.font">
        <output>${S.theme.font}px</output>
      </div>
      <div class="list-row">
        <span class="lr-body"><b>Density</b><small>How much space cards get</small></span>
        <div class="chips" style="padding:0">
          ${['cozy', 'comfortable', 'spacious'].map((d) => `<button class="chip" data-act="density" data-density="${d}" aria-pressed="${S.theme.density === d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div class="list-row">
        <span class="lr-body"><b>Search bar</b><small>Corner treatment for the pill</small></span>
        <div class="chips" style="padding:0">
          ${[['pill', 'Pill'], ['rounded', 'Rounded'], ['square', 'Square']].map(([id, label]) => `<button class="chip" data-act="shape" data-shape="${id}" aria-pressed="${S.theme.searchShape === id}">${label}</button>`).join('')}
        </div>
      </div>
      <div class="list-row">
        <span class="lr-body"><b>Icons</b><small>Real colour marks or monochrome</small></span>
        <div class="chips" style="padding:0">
          ${[['color', 'Colour'], ['mono', 'Mono']].map(([id, label]) => `<button class="chip" data-act="iconStyle" data-icons="${id}" aria-pressed="${S.theme.iconStyle === id}">${label}</button>`).join('')}
        </div>
      </div>
      ${toggleRow({ title: 'PC mode for sites', sub: 'Load pages at a 1280×900 desktop viewport', path: 'pageDesktop', checked: S.pageDesktop })}
      ${toggleRow({ title: 'Ambient wallpaper glow', sub: 'Tint the canvas with your accent colour', path: 'theme.wallpaper', checked: S.theme.wallpaper })}
      ${toggleRow({ title: 'Show tab names', sub: 'Off keeps the top strip icon-only, like a phone', path: 'theme.tabLabels', checked: S.theme.tabStyle === 'tiles' })}
    </div>

    <div class="section-label">Start page</div>
    <div class="list">
      ${toggleRow({ title: 'Shortcuts', sub: 'Your pinned sites under the search bar', path: 'home.shortcuts', checked: S.home.shortcuts })}
      ${toggleRow({ title: 'Safety Check card', sub: 'The protection card from the start screen', path: 'home.safety', checked: S.home.safety })}
      ${toggleRow({ title: 'Quick links grid', sub: 'Always-visible site tiles', path: 'home.quicklinks', checked: S.home.quicklinks })}
      ${toggleRow({ title: 'Jump back in', sub: 'Recent history on the start page', path: 'home.recent', checked: S.home.recent })}
      ${toggleRow({ title: 'Search suggestions', sub: 'History matches while you type', path: 'home.suggestions', checked: S.home.suggestions })}
      ${toggleRow({ title: 'Engine strip', sub: 'A row of real engine icons under the search bar', path: 'home.engines', checked: S.home.engines !== false })}
      ${toggleRow({ title: 'Greeting', sub: 'Time-of-day line above the search bar', path: 'home.greeting', checked: S.home.greeting !== false })}
      ${toggleRow({ title: 'Status card', sub: 'VPN, ad blocking and history state', path: 'home.status', checked: S.home.status !== false })}
      ${toggleRow({ title: 'Animations', sub: 'Sheet, hover and press motion', path: 'theme.animations', checked: S.theme.animations !== false })}
    </div>
    <button class="ghost-btn" data-act="resetLook">Reset look to defaults</button>`
});

/* ---------------- engines ---------------- */
PANELS.engines = () => ({
  title: 'Search engine',
  html: `
    <p class="step-sub">Titanium asks whichever engine you choose. Your pick is never sent anywhere but the engine itself.</p>
    <div class="list">
      ${ENGINES.map((e) => `<button class="list-row" data-act="engine" data-engine="${e.id}">
        <span class="engine-logo" style="background:transparent">${brandMark(e.brand, 22)}</span>
        <span class="lr-body"><b>${e.name}</b><small>${e.note}</small></span>
        ${S.engine === e.id && !S.customEngine.name ? '<span class="perm" style="color:var(--accent)">Active</span>' : '<span class="chev">›</span>'}
      </button>`).join('')}
    </div>
    <div class="section-label">Custom engine ${planLock('ultimate')}</div>
    <div class="list">
      <div class="field"><label>Name</label><input type="text" data-input="customEngine.name" value="${esc(S.customEngine.name)}" placeholder="My search" ${can('ultimate') ? '' : 'disabled'}></div>
      <div class="field"><label>Query URL (use %s)</label><input type="text" data-input="customEngine.url" value="${esc(S.customEngine.url)}" placeholder="https://example.com/search?q=%s" ${can('ultimate') ? '' : 'disabled'}></div>
      <div class="chips"><button class="mini-btn accent" data-act="useCustom" ${can('ultimate') ? '' : 'disabled'}>Use custom engine</button>
      ${S.customEngine.name ? '<button class="mini-btn danger" data-act="clearCustom">Remove</button>' : ''}</div>
    </div>`
});

/* ---------------- privacy ---------------- */
PANELS.privacy = () => ({
  title: 'Privacy',
  html: `
    <div class="section-label">Ad & tracker blocking</div>
    <div class="chips">
      ${[['off', 'Off', 'free'], ['balanced', 'Balanced', 'free'], ['strict', 'Strict', 'premium'], ['aggressive', 'Aggressive', 'ultimate']].map(([id, label, need]) => `
        <button class="chip ${can(need) ? '' : 'lock'}" data-act="adblock" data-level="${id}" aria-pressed="${S.privacy.adblock === id}">${label}</button>`).join('')}
    </div>
    <div class="banner">${ico('shield')}<div><b>${S.privacy.adblock === 'off' ? 'Blocking is off' : 'Blocking is active'}</b><span>${S.privacy.adblock === 'balanced' ? 'Ads, trackers and annoying overlays are hidden on supported pages.' : S.privacy.adblock === 'strict' ? 'Adds fingerprinting scripts and social widgets to the block list.' : S.privacy.adblock === 'aggressive' ? 'Blocks aggressive interstitials, telemetry and known crypto-miners.' : 'Nothing is filtered while blocking is off.'} Frames from other origins are filtered by the browser engine, not by this page.</span></div></div>

    <div class="list">
      ${toggleRow({ title: 'Safe Browsing', sub: 'Warn before dangerous sites and downloads', path: 'privacy.safeBrowsing', checked: S.privacy.safeBrowsing })}
      ${toggleRow({ title: 'Do Not Track', sub: 'Ask sites not to track you across visits', path: 'privacy.dnt', checked: S.privacy.dnt })}
      ${toggleRow({ title: 'HTTPS-only', sub: 'Upgrade typed addresses to https', path: 'privacy.httpsOnly', checked: S.privacy.httpsOnly })}
      ${toggleRow({ title: 'Block third-party cookies', sub: 'Sites can only read their own cookies', path: 'privacy.cookies', checked: S.privacy.cookies })}
    </div>

    <div class="section-label">Custom filters ${planLock('premium')}</div>
    <div class="list">
      <div class="field">
        <label>One rule per line</label>
        <textarea data-input="privacy.filters" ${can('premium') ? '' : 'disabled'} placeholder="||ads.example.com^&#10;example.com##.sponsored">${esc(S.privacy.filters)}</textarea>
        <span class="hint">Cosmetic rules use <code>domain##selector</code>; network rules use <code>||host^</code>.</span>
      </div>
      <div class="chips"><span class="perm">${(S.privacy.filters || '').split('\n').filter(Boolean).length} custom rules</span></div>
    </div>

    <button class="ghost-btn" data-act="clearData">Clear history and cookies</button>`
});
