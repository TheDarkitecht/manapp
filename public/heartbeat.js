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
})();
