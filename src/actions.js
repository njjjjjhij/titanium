'use strict';
/* ============================================================
   Titanium — action dispatcher
   ============================================================ */

function paywall(need) {
  const target = need || 'premium';
  openModal(`<h3>${target === 'ultimate' ? 'Ultimate' : 'Premium'} feature</h3>
    <p>This one is part of ${PLANS[target].name}. You're on ${PLANS[S.plan].name}. Switch plans instantly in this demo — no card, no charge.</p>
    <div class="modal-actions">
      <button class="ghost-btn" data-act="modalClose">Not now</button>
      <button class="primary-btn" data-act="upgrade" data-plan="${target}">Try ${PLANS[target].name}</button>
    </div>`);
}

const ACTIONS = {
  sheet: (el) => openSheet(el.dataset.panel),
  modalClose: () => closeModal(),
  paywall: (el) => paywall(el.dataset.need),

  toggle: (el) => {
    const path = el.dataset.path;
    if (el.dataset.need && !can(el.dataset.need)) { paywall(el.dataset.need); return; }
    const next = !getPath(path);
    setPath(path, next);
    if (path === 'home.shortcuts') S.home.shortcuts = next;
    save();
    applySettings();
    renderHome();
    renderSheet(true);
    if (path === 'pageDesktop') {
      applyPageMode();
      if (activeTab().url) loadFrame(activeTab().url);
    }
    toast(`${next ? 'On' : 'Off'} · ${path.split('.').pop()}`);
  },

  pageMode: () => {
    S.pageDesktop = !S.pageDesktop;
    save();
    applyPageMode();
    if (activeTab().url) loadFrame(activeTab().url);
    renderSheet(true);
    toast(S.pageDesktop ? 'PC mode — desktop site' : 'Mobile site');
  },

  input: (el) => {
    const path = el.dataset.input;
    let value = el.type === 'range' ? Number(el.value) : el.value;

    if (path === 'theme.accent') {
      S.theme.accent = value;
      S.theme.accentId = 'custom';
      S.theme.preset = 'custom';
      save(); applySettings(); renderSheet(true);
      return;
    }
    if (path.startsWith('customEngine.')) {
      if (!can('ultimate')) { paywall('ultimate'); return; }
    }
    if (path === 'theme.radius' || path === 'theme.font') {
      setPath(path, value);
      const out = el.parentElement.querySelector('output');
      if (out) out.textContent = path === 'theme.radius' ? value + 'px' : value + 'px';
      save(); applySettings();
      return;
    }
    setPath(path, value);
    save();
    applySettings();
    renderHome();
    if (path === 'vpn.protocol') { toast('Protocol set to ' + value); renderSheet(true); }
  },

  theme: (el) => {
    S.theme.mode = el.dataset.theme;
    S.theme.preset = 'custom';
    save(); applySettings(); renderSheet(true);
  },

  accent: (el) => {
    const a = ACCENTS.find((x) => x.id === el.dataset.accent);
    if (!a) return;
    S.theme.accentId = a.id;
    S.theme.accent = a.color;
    S.theme.preset = 'custom';
    save(); applySettings(); renderSheet(true);
  },

  preset: (el) => {
    const preset = LOOK_PRESETS[el.dataset.preset];
    if (!preset) return;
    S.theme = { ...S.theme, ...preset, preset: el.dataset.preset };
    save(); applySettings(); renderHome(); renderSheet(true);
    toast(`${el.textContent} look applied`);
  },

  shape: (el) => {
    S.theme.searchShape = el.dataset.shape;
    save(); applySettings(); renderSheet(true);
  },

  iconStyle: (el) => {
    S.theme.iconStyle = el.dataset.icons;
    save(); applySettings(); renderSheet(true);
  },

  openSource: () => {
    window.open('source.html', '_blank', 'noopener');
  },

  density: (el) => {
    S.theme.density = el.dataset.density;
    document.documentElement.dataset.density = S.theme.density;
    save(); renderSheet(true);
  },

  device: (el) => {
    S.device = el.dataset.device;
    save(); applySettings(); renderSheet(true); renderHome();
    toast(S.device === 'mobile' ? 'Mobile layout' : 'Desktop layout');
  },

  engine: (el) => {
    S.engine = el.dataset.engine;
    S.customEngine = { name: '', url: '' };
    save(); renderHome(); renderSheet(true);
    toast(`Searching with ${engine().name}`);
  },

  useCustom: () => {
    if (!can('ultimate')) { paywall('ultimate'); return; }
    if (!S.customEngine.name || !S.customEngine.url.includes('%s')) { toast('Add a name and a URL containing %s'); return; }
    save(); renderHome(); renderSheet(true); toast(`Searching with ${S.customEngine.name}`);
  },

  clearCustom: () => {
    S.customEngine = { name: '', url: '' };
    save(); renderHome(); renderSheet(true);
  },

  adblock: (el) => {
    const level = el.dataset.level;
    const need = level === 'aggressive' ? 'ultimate' : level === 'strict' ? 'premium' : 'free';
    if (!can(need)) { paywall(need); return; }
    S.privacy.adblock = level;
    save(); renderHome(); renderSheet(true);
    toast(level === 'off' ? 'Ad blocking off' : `${level} blocking on`);
  },

  retention: (el) => {
    if (el.dataset.need && !can(el.dataset.need)) { paywall(el.dataset.need); return; }
    S.history.retention = Number(el.dataset.days);
    pruneHistory(); save(); renderHome(); renderSheet(true);
  },

  server: (el) => {
    S.vpn.server = el.dataset.server;
    save(); renderHome(); renderSheet(true);
    if (S.vpn.on) toast(`Reconnected to ${serverName(S.vpn.server)}`);
  },

  vpnToggle: () => {
    if (!S.vpn.on) {
      toast('Connecting…');
      setTimeout(() => {
        S.vpn.on = true; save(); renderHome();
        if (sheetStack[sheetStack.length - 1] === 'vpn') renderSheet(true);
        toast(`Tunnel up · ${serverName(S.vpn.server)} (simulated)`);
      }, 700);
      return;
    }
    S.vpn.on = false;
    save(); renderHome();
    if (sheetStack[sheetStack.length - 1] === 'vpn') renderSheet(true);
    toast('VPN disconnected');
  },

  upgrade: (el) => {
    const id = el.dataset.plan;
    if (id === S.plan) { closeModal(); return; }
    openModal(`<h3>Switch to ${PLANS[id].name}?</h3>
      <p>${PLANS[id].price}/${PLANS[id].per} in a real build. In this demo the plan flips instantly and every gated feature unlocks — nothing is charged and no card is collected.</p>
      <div class="modal-actions"><button class="ghost-btn" data-act="modalClose">Cancel</button><button class="primary-btn" data-act="confirmPlan" data-plan="${id}">Use ${PLANS[id].name}</button></div>`);
  },

  confirmPlan: (el) => {
    const id = el.dataset.plan;
    S.plan = id;
    S.history.retention = Math.min(S.history.retention, LIMITS.retention[id]);
    if (!can('premium')) S.history.retention = Math.min(S.history.retention, LIMITS.retention.free);
    pruneHistory();
    save(); closeModal(); applySettings(); renderHome(); renderSheet(true);
    toast(`${PLANS[id].name} active — everything unlocked`);
  },

  accountCreate: () => {
    const name = $('#newName')?.value.trim();
    const email = $('#newEmail')?.value.trim() || '';
    if (!name) { toast('Add a display name'); return; }
    S.account = { name, email, guest: false, createdAt: Date.now() };
    save(); renderHome(); renderSheet(true); toast('Profile created');
  },

  accountSave: () => {
    const name = $('#acctName')?.value.trim();
    const email = $('#acctEmail')?.value.trim() || '';
    if (!name) { toast('Add a display name'); return; }
    S.account = { ...(S.account || { createdAt: Date.now() }), name, email };
    save(); renderHome(); renderSheet(true); toast('Profile saved');
  },

  signout: () => {
    S.account = null;
    save(); renderHome(); renderSheet(true); toast('Signed out — history kept on device');
  },

  exportData: () => {
    const blob = new Blob([JSON.stringify({ app: 'titanium', version: VERSION, exported: new Date().toISOString(), state: S }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'titanium-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Export downloaded');
  },

  openHist: (el) => { navigate(el.dataset.url); closeSheet(); },
  deleteHist: (el) => {
    S.history.items = S.history.items.filter((h) => h.id !== el.dataset.id);
    save(); renderHome(); renderSheet(true);
  },
  clearHistory: () => {
    openModal(`<h3>Clear history?</h3><p>Removes all ${S.history.items.length} entries from this device. Settings and shortcuts stay.</p>
      <div class="modal-actions"><button class="ghost-btn" data-act="modalClose">Cancel</button><button class="primary-btn" data-act="confirmClearHistory">Clear</button></div>`);
  },
  confirmClearHistory: () => {
    S.history.items = [];
    S.delegation.log.unshift({ ts: Date.now(), text: 'History cleared by you' });
    save(); closeModal(); renderHome(); renderSheet(true); toast('History cleared');
  },

  clearData: () => {
    S.history.items = [];
    S.delegation.log.unshift({ ts: Date.now(), text: 'Cookies and history cleared' });
    save(); renderHome(); renderSheet(true); toast('History and cookie state cleared');
  },

  delegScope: (el) => {
    const k = el.dataset.scope;
    S.delegation.pending.scope[k] = !S.delegation.pending.scope[k];
    save(); renderSheet(true);
  },
  delegateCreate: () => {
    if (!can('premium')) { paywall('premium'); return; }
    const label = $('#delegName')?.value.trim() || 'Trusted device';
    S.delegation.pending.label = label;
    S.delegation.active = {
      label,
      scope: { ...S.delegation.pending.scope },
      createdAt: Date.now(),
      expiresAt: Date.now() + S.delegation.pending.days * 86400000,
      code: null
    };
    S.delegation.log.unshift({ ts: Date.now(), text: `Delegation granted to ${label}` });
    save(); renderSheet(true);
    toast('Delegation created');
  },
  delegateGenerate: () => {
    if (!S.delegation.active) return;
    const code = buildDelegationCode();
    S.delegation.active.code = code;
    S.delegation.log.unshift({ ts: Date.now(), text: `Code generated for ${S.delegation.active.label}` });
    save(); renderSheet(true);
    toast(`Code ready · ${S.history.items.length} entries`);
  },
  delegateRevoke: () => {
    if (!S.delegation.active) return;
    S.delegation.log.unshift({ ts: Date.now(), text: `Delegation revoked for ${S.delegation.active.label}` });
    S.delegation.active = null;
    save(); renderSheet(true); toast('Delegation revoked');
  },
  delegateImport: () => {
    const code = $('#importCode')?.value || '';
    const res = importDelegation(code);
    if (!res.ok) { toast(res.error); return; }
    renderSheet(true); toast(`Imported ${res.count} entries`);
  },

  copy: async (el) => {
    const node = document.getElementById(el.dataset.target);
    if (!node) return;
    try { await navigator.clipboard.writeText(node.textContent.trim()); toast('Copied'); }
    catch { toast('Copy failed — select the code and copy manually'); }
  },

  switchTab: (el) => { switchTab(el.dataset.id); closeSheet(); },
  closeTab: (el) => {
    closeTab(el.dataset.id);
    if (!tabs.length) return;
    renderSheet(true);
  },
  newtab: () => { newTab(); closeSheet(); },
  closeOthers: () => {
    tabs = tabs.filter((t) => t.id === activeId);
    renderTopbar(); renderSheet(true); toast('Other tabs closed');
  },

  shortcutAdd: () => addShortcutDialog(),
  shortcutDel: (el) => {
    S.shortcuts.splice(Number(el.dataset.index), 1);
    save(); renderHome(); renderSheet(true);
  },

  resetLook: () => {
    S.theme = structuredClone(DEFAULT_STATE.theme);
    save(); applySettings(); renderSheet(true); toast('Look reset');
  },

  reset: () => {
    openModal(`<h3>Reset Titanium?</h3><p>This wipes the local profile, history, shortcuts, extensions and settings. The page reloads into onboarding.</p>
      <div class="modal-actions"><button class="ghost-btn" data-act="modalClose">Cancel</button><button class="primary-btn" data-act="confirmReset">Reset everything</button></div>`);
  },
  confirmReset: async () => {
    localStorage.removeItem(LS_KEY);
    try {
      const dbs = await indexedDB.databases?.();
      (dbs || []).forEach((d) => d.name && indexedDB.deleteDatabase(d.name));
    } catch { /* ignore */ }
    location.reload();
  }
};

window.ACTIONS = ACTIONS;
