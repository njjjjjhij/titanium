'use strict';
/* ============================================================
   Titanium — source browser
   Reads the embedded project sources, lets anyone edit them in
   place, copy them, download them, and apply a CSS override to
   the browser running on this device.
   ============================================================ */

const FILES = window.SOURCE_FILES || {};
const ORDER = [
  'src/app.js',
  'src/icons.js',
  'src/onboarding.js',
  'src/panels.js',
  'src/panels2.js',
  'src/actions.js',
  'src/extensions.js',
  'src/boot.js',
  'src/styles.css',
  'src/template.html',
  'src/source.js',
  'src/source.template.html',
  'build.mjs',
  'README.md',
  'icon.svg'
];

const edits = {};
let current = ORDER.find((f) => f in FILES) || Object.keys(FILES)[0];
let editing = false;

const $ = (s) => document.querySelector(s);

function textOf(name) {
  return edits[name] !== undefined ? edits[name] : (FILES[name] || '');
}

function bytes(n) {
  return n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
}

function renderList() {
  const list = $('#srcList');
  list.innerHTML = ORDER.filter((f) => f in FILES).map((f) => {
    const lines = textOf(f).split('\n').length;
    return `<button class="src-file" data-file="${f}" aria-current="${f === current}">
      <span>${f.replace(/^src\//, '')}</span>
      <small>${edits[f] !== undefined ? 'edited' : lines + ' lines'}</small>
    </button>`;
  }).join('');
  list.querySelectorAll('[data-file]').forEach((btn) => {
    btn.addEventListener('click', () => select(btn.dataset.file));
  });
}

function select(name) {
  current = name;
  editing = false;
  const text = textOf(name);
  $('#srcName').textContent = name;
  $('#srcMeta').textContent = `${text.split('\n').length} lines · ${bytes(new Blob([text]).size)}${edits[name] !== undefined ? ' · edited in this tab' : ''}`;
  $('#srcCode').textContent = text;
  $('#srcCode').hidden = false;
  const editor = $('#srcEditor');
  editor.hidden = true;
  editor.value = text;
  $('#srcEdit').textContent = 'Edit';
  $('#srcNote').innerHTML = name === 'README.md'
    ? 'This is the page GitHub shows. It stays prose — the code lives in the files beside it.'
    : name === 'src/styles.css'
      ? 'Edit the stylesheet here and use <b>Apply CSS to my Titanium</b> to see it live in the browser on this device, then download the file to keep it.'
      : 'Edit in place, then copy or download. Nothing is uploaded anywhere — your copy stays yours.';
  renderList();
}

function toggleEdit() {
  const editor = $('#srcEditor');
  editing = !editing;
  if (editing) {
    editor.hidden = false;
    $('#srcCode').hidden = true;
    $('#srcEdit').textContent = 'Preview';
    editor.focus();
  } else {
    edits[current] = editor.value;
    $('#srcCode').textContent = editor.value;
    editor.hidden = true;
    $('#srcCode').hidden = false;
    $('#srcEdit').textContent = 'Edit';
    select(current);
    toast('Changes kept in this tab — download to keep them forever');
  }
}

async function copyCurrent() {
  try {
    await navigator.clipboard.writeText(textOf(current));
    toast('Copied ' + current);
  } catch {
    toast('Copy was blocked — select the text and copy manually');
  }
}

function downloadCurrent() {
  const blob = new Blob([textOf(current)], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = current.split('/').pop();
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Downloaded ' + a.download);
}

function applyCss() {
  if (current !== 'src/styles.css') {
    toast('Open styles.css first, then apply');
    return;
  }
  try {
    localStorage.setItem('ti.css.override', textOf('src/styles.css'));
    toast('CSS applied to Titanium on this device — reload the browser');
  } catch {
    toast('Could not save the override');
  }
}

function resetCss() {
  try {
    localStorage.removeItem('ti.css.override');
    toast('CSS override removed');
  } catch {
    toast('Nothing to reset');
  }
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

$('#srcEdit').addEventListener('click', toggleEdit);
$('#srcCopy').addEventListener('click', copyCurrent);
$('#srcDownload').addEventListener('click', downloadCurrent);
$('#applyCss').addEventListener('click', applyCss);
$('#resetCss').addEventListener('click', resetCss);
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (editing) toggleEdit();
    else downloadCurrent();
  }
});

select(current);
