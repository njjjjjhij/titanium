'use strict';
/* ============================================================
   Titanium — boot
   ============================================================ */

let wired = false;

function hideBoot() {
  const boot = $('#boot');
  if (!boot) return;
  boot.classList.add('hide');
  setTimeout(() => { boot.hidden = true; }, 380);
}

function startApp() {
  $('#onboard').hidden = true;
  $('#app').hidden = false;
  applySettings();
  renderTopbar();
  renderHome();
  renderView();
  hideBoot();
}

function applyCssOverride() {
  try {
    const css = localStorage.getItem('ti.css.override');
    if (!css) return;
    const tag = document.createElement('style');
    tag.id = 'ti-css-override';
    tag.textContent = css;
    document.head.appendChild(tag);
  } catch { /* storage blocked */ }
}

function bootTitanium() {
  applyCssOverride();
  $('#onboardNext').addEventListener('click', obNext);
  $('#onboardBack').addEventListener('click', obBack);
  $('#skipOnboard').addEventListener('click', () => {
    S.heardFrom = S.heardFrom || 'not specified';
    S.onboarded = true;
    S.account = S.account || { name: 'Guest', email: '', guest: true, createdAt: Date.now() };
    save();
    $('#onboard').hidden = true;
    startApp();
    toast('You can finish setup any time in the menu');
  });

  window.addEventListener('scroll', () => {
    const top = window.scrollY || document.documentElement.scrollTop;
    $('#topbar').classList.toggle('scrolled', top > 6);
  }, { passive: true });

  if (!wired) {
    wire();
    wired = true;
  }

  applySettings();

  if (S.onboarded) {
    startApp();
  } else {
    hideBoot();
    startOnboarding();
  }

  Ext.init();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootTitanium);
else bootTitanium();
