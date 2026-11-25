'use strict';
/* ============================================================
   Titanium — Chrome extension host
   Loads .zip / .crx / unpacked folders, reads manifest.json,
   renders the extension popup in a sandboxed frame and answers
   a chrome.* compatibility shim over postMessage.
   ============================================================ */

const Ext = {
  items: [],
  ready: false,
  DB: 'titanium-ext',
  STORE: 'ext',
  MAX_BYTES: 3 * 1024 * 1024
};

/* ---------- base64 <-> bytes ---------- */
function bytesToB64(u8) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
const decodeText = (u8) => new TextDecoder().decode(u8);

/* ---------- zip reader (stored + deflate) ---------- */
async function unzip(buffer) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  if (u8.length < 22) throw new Error('File is too small to be an archive');
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid ZIP or CRX file');
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const files = {};
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const compSize = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const localOff = dv.getUint32(off + 42, true);
    const name = decodeText(u8.subarray(off + 46, off + 46 + nameLen));
    off += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const lnameLen = dv.getUint16(localOff + 26, true);
    const lextraLen = dv.getUint16(localOff + 28, true);
    const start = localOff + 30 + lnameLen + lextraLen;
    const comp = u8.subarray(start, start + compSize);
    total += compSize;
    if (total > Ext.MAX_BYTES) throw new Error('Extension is larger than 3 MB');
    let content;
    if (method === 0) content = comp;
    else if (method === 8) {
      const stream = new Blob([comp]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      content = new Uint8Array(await new Response(stream).arrayBuffer());
    } else continue;
    files[name] = content;
  }
  return files;
}

function stripCrx(buffer) {
  const u8 = new Uint8Array(buffer);
  if (u8[0] === 0x43 && u8[1] === 0x72 && u8[2] === 0x32 && u8[3] === 0x34) {
    const dv = new DataView(buffer);
    const version = dv.getUint32(4, true);
    if (version === 3) return buffer.slice(12 + dv.getUint32(8, true));
    return buffer.slice(16 + dv.getUint32(8, true) + dv.getUint32(12, true));
  }
  return buffer;
}

/* ---------- IndexedDB ---------- */
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(Ext.DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(Ext.STORE)) req.result.createObjectStore(Ext.STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbAll() {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(Ext.STORE, 'readonly').objectStore(Ext.STORE).getAll();
    tx.onsuccess = () => resolve(tx.result || []);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbPut(record) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(Ext.STORE, 'readwrite').objectStore(Ext.STORE).put(record);
    tx.onsuccess = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(id) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(Ext.STORE, 'readwrite').objectStore(Ext.STORE).delete(id);
    tx.onsuccess = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- manifest helpers ---------- */
function i18nName(manifest, files) {
  let name = manifest.name || 'Unnamed extension';
  if (/^__MSG_(.+)__$/.test(name)) {
    const key = name.replace(/^__MSG_|__$/g, '');
    const locale = manifest.default_locale || 'en';
    const candidates = [`_locales/${locale}/messages.json`, '_locales/en/messages.json'];
    for (const path of candidates) {
      const data = files[path];
      if (!data) continue;
      try {
        const messages = JSON.parse(decodeText(data));
        const entry = messages[key] || messages[key.toLowerCase()];
        if (entry) {
          name = typeof entry === 'string' ? entry : entry.message;
          break;
        }
      } catch { /* keep raw name */ }
    }
  }
  return name;
}

function pickIcon(manifest, files) {
  const icons = manifest.icons || {};
  const sizes = Object.keys(icons).map(Number).sort((a, b) => b - a);
  for (const size of sizes) {
    const p = icons[size];
    if (files[p]) return 'data:image/png;base64,' + bytesToB64(files[p]);
  }
  return '';
}

function permissionList(manifest) {
  const perms = [...(manifest.permissions || []), ...(manifest.host_permissions || [])];
  const opt = manifest.optional_permissions || [];
  return { perms: [...new Set([...perms, ...opt])].slice(0, 12), all: perms.length };
}

/* ---------- build an extension record ---------- */
async function recordFromFiles(fileMap, sourceLabel) {
  let manifestPath = 'manifest.json';
  if (!fileMap[manifestPath]) {
    const nested = Object.keys(fileMap).find((p) => p.endsWith('/manifest.json') && p.split('/').length <= 3);
    if (!nested) throw new Error('No manifest.json found — is this a Chrome extension?');
    manifestPath = nested;
    const prefix = nested.slice(0, -'manifest.json'.length);
    const trimmed = {};
    for (const [p, v] of Object.entries(fileMap)) trimmed[p.replace(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')] = v;
    fileMap = trimmed;
  }
  let manifest;
  try { manifest = JSON.parse(decodeText(fileMap['manifest.json'])); }
  catch { throw new Error('manifest.json could not be parsed'); }

  const files = {};
  let bytes = 0;
  for (const [path, data] of Object.entries(fileMap)) {
    bytes += data.length;
    files[path] = bytesToB64(data);
  }
  if (bytes > Ext.MAX_BYTES) throw new Error('Extension is larger than 3 MB');

  const id = 'ext' + uid();
  return {
    id,
    name: i18nName(manifest, fileMap).slice(0, 60),
    version: manifest.version || '0.0.0',
    description: (manifest.description || 'No description').slice(0, 220),
    manifestVersion: manifest.manifest_version || 2,
    manifest,
    permissions: permissionList(manifest).perms,
    popupPath: (manifest.action && manifest.action.default_popup) || (manifest.browser_action && manifest.browser_action.default_popup) || '',
    icon: pickIcon(manifest, fileMap),
    contentScripts: (manifest.content_scripts || []).map((cs) => (cs.matches || []).join(', ')).slice(0, 3),
    files,
    enabled: true,
    source: sourceLabel || 'local file',
    installedAt: Date.now()
  };
}

/* ---------- chrome shim for the popup frame ---------- */
function shimFor(record) {
  const messages = {};
  const locales = Object.keys(record.files).filter((p) => p.startsWith('_locales/') && p.endsWith('/messages.json'));
  for (const path of locales) {
    try {
      const parsed = JSON.parse(decodeText(b64ToBytes(record.files[path])));
      for (const [k, v] of Object.entries(parsed)) messages[k] = typeof v === 'string' ? v : v.message || '';
    } catch { /* ignore broken locale */ }
  }
  const safe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
  return `
(function(){
  const MANIFEST = ${safe(record.manifest)};
  const MESSAGES = ${safe(messages)};
  const pending = new Map(); let seq = 0;
  function call(method, args){
    return new Promise(function(resolve, reject){
      const id = ++seq; pending.set(id, {resolve: resolve, reject: reject});
      parent.postMessage({ ti: 'ext-call', id: id, method: method, args: args || [] }, '*');
    });
  }
  addEventListener('message', function(e){
    const d = e.data || {};
    if (d.ti !== 'ext-reply' || !pending.has(d.id)) return;
    const p = pending.get(d.id); pending.delete(d.id);
    if (d.error) p.reject(new Error(d.error)); else p.resolve(d.result);
  });
  function storage(){
    return {
      get: function(k){ return call('storage.get', [k]); },
      set: function(o){ return call('storage.set', [o]); },
      remove: function(k){ return call('storage.remove', [k]); },
      clear: function(){ return call('storage.clear', []); }
    };
  }
  const chrome = {
    runtime: {
      id: ${safe(record.id)},
      getManifest: function(){ return MANIFEST; },
      getURL: function(p){ return p; },
      sendMessage: function(){ return Promise.resolve(undefined); },
      onMessage: { addListener: function(){}, removeListener: function(){} },
      onInstalled: { addListener: function(){} },
      lastError: undefined
    },
    storage: { local: storage(), sync: storage(), session: storage() },
    tabs: {
      query: function(q){ return call('tabs.query', [q]); },
      create: function(o){ return call('tabs.create', [o]); },
      update: function(id, o){ return call('tabs.update', [id, o]); }
    },
    i18n: { getMessage: function(k){ return MESSAGES[k] || ''; } },
    action: { setBadgeText: function(){}, setBadgeBackgroundColor: function(){}, onClicked: { addListener: function(){} } },
    permissions: { contains: function(){ return Promise.resolve(true); }, request: function(){ return Promise.resolve(true); } }
  };
  window.chrome = chrome;
  window.browser = chrome;
})();`;
}

function popupDocument(record) {
  const raw = record.files[record.popupPath];
  if (!raw) return null;
  let html = decodeText(b64ToBytes(raw));
  const dir = record.popupPath.includes('/') ? record.popupPath.slice(0, record.popupPath.lastIndexOf('/') + 1) : '';
  const read = (p) => {
    const clean = p.replace(/^\.\//, '').replace(/^\//, '');
    const candidate = record.files[dir + clean] || record.files[clean];
    return candidate ? decodeText(b64ToBytes(candidate)) : '';
  };
  html = html.replace(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi, (tag) => {
    const m = tag.match(/href=["']([^"']+)["']/i);
    if (!m || /^(https?:)?\/\//i.test(m[1])) return tag;
    const css = read(m[1]);
    return css ? `<style>${css}</style>` : tag;
  });
  html = html.replace(/<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, pre, src, post) => {
    if (/^(https?:)?\/\//i.test(src)) return tag;
    const js = read(src);
    return js ? `<script${pre}${post}>${js}<\/script>` : tag;
  });
  html = html.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (tag, a, src, b) => {
    if (/^(https?:|data:)/i.test(src)) return tag;
    const data = record.files[dir + src.replace(/^\.\//, '')];
    return data ? `${a}data:image/png;base64,${data}${b}` : tag;
  });
  const shim = `<script>${shimFor(record)}<\/script>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + shim);
  else html = shim + html;
  const base = '<base target="_blank">';
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + base) : base + html;
}

/* ---------- chrome.* RPC ---------- */
function extStoreKey(id) { return 'ti.extdata.' + id; }
function readExtStore(id) {
  try { return JSON.parse(localStorage.getItem(extStoreKey(id)) || '{}'); } catch { return {}; }
}
function writeExtStore(id, data) {
  try { localStorage.setItem(extStoreKey(id), JSON.stringify(data)); } catch { toast('Extension storage is full'); }
}

function extStorageGet(id, keys) {
  const all = readExtStore(id);
  if (keys == null) return all;
  if (typeof keys === 'string') return { [keys]: all[keys] };
  if (Array.isArray(keys)) {
    const out = {};
    keys.forEach((k) => { out[k] = all[k]; });
    return out;
  }
  const out = { ...keys };
  Object.keys(keys).forEach((k) => { if (k in all) out[k] = all[k]; });
  return out;
}

async function handleExtCall(id, method, args) {
  if (method.startsWith('storage.')) {
    const all = readExtStore(id);
    if (method === 'storage.get') return extStorageGet(id, args[0]);
    if (method === 'storage.set') { writeExtStore(id, { ...all, ...(args[0] || {}) }); return undefined; }
    if (method === 'storage.remove') {
      const keys = Array.isArray(args[0]) ? args[0] : [args[0]];
      keys.forEach((k) => delete all[k]);
      writeExtStore(id, all);
      return undefined;
    }
    if (method === 'storage.clear') { writeExtStore(id, {}); return undefined; }
  }
  if (method === 'tabs.query') {
    const t = activeTab();
    return [{ id: 1, active: true, url: t.url || 'titanium://start', title: t.url ? hostOf(t.url) : 'New tab', windowId: 1 }];
  }
  if (method === 'tabs.create') { newTab((args[0] || {}).url || null); return { id: tabs.length }; }
  if (method === 'tabs.update') { navigate(args[1]?.url || 'about:blank'); return { id: 1 }; }
  throw new Error('chrome.' + method + ' is not available in this build');
}

window.addEventListener('message', async (e) => {
  const d = e.data || {};
  if (d.ti !== 'ext-call') return;
  const frame = document.querySelector('iframe[data-ext]');
  if (!frame || e.source !== frame.contentWindow) return;
  try {
    const result = await handleExtCall(frame.dataset.ext, d.method, d.args || []);
    e.source.postMessage({ ti: 'ext-reply', id: d.id, result }, '*');
  } catch (err) {
    e.source.postMessage({ ti: 'ext-reply', id: d.id, error: String(err && err.message || err) }, '*');
  }
});

/* ---------- install ---------- */
async function installExtension(fileMap, sourceLabel) {
  const cap = LIMITS.extensions[S.plan] || 2;
  if (Ext.items.length >= cap) {
    paywall(S.plan === 'free' ? 'premium' : 'ultimate');
    throw new Error(`Your plan allows ${cap} extensions`);
  }
  const record = await recordFromFiles(fileMap, sourceLabel);
  await idbPut(record);
  Ext.items.push(record);
  save();
  renderSheet(true);
  toast(`${record.name} installed`);
}

async function installFromFile(file) {
  const buffer = await file.arrayBuffer();
  const zip = stripCrx(buffer);
  const files = await unzip(zip);
  await installExtension(files, file.name);
}

async function installFromFolder(fileList) {
  const files = {};
  for (const file of fileList) {
    const path = (file.webkitRelativePath || file.name).split('/').slice(1).join('/') || file.name;
    files[path] = new Uint8Array(await file.arrayBuffer());
  }
  await installExtension(files, 'unpacked folder');
}

/* ---------- UI ---------- */
Ext.panelHTML = () => {
  const cap = LIMITS.extensions[S.plan];
  const capLabel = cap === Infinity ? 'unlimited' : cap;
  return `
    <div class="banner">${ico('puzzle')}<div><b>Chrome extensions, loaded locally</b><span>Drop in a <code>.crx</code> or <code>.zip</code> from the Chrome Web Store, or point at an unpacked folder. Titanium reads manifest.json, renders the popup and answers <code>chrome.storage</code>, <code>chrome.runtime</code> and <code>chrome.tabs</code> through a compatibility shim.</span></div></div>

    <div class="banner">${ico('info')}<div><b>What can't run in one HTML file</b><span>MV3 background service workers and content scripts injected into cross-origin sites need Chrome's process model. Extension popups, storage, options pages and tab metadata do work. Pages load inside a sandbox, so review what you install.</span></div></div>

    <div class="plan-actions">
      <button class="mini-btn accent" data-ext="add">Add extension (.crx / .zip)</button>
      <button class="mini-btn" data-ext="folder">Load unpacked</button>
      <span class="perm">${Ext.items.length} / ${capLabel} used · ${S.plan}</span>
    </div>
    <input type="file" id="extFile" accept=".crx,.zip,application/zip" hidden>
    <input type="file" id="extFolder" webkitdirectory directory multiple hidden>

    <div class="section-label">Installed</div>
    ${Ext.items.length ? Ext.items.map((x) => `
      <div class="ext-card">
        <div class="ext-head">
          <span class="ext-logo" style="background:transparent;overflow:hidden">${x.icon ? `<img src="${x.icon}" alt="" style="width:32px;height:32px">` : esc((x.name[0] || 'E').toUpperCase())}</span>
          <span class="ext-body"><b>${esc(x.name)}</b><small>v${esc(x.version)} · MV${x.manifestVersion} · ${esc(x.source)}</small></span>
          <button class="toggle" data-ext="toggle" data-id="${x.id}" aria-pressed="${x.enabled}" aria-label="Enable"></button>
        </div>
        <p style="margin:0;color:var(--muted);font-size:12.5px">${esc(x.description)}</p>
        <div class="perm-list">${x.permissions.length ? x.permissions.map((p) => `<span class="perm">${esc(p)}</span>`).join('') : '<span class="perm">no special permissions</span>'}</div>
        <div class="plan-actions">
          ${x.popupPath ? `<button class="mini-btn accent" data-ext="popup" data-id="${x.id}">Open popup</button>` : '<span class="perm">no popup</span>'}
          <button class="mini-btn danger" data-ext="remove" data-id="${x.id}">Remove</button>
        </div>
        ${x.contentScripts && x.contentScripts.length ? `<small style="color:var(--muted-2);font-size:11px">Content scripts declared for: ${esc(x.contentScripts.join(' · '))} (not injected by this build)</small>` : ''}
      </div>`).join('') : `<div class="empty"><b>No extensions yet</b>Install a CRX or ZIP to see its popup run here.</div>`}

    <p class="hint" style="color:var(--muted-2);font-size:11.5px">Extensions are stored in IndexedDB on this device. Removing one deletes its files and its chrome.storage data.</p>`;
};

Ext.bind = (root) => {
  const fileInput = $('#extFile', root);
  const folderInput = $('#extFolder', root);
  $$('[data-ext]', root).forEach((node) => {
    const kind = node.dataset.ext;
    if (kind === 'add') node.addEventListener('click', () => fileInput.click());
    if (kind === 'folder') node.addEventListener('click', () => folderInput.click());
    if (kind === 'toggle') node.addEventListener('click', async () => {
      const item = Ext.items.find((x) => x.id === node.dataset.id);
      if (!item) return;
      item.enabled = !item.enabled;
      node.setAttribute('aria-pressed', String(item.enabled));
      await idbPut(item);
      toast(`${item.name} ${item.enabled ? 'enabled' : 'disabled'}`);
    });
    if (kind === 'remove') node.addEventListener('click', async () => {
      const item = Ext.items.find((x) => x.id === node.dataset.id);
      if (!item) return;
      openModal(`<h3>Remove ${esc(item.name)}?</h3><p>Its files and stored data are deleted from this device.</p>
        <div class="modal-actions"><button class="ghost-btn" data-act="modalClose">Cancel</button><button class="primary-btn" data-ext="removeConfirm" data-id="${item.id}">Remove</button></div>`);
      const confirmBtn = $('#modalCard [data-ext="removeConfirm"]');
      if (confirmBtn) confirmBtn.addEventListener('click', async () => {
        await idbDel(item.id);
        localStorage.removeItem(extStoreKey(item.id));
        Ext.items = Ext.items.filter((x) => x.id !== item.id);
        closeModal(); renderSheet(true); toast('Extension removed');
      });
    });
    if (kind === 'popup') node.addEventListener('click', () => Ext.openPopup(node.dataset.id));
  });

  if (fileInput) fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    toast('Reading ' + file.name + '…');
    try { await installFromFile(file); }
    catch (err) { toast(String(err.message || err)); }
    fileInput.value = '';
  });
  if (folderInput) folderInput.addEventListener('change', async () => {
    if (!folderInput.files || !folderInput.files.length) return;
    toast('Reading folder…');
    try { await installFromFolder(folderInput.files); }
    catch (err) { toast(String(err.message || err)); }
    folderInput.value = '';
  });
};

Ext.openPopup = async (id) => {
  const record = Ext.items.find((x) => x.id === id);
  if (!record) return;
  if (!record.enabled) { toast('Enable the extension first'); return; }
  const doc = popupDocument(record);
  if (!doc) { toast('This extension has no popup page'); return; }
  openModal(`<h3 style="display:flex;align-items:center;gap:10px">${esc(record.name)} <span class="perm">popup</span></h3>
    <div class="ext-popup-preview"><iframe data-ext="${record.id}" sandbox="allow-scripts allow-forms allow-popups" title="${esc(record.name)} popup"></iframe></div>
    <p style="font-size:11.5px">Running in a sandbox with a chrome.* shim. Data written by the popup is kept per extension.</p>
    <div class="modal-actions"><button class="primary-btn" data-act="modalClose">Done</button></div>`,
    () => {
      const frame = document.querySelector(`iframe[data-ext="${record.id}"]`);
      if (frame) frame.srcdoc = doc;
    });
};

Ext.init = async () => {
  try {
    Ext.items = (await idbAll()).map((rec) => ({
      ...rec,
      enabled: rec.enabled !== false,
      permissions: rec.permissions || [],
      contentScripts: rec.contentScripts || []
    })).sort((a, b) => a.installedAt - b.installedAt);
  } catch {
    Ext.items = [];
  }
  Ext.ready = true;
  if (sheetStack[sheetStack.length - 1] === 'extensions' && !$('#sheet').hidden) renderSheet(true);
};

window.Ext = Ext;
