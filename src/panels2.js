'use strict';
/* ============================================================
   Titanium — panels part 2: VPN, history, delegation, account,
   plans, extensions, about, shortcuts
   ============================================================ */

/* ---------------- VPN ---------------- */
PANELS.vpn = () => {
  const visible = SERVERS.filter((s) => can(s.need) || s.id === 'auto');
  return {
    title: 'VPN',
    html: `
      <div class="plan ${S.vpn.on ? 'current' : ''}">
        <div class="plan-top">
          <div>
            <h3>${S.vpn.on ? 'Connected' : 'Not connected'}</h3>
            <small style="color:var(--muted)">${S.vpn.on ? serverName(S.vpn.server) + ' · ' + S.vpn.protocol : 'Your IP is exposed to every site you open'}</small>
          </div>
          <span class="dot ${S.vpn.on ? 'on' : ''}" style="width:12px;height:12px"></span>
        </div>
        <button class="accent-btn" style="align-self:stretch" data-act="vpnToggle">${S.vpn.on ? 'Disconnect' : 'Connect VPN'}</button>
      </div>

      <div class="banner">${ico('info')}<div><b>Simulated in this build</b><span>This single-file demo shows the full VPN surface — locations, protocols, kill switch — but it cannot create a real encrypted tunnel. A shipping Titanium would route through a WireGuard endpoint; see the README.</span></div></div>

      <div class="section-label">Location · ${SERVERS.filter((s) => can(s.need)).length} available</div>
      <div class="list">
        ${SERVERS.map((s) => {
          const locked = !can(s.need);
          return `<button class="list-row" data-act="${locked ? 'paywall' : 'server'}" data-server="${s.id}" data-need="${locked ? s.need : ''}">
            <span class="lr-icon" style="font-size:17px">${s.flag}</span>
            <span class="lr-body"><b>${s.name}</b><small>${locked ? 'Locked on ' + PLANS[S.plan].name : s.id === 'auto' ? 'Picks the closest healthy node' : 'WireGuard · 1 Gbps'}</small></span>
            ${locked ? '<span class="perm">' + (s.need === 'premium' ? 'Premium' : 'Ultimate') + '</span>' : S.vpn.server === s.id ? '<span class="perm" style="color:var(--accent)">Selected</span>' : '<span class="chev">›</span>'}
          </button>`;
        }).join('')}
      </div>

      <div class="section-label">Tunnel</div>
      <div class="list">
        <div class="field"><label>Protocol</label>
          <select data-input="vpn.protocol">
            <option value="wireguard" ${S.vpn.protocol === 'wireguard' ? 'selected' : ''}>WireGuard (fastest)</option>
            <option value="openvpn" ${S.vpn.protocol === 'openvpn' ? 'selected' : ''}>OpenVPN (most compatible)</option>
            <option value="ikev2" ${S.vpn.protocol === 'ikev2' ? 'selected' : ''}>IKEv2 (mobile)</option>
          </select>
        </div>
        ${toggleRow({ title: 'Kill switch', sub: 'Drop traffic if the tunnel falls over', path: 'vpn.killSwitch', checked: S.vpn.killSwitch, need: 'premium' })}
        ${toggleRow({ title: 'Split tunneling', sub: 'Choose which apps skip the VPN', path: 'vpn.split', checked: S.vpn.split, need: 'ultimate' })}
      </div>`
  };
};

/* ---------------- history ---------------- */
PANELS.history = () => {
  const items = S.history.items;
  return {
    title: 'History',
    html: `
      <div class="list">
        ${toggleRow({ title: 'Save history', sub: 'Needed for suggestions and delegation', path: 'history.on', checked: S.history.on })}
        ${toggleRow({ title: 'Private by default', sub: 'New tabs never record or delegate', path: 'history.incognito', checked: S.history.incognito })}
      </div>

      <div class="section-label">Keep history for</div>
      <div class="chips">
        ${[7, 90, 365].map((d) => {
          const need = d > 90 ? 'ultimate' : d > 7 ? 'premium' : 'free';
          return `<button class="chip ${can(need) ? '' : 'lock'}" data-act="retention" data-days="${d}" data-need="${need}" aria-pressed="${S.history.retention === d}">${d === 365 ? '1 year' : d + ' days'}</button>`;
        }).join('')}
      </div>

      <div class="section-label">Entries · ${items.length}</div>
      <div class="field" style="padding:0">
        <input id="histSearch" type="text" placeholder="Filter history" autocomplete="off">
      </div>
      <div class="list" id="histList">
        ${items.length ? items.slice(0, 200).map((h) => `<div class="list-row" data-hist-row data-text="${esc((h.title + ' ' + h.url).toLowerCase())}">
          <span class="lr-icon" style="background:transparent">${brandMarkForUrl(h.url, 22, h.title)}</span>
          <span class="lr-body"><b>${esc(h.title)}</b><small>${esc(h.url)} · ${timeAgo(h.ts)}</small></span>
          <button class="mini-btn" data-act="openHist" data-url="${esc(h.url)}">Open</button>
          <button class="mini-btn danger" data-act="deleteHist" data-id="${h.id}" aria-label="Delete">✕</button>
        </div>`).join('') : `<div class="empty"><b>No history yet</b>Pages you visit will show up here.</div>`}
      </div>

      <div class="plan-actions">
        <button class="mini-btn" data-act="clearHistory">Clear history</button>
        <button class="mini-btn" data-act="sheet" data-panel="delegation">Delegate history</button>
      </div>`,
    bind: (root) => {
      const search = $('#histSearch', root);
      if (!search) return;
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        $$('[data-hist-row]', root).forEach((row) => {
          row.hidden = q.length > 0 && !row.dataset.text.includes(q);
        });
      });
    }
  };
};

/* ---------------- delegation ---------------- */
function b64uEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function buildDelegationCode() {
  const d = S.delegation.active;
  if (!d) return '';
  const items = S.history.items.slice(0, 200).map((h) => ({
    title: h.title,
    url: d.scope.urls ? h.url : '',
    ts: h.ts
  }));
  const payload = {
    v: 1,
    app: 'titanium',
    from: S.account?.name || 'Titanium',
    created: d.createdAt,
    expires: d.expiresAt,
    scope: d.scope,
    items
  };
  return 'TiD1.' + b64uEncode(JSON.stringify(payload));
}

function importDelegation(code) {
  try {
    const clean = String(code || '').trim();
    if (!clean.startsWith('TiD1.')) return { ok: false, error: 'That is not a Titanium delegation code' };
    const payload = JSON.parse(b64uDecode(clean.slice(5)));
    if (payload.v !== 1 || payload.app !== 'titanium') return { ok: false, error: 'Unsupported delegation code version' };
    if (payload.expires && payload.expires < Date.now()) return { ok: false, error: 'This delegation code has expired' };
    const incoming = (payload.items || []).map((h) => ({
      id: uid(),
      url: h.url || 'delegated://' + encodeURIComponent(h.title || 'entry'),
      title: h.title || 'Delegated entry',
      ts: Number(h.ts) || Date.now(),
      delegated: payload.from || true
    }));
    const known = new Set(S.history.items.map((h) => h.url + h.ts));
    const fresh = incoming.filter((h) => !known.has(h.url + h.ts));
    S.history.items = [...fresh, ...S.history.items].sort((a, b) => b.ts - a.ts).slice(0, 600);
    S.delegation.log.unshift({ ts: Date.now(), text: `Imported ${fresh.length} entries from ${payload.from || 'a delegate'}` });
    pruneHistory();
    save();
    renderHome();
    return { ok: true, count: fresh.length };
  } catch {
    return { ok: false, error: 'Could not read that code — it may be truncated' };
  }
}

PANELS.delegation = () => {
  const d = S.delegation.active;
  const expired = d && d.expiresAt < Date.now();
  const code = d ? ($('#delegCode')?.textContent || d.code || '') : '';
  return {
    title: 'History delegation',
    html: `
      <p class="step-sub">Hand a scoped, expiring copy of your history to a person or another device. Codes are generated locally — no Titanium server ever sees them.</p>

      ${d ? `
        <div class="plan ${expired ? '' : 'current'}">
          <div class="plan-top"><h3>${esc(d.label)}</h3><span class="price">${expired ? 'Expired' : 'Active'}</span></div>
          <ul>
            <li class="${d.scope.titles ? '' : 'off'}">Page titles</li>
            <li class="${d.scope.urls ? '' : 'off'}">Full URLs</li>
            <li class="${d.scope.downloads ? '' : 'off'}">Download list</li>
            <li>Expires ${new Date(d.expiresAt).toLocaleDateString()} · ${Math.max(0, Math.ceil((d.expiresAt - Date.now()) / 86400000))} days left</li>
          </ul>
          <div class="plan-actions">
            <button class="mini-btn accent" data-act="delegateGenerate">${code ? 'Regenerate code' : 'Generate code'}</button>
            <button class="mini-btn" data-act="copy" data-target="delegCode">Copy</button>
            <button class="mini-btn danger" data-act="delegateRevoke">Revoke</button>
          </div>
        </div>
        <div id="delegCode" class="code-box">${code ? esc(code) : 'No code generated yet — tap Generate code to bundle ' + S.history.items.length + ' entries.'}</div>
      ` : `
        <div class="list">
          <div class="field"><label>Delegate name</label><input id="delegName" type="text" placeholder="Sam — family iPad" value="${esc(S.delegation.pending.label)}"></div>
          <div class="list-row"><span class="lr-body"><b>Scope</b><small>Grant the minimum you need</small></span></div>
          <div class="chips">
            ${['titles', 'urls', 'downloads'].map((k) => `<button class="chip" data-act="delegScope" data-scope="${k}" aria-pressed="${S.delegation.pending.scope[k]}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}
          </div>
        </div>
        <div class="banner">${ico('lock')}<div><b>Delegation needs Premium</b><span>Free profiles can export a history file; Premium and Ultimate can issue expiring codes and delegate to other devices.</span></div></div>
        <button class="accent-btn" data-act="delegateCreate">Create delegation</button>
      `}

      <div class="section-label">Import from another device</div>
      <div class="field">
        <textarea id="importCode" placeholder="TiD1.…"></textarea>
        <span class="hint">Paste a code you were given. Expired codes are rejected.</span>
      </div>
      <button class="mini-btn accent" data-act="delegateImport">Import code</button>

      <div class="section-label">Access log</div>
      <div class="list">
        ${S.delegation.log.length ? S.delegation.log.slice(0, 8).map((l) => `<div class="list-row"><span class="lr-body"><b style="font-weight:500;font-size:13px">${esc(l.text)}</b><small>${new Date(l.ts).toLocaleString()}</small></span></div>`).join('') : '<div class="empty">No delegation activity yet.</div>'}
      </div>`
  };
};

/* ---------------- account ---------------- */
PANELS.account = () => {
  const a = S.account;
  return {
    title: 'Account',
    html: a ? `
      <div class="list-row" style="border:1px solid var(--line);border-radius:14px;padding:16px">
        <span class="lr-icon" style="width:48px;height:48px;border-radius:14px;background:hsl(${hueFor(a.name)} 45% 40%);color:#fff;font-weight:800;font-size:18px">${esc(a.name[0].toUpperCase())}</span>
        <span class="lr-body"><b>${esc(a.name)}${a.guest ? ' · guest' : ''}</b><small>${esc(a.email || 'No email set')} · member since ${new Date(a.createdAt).toLocaleDateString()}</small></span>
        <span class="perm">${PLANS[S.plan].name}</span>
      </div>
      <div class="list">
        <div class="field"><label>Display name</label><input id="acctName" type="text" value="${esc(a.name)}" maxlength="40"></div>
        <div class="field"><label>Email</label><input id="acctEmail" type="email" value="${esc(a.email)}" placeholder="you@example.com"></div>
        <div class="chips"><button class="mini-btn accent" data-act="accountSave">Save profile</button><button class="mini-btn" data-act="sheet" data-panel="plans">Manage plan</button></div>
      </div>
      <div class="section-label">This device</div>
      <div class="list">
        <div class="list-row"><span class="lr-icon">${ico(S.device === 'mobile' ? 'mobile' : 'monitor')}</span><span class="lr-body"><b>${deviceName()} · this browser</b><small>Last active now · local session</small></span><span class="dot on"></span></div>
        <div class="list-row"><span class="lr-icon">${ico('download')}</span><span class="lr-body"><b>Export my data</b><small>Settings, history and shortcuts as JSON</small></span><button class="mini-btn" data-act="exportData">Export</button></div>
      </div>
      <div class="list">
        <button class="list-row" data-act="signout"><span class="lr-icon">${ico('power')}</span><span class="lr-body"><b>Sign out of this profile</b><small>Keeps history and settings on the device</small></span></button>
        <button class="list-row" data-act="reset"><span class="lr-icon" style="color:var(--danger)">${ico('trash')}</span><span class="lr-body"><b>Delete local profile</b><small>Removes everything Titanium stored</small></span></button>
      </div>
    ` : `
      <p class="step-sub">Titanium profiles are local. Nothing is uploaded and there is no password to forget.</p>
      <div class="list">
        <div class="field"><label>Display name</label><input id="newName" type="text" placeholder="Alex Rivera" maxlength="40"></div>
        <div class="field"><label>Email (optional)</label><input id="newEmail" type="email" placeholder="you@example.com"></div>
        <div class="chips"><button class="mini-btn accent" data-act="accountCreate">Create profile</button></div>
      </div>`
  };
};

/* ---------------- plans ---------------- */
const PLAN_FEATURES = {
  free: {
    yes: ['All 15 search engines with real icons', 'Every theme, accent and layout control', 'Balanced ad & tracker blocking', 'Safe Browsing', '3 VPN locations', '2 Chrome extensions', '7-day history', '4 shortcuts', 'Mobile + desktop layouts'],
    no: ['Strict blocking & custom filters', 'Delegation codes', 'Kill switch', 'Split tunneling']
  },
  premium: {
    yes: ['Everything in Free', 'Strict blocking + custom filter rules', '12 VPN locations + kill switch', '10 Chrome extensions', '90-day history', 'History delegation (1 delegate)', '12 shortcuts', '20 tabs'],
    no: ['Aggressive blocking', 'Split tunneling', 'Custom search engine']
  },
  ultimate: {
    yes: ['Everything in Premium', 'Aggressive blocking + miner protection', 'All 16 VPN locations + split tunneling', 'Unlimited extensions', '1-year history', 'Up to 5 delegates', 'Custom search engine', 'Unlimited tabs', 'Priority support'],
    no: []
  }
};

PANELS.plans = () => ({
  title: 'Plans',
  html: `
    <p class="step-sub">Start free forever. Upgrade when the limits start to pinch — downgrade any time, and your local data always comes with you.</p>
    ${['free', 'premium', 'ultimate'].map((id) => {
      const p = PLANS[id];
      const f = PLAN_FEATURES[id];
      const current = S.plan === id;
      return `<div class="plan ${current ? 'current' : ''}">
        <div class="plan-top">
          <div><h3>${p.name}</h3><small style="color:var(--muted)">${p.blurb}</small></div>
          <span class="price">${p.price}<span style="color:var(--muted);font-weight:500"> /${p.per}</span></span>
        </div>
        <ul>${f.yes.map((x) => `<li>${esc(x)}</li>`).join('')}${f.no.map((x) => `<li class="off">${esc(x)}</li>`).join('')}</ul>
        <div class="plan-actions">
          ${current ? '<button class="mini-btn" disabled>Current plan</button>' : `<button class="mini-btn accent" data-act="upgrade" data-plan="${id}">${RANK[id] > RANK[S.plan] ? 'Upgrade to ' + p.name : 'Switch to ' + p.name}</button>`}
          ${id !== 'free' && !current ? '<button class="mini-btn" data-act="sheet" data-panel="about">What is included?</button>' : ''}
        </div>
      </div>`;
    }).join('')}
    <div class="banner">${ico('info')}<div><b>Demo checkout</b><span>No card, no charge. Picking a plan flips the local entitlement flag so you can try every gated feature; a real build would verify a receipt from the store.</span></div></div>`
});

/* ---------------- extensions ---------------- */
PANELS.extensions = () => ({
  title: 'Extensions',
  html: window.Ext ? Ext.panelHTML() : '<div class="empty"><b>Extension host loading…</b></div>',
  bind: (root) => { if (window.Ext) Ext.bind(root); }
});

/* ---------------- about ---------------- */
PANELS.about = () => ({
  title: 'About',
  html: `
    <div class="list-row" style="border:1px solid var(--line);border-radius:14px;padding:16px">
      <span class="lr-icon" style="width:46px;height:46px;border-radius:14px;font-weight:800;font-size:15px;color:var(--accent)">Ti</span>
      <span class="lr-body"><b>Titanium ${VERSION}</b><small>Single-file browser · MIT licence · open source</small></span>
    </div>
    <p class="step-sub">Titanium is a browsing surface that fits in one HTML file: a start page, tabbed navigation, 15 search engines, ad blocking controls, a VPN surface, extension loading, history with delegation, and three plans. Every byte of state lives in your browser's localStorage.</p>
    <div class="section-label">What's inside</div>
    <ul style="margin:0;padding-left:18px;color:var(--muted);font-size:13px;line-height:1.9">
      <li>Five-question onboarding, device-adaptive layout</li>
      <li>Tabs with back stack, voice search, shortcuts</li>
      <li>15 engines + custom engine (Ultimate)</li>
      <li>Ad blocking levels, custom filters, Safe Browsing</li>
      <li>VPN location picker, protocol, kill switch</li>
      <li>History retention, private-by-default, delegation codes</li>
      <li>Chrome extension loader (.zip, .crx, unpacked folder)</li>
      <li>Free / Premium / Ultimate entitlements</li>
    </ul>
    <div class="section-label">Honest limits</div>
    <div class="banner">${ico('info')}<div><b>What one HTML file can't do</b><span>It can't create a real encrypted VPN tunnel, strip a site's anti-embedding headers, or run Chrome's background service workers. Those need a native shell or a browser extension build — the README explains the path for each.</span></div></div>
    <div class="section-label">Credits</div>
    <div class="list">
      <a class="list-row" href="source.html" target="_blank" rel="noopener"><span class="lr-icon">${ico('code')}</span><span class="lr-body"><b>Source code</b><small>Every file, editable and downloadable</small></span><span class="chev">›</span></a>
      <a class="list-row" href="https://github.com/your-username/titanium" target="_blank" rel="noopener"><span class="lr-icon">${ico('download')}</span><span class="lr-body"><b>Project on GitHub</b><small>Issues, roadmap and contributing</small></span><span class="chev">›</span></a>
      <div class="list-row"><span class="lr-icon">${ico('shield')}</span><span class="lr-body"><b>Privacy</b><small>No analytics, no accounts server, no telemetry</small></span></div>
      <div class="list-row"><span class="lr-icon">${ico('star')}</span><span class="lr-body"><b>MIT licence</b><small>Fork it, ship it, rename it</small></span></div>
    </div>`
});

/* ---------------- shortcuts ---------------- */
PANELS.shortcuts = () => ({
  title: 'Start page shortcuts',
  html: `
    <p class="step-sub">Shortcuts appear under the search bar. Free keeps ${LIMITS ? '4' : '4'}, Premium 12, Ultimate 12.</p>
    <div class="list">
      ${S.shortcuts.length ? S.shortcuts.map((s, i) => `<div class="list-row">
        <span class="lr-icon" style="background:transparent">${brandMarkForUrl(s.url, 22, s.name)}</span>
        <span class="lr-body"><b>${esc(s.name)}</b><small>${esc(s.url)}</small></span>
        <button class="mini-btn danger" data-act="shortcutDel" data-index="${i}">Remove</button>
      </div>`).join('') : '<div class="empty">No shortcuts yet.</div>'}
    </div>
    <button class="accent-btn" data-act="shortcutAdd">Add shortcut</button>`
});
