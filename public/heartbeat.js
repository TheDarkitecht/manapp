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
})();
