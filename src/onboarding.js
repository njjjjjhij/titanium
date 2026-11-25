'use strict';
/* ============================================================
   Titanium — onboarding: five questions before you browse
   ============================================================ */

const HEARD_FROM = [
  { id: 'appstore', label: 'App Store or Play Store', glyph: '▣' },
  { id: 'friend', label: 'A friend or family member', glyph: '☺' },
  { id: 'youtube', label: 'YouTube', glyph: '▶' },
  { id: 'social', label: 'TikTok, Instagram or X', glyph: '#' },
  { id: 'search', label: 'A search result', glyph: '⌕' },
  { id: 'github', label: 'GitHub or open source', glyph: '⑂' },
  { id: 'podcast', label: 'A podcast or newsletter', glyph: '◉' },
  { id: 'other', label: 'Somewhere else', glyph: '…' }
];

let obStep = 0;
let obDraft = {
  heardFrom: '',
  device: 'mobile',
  accountMode: 'create',
  name: '',
  email: '',
  historyOn: true,
  incognito: false,
  delegationMode: 'device',
  delegateLabel: '',
  scope: { titles: true, urls: true, downloads: false },
  expiry: 30,
  importCode: ''
};

function startOnboarding() {
  const saved = S.heardFrom;
  if (saved) obDraft.heardFrom = saved;
  obDraft.device = S.device || 'mobile';
  $('#onboard').hidden = false;
  $('#app').hidden = true;
  $('#boot').classList.add('hide');
  setTimeout(() => { $('#boot').hidden = true; }, 380);
  renderOnboard();
}

function renderOnboard() {
  const total = 5;
  $('#progress').innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i <= obStep ? 'on' : ''}"></i>`).join('');
  $('#onboardBody').innerHTML = ONBOARD_STEPS[obStep]();
  $('#onboardBack').hidden = obStep === 0;
  $('#onboardNext').textContent = obStep === total - 1 ? 'Start browsing' : 'Continue';
  $('#onboardBody').scrollTop = 0;
  bindOnboard();
}

function bindOnboard() {
  $$('#onboardBody [data-heard]').forEach((b) => b.addEventListener('click', () => {
    obDraft.heardFrom = b.dataset.heard;
    $$('#onboardBody [data-heard]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $$('#onboardBody [data-dev]').forEach((b) => b.addEventListener('click', () => {
    obDraft.device = b.dataset.dev;
    document.documentElement.dataset.device = obDraft.device;
    $$('#onboardBody [data-dev]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const note = $('#devNote');
    if (note) note.textContent = obDraft.device === 'mobile'
      ? 'Mobile layout: full-bleed cards, bigger targets, search-first start page.'
      : 'Desktop layout: wide canvas, two-column start page, keyboard shortcuts on.';
  }));
  $$('#onboardBody [data-acct]').forEach((b) => b.addEventListener('click', () => {
    obDraft.accountMode = b.dataset.acct;
    $$('#onboardBody [data-acct]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const fields = $('#acctFields');
    if (fields) fields.hidden = obDraft.accountMode !== 'create';
  }));
  const histToggle = $('#obHist');
  if (histToggle) histToggle.addEventListener('click', () => {
    obDraft.historyOn = !obDraft.historyOn;
    histToggle.setAttribute('aria-pressed', String(obDraft.historyOn));
  });
  const incToggle = $('#obIncognito');
  if (incToggle) incToggle.addEventListener('click', () => {
    obDraft.incognito = !obDraft.incognito;
    incToggle.setAttribute('aria-pressed', String(obDraft.incognito));
  });
  $$('#onboardBody [data-deleg]').forEach((b) => b.addEventListener('click', () => {
    obDraft.delegationMode = b.dataset.deleg;
    $$('#onboardBody [data-deleg]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const box = $('#delegBox');
    if (box) box.hidden = obDraft.delegationMode !== 'delegate';
    const imp = $('#importBox');
    if (imp) imp.hidden = obDraft.delegationMode !== 'import';
  }));
  $$('#onboardBody [data-scope]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.scope;
    obDraft.scope[k] = !obDraft.scope[k];
    b.setAttribute('aria-pressed', String(obDraft.scope[k]));
  }));
  $$('#onboardBody [data-expiry]').forEach((b) => b.addEventListener('click', () => {
    obDraft.expiry = Number(b.dataset.expiry);
    $$('#onboardBody [data-expiry]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
}

const ONBOARD_STEPS = [
  () => `
    <div class="step-kicker">Question 1 of 5</div>
    <h1 class="step-title">Where did you hear<br>about Titanium?</h1>
    <p class="step-sub">It helps us know what to build next. Nothing is sent to a server — this stays in your browser profile.</p>
    <div class="opt-grid">
      ${HEARD_FROM.map((h) => `<button class="opt" data-heard="${h.id}" aria-pressed="${obDraft.heardFrom === h.id}">
        <span class="opt-glyph">${h.glyph}</span><span>${h.label}</span>
      </button>`).join('')}
    </div>`,

  () => `
    <div class="step-kicker">Question 2 of 5</div>
    <h1 class="step-title">What are you<br>browsing on?</h1>
    <p class="step-sub">Titanium reshapes itself for the screen you pick. Tap the other one any time in Settings → Appearance.</p>
    <div class="device-pick">
      <button class="device-card" data-dev="mobile" aria-pressed="${obDraft.device === 'mobile'}">
        <span class="device-art"><span class="screen"></span></span>
        Mobile
      </button>
      <button class="device-card" data-dev="pc" aria-pressed="${obDraft.device === 'pc'}">
        <span class="device-art pc"><span class="screen"></span></span>
        PC or laptop
      </button>
    </div>
    <div class="banner">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 8l7-5 7 5v8l-7 5-7-5Z"/></svg>
      <div><b>Mobile first</b><span id="devNote">${obDraft.device === 'mobile' ? 'Mobile layout: full-bleed cards, bigger targets, search-first start page.' : 'Desktop layout: wide canvas, two-column start page, keyboard shortcuts on.'}</span></div>
    </div>`,

  () => `
    <div class="step-kicker">Question 3 of 5</div>
    <h1 class="step-title">Who's doing<br>the browsing?</h1>
    <p class="step-sub">Titanium accounts are local. No password, no server, no email verification — just a profile that keeps your shortcuts, plan and history together on this device.</p>
    <div class="opt-grid">
      <button class="opt" data-acct="create" aria-pressed="${obDraft.accountMode === 'create'}">
        <span class="opt-glyph">＋</span><span>Create a local profile<small>Name, email and an avatar colour</small></span>
      </button>
      <button class="opt" data-acct="guest" aria-pressed="${obDraft.accountMode === 'guest'}">
        <span class="opt-glyph">◐</span><span>Continue as guest<small>Everything works, nothing is labelled</small></span>
      </button>
      <button class="opt" data-acct="later" aria-pressed="${obDraft.accountMode === 'later'}">
        <span class="opt-glyph">→</span><span>Set it up later<small>Add a profile from Settings</small></span>
      </button>
    </div>
    <div class="field" id="acctFields" ${obDraft.accountMode !== 'create' ? 'hidden' : ''}>
      <label>Display name</label>
      <input id="obName" type="text" placeholder="Alex Rivera" maxlength="40" value="${esc(obDraft.name)}">
      <label style="margin-top:8px">Email (stays on this device)</label>
      <input id="obEmail" type="email" placeholder="you@example.com" value="${esc(obDraft.email)}">
      <span class="hint">Used only for your profile card and plan receipts.</span>
    </div>`,

  () => `
    <div class="step-kicker">Question 4 of 5</div>
    <h1 class="step-title">Should Titanium<br>remember where<br>you've been?</h1>
    <p class="step-sub">History powers suggestions, “jump back in” and delegation to another device. You can clear it in one tap — or never keep it at all.</p>
    <div class="list">
      <div class="list-row">
        <span class="lr-icon">◷</span>
        <span class="lr-body"><b>Save browsing history</b><small>${obDraft.historyOn ? 'Titles and addresses, kept locally' : 'History is off — nothing recorded'}</small></span>
        <button class="toggle" id="obHist" aria-pressed="${obDraft.historyOn}" aria-label="Save history"></button>
      </div>
      <div class="list-row">
        <span class="lr-icon">◑</span>
        <span class="lr-body"><b>Start new tabs in private mode</b><small>Private tabs are never saved or delegated</small></span>
        <button class="toggle" id="obIncognito" aria-pressed="${obDraft.incognito}" aria-label="Private by default"></button>
      </div>
    </div>
    <div class="banner">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      <div><b>Retention follows your plan</b><span>Free keeps 7 days, Premium 90 days, Ultimate a full year. You can shorten it at any time.</span></div>
    </div>`,

  () => `
    <div class="step-kicker">Question 5 of 5</div>
    <h1 class="step-title">Who gets to see<br>your history?</h1>
    <p class="step-sub">History delegation lets you hand a scoped, expiring copy of your history to a person or another device — without an account server in the middle.</p>
    <div class="opt-grid">
      <button class="opt" data-deleg="device" aria-pressed="${obDraft.delegationMode === 'device'}">
        <span class="opt-glyph">▢</span><span>Keep it on this device<small>Nothing leaves the browser</small></span>
      </button>
      <button class="opt" data-deleg="delegate" aria-pressed="${obDraft.delegationMode === 'delegate'}">
        <span class="opt-glyph">⇄</span><span>Delegate to a trusted person<small>Premium and Ultimate · scoped and expiring</small></span>
      </button>
      <button class="opt" data-deleg="import" aria-pressed="${obDraft.delegationMode === 'import'}">
        <span class="opt-glyph">⇩</span><span>Import history from another device<small>Paste a delegation code</small></span>
      </button>
    </div>
    <div id="delegBox" ${obDraft.delegationMode !== 'delegate' ? 'hidden' : ''}>
      <div class="field">
        <label>Delegate's name</label>
        <input id="obDelegName" type="text" placeholder="e.g. Sam — family iPad" value="${esc(obDraft.delegateLabel)}">
      </div>
      <div class="list">
        <div class="list-row"><span class="lr-body"><b>What they can see</b><small>Pick the minimum you need</small></span></div>
        <div class="chips">
          <button class="chip" data-scope="titles" aria-pressed="${obDraft.scope.titles}">Titles</button>
          <button class="chip" data-scope="urls" aria-pressed="${obDraft.scope.urls}">Full URLs</button>
          <button class="chip" data-scope="downloads" aria-pressed="${obDraft.scope.downloads}">Downloads</button>
        </div>
        <div class="list-row" style="border-top:1px solid var(--line)"><span class="lr-body"><b>Access expires after</b><small>Then the code stops importing</small></span></div>
        <div class="chips">
          ${[1, 7, 30, 90].map((d) => `<button class="chip" data-expiry="${d}" aria-pressed="${obDraft.expiry === d}">${d} day${d > 1 ? 's' : ''}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="field" id="importBox" ${obDraft.delegationMode !== 'import' ? 'hidden' : ''}>
      <label>Delegation code</label>
      <textarea id="obImport" placeholder="TiD1.…"></textarea>
      <span class="hint">Codes are base64 JSON bundles, not encrypted. Share them the way you'd share a file.</span>
    </div>`
];

function obNext() {
  if (obStep === 2) {
    const name = $('#obName')?.value.trim();
    const email = $('#obEmail')?.value.trim();
    if (obDraft.accountMode === 'create') {
      if (!name) { toast('Add a display name first'); return; }
      obDraft.name = name;
      obDraft.email = email || '';
    }
  }
  if (obStep === 4) {
    if (obDraft.delegationMode === 'delegate') {
      obDraft.delegateLabel = $('#obDelegName')?.value.trim() || 'Trusted device';
    }
    if (obDraft.delegationMode === 'import') {
      obDraft.importCode = $('#obImport')?.value.trim() || '';
    }
  }
  if (obStep < ONBOARD_STEPS.length - 1) {
    obStep += 1;
    renderOnboard();
  } else {
    finishOnboarding();
  }
}

function obBack() {
  if (obStep > 0) {
    obStep -= 1;
    renderOnboard();
  }
}

function finishOnboarding() {
  S.heardFrom = obDraft.heardFrom || 'not specified';
  S.device = obDraft.device;
  S.history.on = obDraft.historyOn;
  S.history.incognito = obDraft.incognito;

  if (obDraft.accountMode === 'create') {
    S.account = {
      name: obDraft.name || 'Titanium user',
      email: obDraft.email || '',
      guest: false,
      createdAt: Date.now()
    };
  } else if (obDraft.accountMode === 'guest') {
    S.account = { name: 'Guest', email: '', guest: true, createdAt: Date.now() };
  }

  if (obDraft.delegationMode === 'delegate') {
    S.delegation.active = {
      label: obDraft.delegateLabel || 'Trusted device',
      scope: { ...obDraft.scope },
      expiresAt: Date.now() + obDraft.expiry * 86400000,
      createdAt: Date.now(),
      code: null
    };
    S.delegation.log.unshift({ ts: Date.now(), text: `Delegation granted to ${S.delegation.active.label}` });
  }
  if (obDraft.delegationMode === 'import' && obDraft.importCode) {
    const result = importDelegation(obDraft.importCode);
    if (!result.ok) toast(result.error);
  }

  S.onboarded = true;
  save();
  $('#onboard').hidden = true;
  startApp();
  toast(`Welcome${S.account && !S.account.guest ? ', ' + S.account.name.split(' ')[0] : ''} — you're on ${PLANS[S.plan].name}`);
}
