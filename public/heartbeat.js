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
})();
