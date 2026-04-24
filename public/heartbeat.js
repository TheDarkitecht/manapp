// heartbeat.js — skickar "jag är fortfarande här" var 30:e sekund
// så vi kan mäta riktig tid-aktiv per sida. Använder sendBeacon för
// att inte blockera navigering och Page Visibility API för att inte
// räkna tid när fliken är i bakgrunden.
(function () {
  'use strict';

  // Bara för inloggade (ingen mening annars). Ett simpelt heuristik:
  // sök efter body-klass "block-page" ELLER en learn-nav som bara visas för inloggade.
  // Om inget finns, kör ändå — servern ignorerar anonyma POST:s.
  var lastSent = 0;
  var accumulated = 0;     // ms aktiv på denna sida
  var lastTick    = Date.now();
  var visible     = !document.hidden;

  function tick() {
    var now = Date.now();
    if (visible) accumulated += (now - lastTick);
    lastTick = now;

    // Skicka var 30:e sekund om det ackumulerats nya ms sedan förra send
    if (accumulated - lastSent >= 30000) {
      send();
    }
  }

  function send() {
    if (accumulated <= lastSent) return;
    var payload = JSON.stringify({ durationMs: accumulated });
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/heartbeat', blob);
      } else {
        // Fallback: fetch keepalive
        fetch('/heartbeat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    payload,
          keepalive: true,
        }).catch(function () {});
      }
      lastSent = accumulated;
    } catch (_) {}
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (!visible) send(); // skicka direkt när användaren byter flik
    lastTick = Date.now();
  });

  window.addEventListener('pagehide', send);
  window.addEventListener('beforeunload', send);

  // Tick varje sekund — billigt, men duration_ms uppdateras bara var 30:e sek
  setInterval(tick, 1000);

  // ── Universal loading-state för POST-forms ─────────────────────────────────
  // När en form skickas, disable submit-knappen och visa "⏳ Väntar..."
  // så användaren inte klickar dubbelt och vet att något händer.
  // Skippar forms med data-no-loading (tex redan-hanterade forms).
  function initFormLoadingStates() {
    document.querySelectorAll('form[method="POST" i], form[method="post" i]').forEach(function (form) {
      if (form.dataset.loadingBound) return;
      if (form.dataset.noLoading) return;
      form.dataset.loadingBound = '1';
      form.addEventListener('submit', function () {
        var btn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (!btn || btn.disabled) return;
        // Spara original-text ifall form är ogiltigt och vi vill återställa
        btn.dataset.origText = btn.textContent || btn.value;
        setTimeout(function () {
          // setTimeout 0 för att låta HTML5-validering köra först
          if (form.checkValidity && !form.checkValidity()) return;
          btn.disabled = true;
          if (btn.tagName === 'BUTTON') {
            btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> Skickar…';
          } else {
            btn.value = '⏳ Skickar…';
          }
        }, 0);
      });
    });
  }
  // CSS för spinner-animation (injectas en gång)
  if (!document.getElementById('jj-spinner-css')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'jj-spinner-css';
    styleEl.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(styleEl);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormLoadingStates);
  } else {
    initFormLoadingStates();
  }

  // ── Impersonation-banner ──────────────────────────────────────────────────
  // Pollar /impersonate/status en gång vid page load. Om admin impersonerar,
  // visa banner högst upp med "Stoppa"-knapp. Universal via denna script ist.f.
  // att editera alla 35 EJS-views med en partial.
  function initImpersonateBanner() {
    if (document.getElementById('jj-impersonate-banner')) return; // redan renderad
    fetch('/impersonate/status', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.active) return;
        // Hämta CSRF-token för stop-formen
        return fetch('/impersonate/csrf', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (csrf) {
            if (!csrf) return;
            renderImpersonateBanner(data, csrf.token);
          });
      })
      .catch(function () { /* tyst — ingen banner om nätverksfel */ });
  }

  function renderImpersonateBanner(data, csrfToken) {
    var banner = document.createElement('div');
    banner.id = 'jj-impersonate-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.style.cssText = 'position:sticky;top:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:0.65rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;font-size:0.88rem;font-weight:600;box-shadow:0 2px 12px rgba(220,38,38,0.4);flex-wrap:wrap;';

    var msg = document.createElement('div');
    msg.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
    msg.innerHTML =
      '<span aria-hidden="true" style="font-size:1.1rem;">🎭</span>' +
      '<span>IMPERSONATION AKTIV — admin <strong>' + escapeHtml(data.adminUsername) +
      '</strong> agerar som <strong>' + escapeHtml(data.targetUsername) + '</strong></span>';

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/impersonate/stop';
    form.style.cssText = 'margin:0;display:inline;';
    form.innerHTML =
      '<input type="hidden" name="_csrf" value="' + escapeHtml(csrfToken) + '" />' +
      '<button type="submit" style="padding:0.4rem 0.85rem;background:rgba(255,255,255,0.95);color:#b91c1c;border:none;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer;">Stoppa impersonation</button>';

    banner.appendChild(msg);
    banner.appendChild(form);
    document.body.insertBefore(banner, document.body.firstChild);

    // Lägg till margin på body så banner inte döljer innehåll
    document.body.style.marginTop = '0';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImpersonateBanner);
  } else {
    initImpersonateBanner();
  }

  // ── Onboarding: NEW-badges + kontextuella tooltips ────────────────────────
  // Klient-side, localStorage-persistens per browser. Respekterar user agency:
  // aldrig auto-popup som blockerar, bara dots/arrows user kan ignorera.
  //
  // Två markörer att använda i EJS:
  //   data-new-feature="pro-samtal"
  //     → Pulserande gold-dot + "NY"-chip. Försvinner när user klickar länken
  //       eller trycker på badgen.
  //
  //   data-onboarding-tip="Börja här — Block 1 är gratis"
  //   data-onboarding-id="dashboard-blocks"
  //     → Inline tooltip med pil som pekar på elementet. Auto-dismiss efter 8s
  //       eller vid klick. Visas en gång per onboarding-id per browser.

  // Inject CSS en gång per sida
  if (!document.getElementById('jj-onboarding-css')) {
    var ocss = document.createElement('style');
    ocss.id = 'jj-onboarding-css';
    ocss.textContent = [
      '@keyframes jj-pulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.35);opacity:0.6;} }',
      '.jj-new-badge { display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 8px;background:rgba(251,191,36,0.18);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);border-radius:999px;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;vertical-align:middle;}',
      '.jj-new-badge::before { content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#fbbf24;animation:jj-pulse 1.5s ease-in-out infinite;box-shadow:0 0 8px rgba(251,191,36,0.7);}',
      '.jj-new-badge:hover { background:rgba(251,191,36,0.3); }',
      '.jj-tooltip { position:absolute;z-index:9998;max-width:260px;padding:10px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:10px;font-size:13px;font-weight:600;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.1);pointer-events:auto;animation:jj-tip-in 0.3s ease;cursor:pointer;}',
      '.jj-tooltip::before { content:"";position:absolute;border:7px solid transparent;}',
      '.jj-tooltip[data-pos="bottom"]::before { top:-14px;left:20px;border-bottom-color:#6366f1;}',
      '.jj-tooltip[data-pos="top"]::before    { bottom:-14px;left:20px;border-top-color:#8b5cf6;}',
      '.jj-tooltip .jj-tip-dismiss { opacity:0.7;font-size:10px;margin-top:4px;display:block;}',
      '@keyframes jj-tip-in { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }',
    ].join('\n');
    document.head.appendChild(ocss);
  }

  var ONBOARDING_STORAGE = 'jj-onboarding-v1';

  function getDismissed() {
    try { return JSON.parse(localStorage.getItem(ONBOARDING_STORAGE)) || {}; }
    catch (_) { return {}; }
  }

  function setDismissed(key) {
    try {
      var d = getDismissed();
      d[key] = Date.now();
      localStorage.setItem(ONBOARDING_STORAGE, JSON.stringify(d));
    } catch (_) {}
  }

  function initNewBadges() {
    var dismissed = getDismissed();
    document.querySelectorAll('[data-new-feature]').forEach(function (el) {
      var feature = el.getAttribute('data-new-feature');
      if (!feature) return;
      if (dismissed['new:' + feature]) return;
      if (el.querySelector('.jj-new-badge')) return; // redan renderad

      var badge = document.createElement('span');
      badge.className = 'jj-new-badge';
      badge.setAttribute('aria-label', 'Ny funktion: ' + feature);
      badge.textContent = 'NY';
      el.appendChild(badge);

      // Dismiss när element ELLER badge klickas (klick på länken räknas också)
      var dismiss = function () { setDismissed('new:' + feature); badge.remove(); };
      badge.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); dismiss(); });
      el.addEventListener('click', function () { setTimeout(dismiss, 100); }, { once: true });
    });
  }

  function initTooltips() {
    var dismissed = getDismissed();
    document.querySelectorAll('[data-onboarding-tip]').forEach(function (el) {
      var tipId = el.getAttribute('data-onboarding-id') || el.getAttribute('data-onboarding-tip').slice(0, 30);
      if (dismissed['tip:' + tipId]) return;

      var text = el.getAttribute('data-onboarding-tip');
      if (!text) return;

      var tip = document.createElement('div');
      tip.className = 'jj-tooltip';
      tip.setAttribute('role', 'status');
      tip.setAttribute('aria-live', 'polite');
      tip.innerHTML = escapeHtml(text) + '<span class="jj-tip-dismiss">Klicka för att stänga</span>';

      // Positionering: under elementet om det finns plats, annars ovan
      var rect = el.getBoundingClientRect();
      var scrollY = window.scrollY || window.pageYOffset;
      var scrollX = window.scrollX || window.pageXOffset;
      var belowAvailable = window.innerHeight - rect.bottom > 80;

      tip.style.position = 'absolute';
      if (belowAvailable) {
        tip.setAttribute('data-pos', 'bottom');
        tip.style.top = (rect.bottom + scrollY + 14) + 'px';
      } else {
        tip.setAttribute('data-pos', 'top');
        tip.style.top = (rect.top + scrollY - 80) + 'px';
      }
      tip.style.left = Math.max(10, rect.left + scrollX) + 'px';

      document.body.appendChild(tip);

      // Dismiss vid klick på tooltip eller efter 10 sekunder
      var dismiss = function () {
        tip.style.animation = 'jj-tip-in 0.2s ease reverse';
        setTimeout(function () { tip.remove(); }, 180);
        setDismissed('tip:' + tipId);
      };
      tip.addEventListener('click', dismiss);
      setTimeout(dismiss, 10000);
    });
  }

  function initOnboarding() {
    initNewBadges();
    // Fördröj tooltips kort så de inte konkurrerar med page-render
    setTimeout(initTooltips, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnboarding);
  } else {
    initOnboarding();
  }
})();
