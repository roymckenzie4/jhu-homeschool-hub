/**
 * Optional Google Analytics 4 (gtag.js) wrapper.
 *
 * Gated entirely on MEASUREMENT_ID: with no ID, init and trackEvent are no-ops,
 * so the site tracks nothing until an ID is set here. gtag is injected at
 * runtime rather than hard-coded in index.html, so toggling analytics on/off is
 * a one-line change in this file.
 *
 * The custom events (tab_switch, state_select) exist because the views sit
 * behind a tab toggle, not a router — view usage has to be sent as explicit
 * events. Switching to a hash router would give per-view pageviews for free and
 * these could go away.
 *
 * Still TODO before production: consent (GDPR) and the WCAG pass.
 */

// GA4 Measurement ID, supplied per environment via VITE_GA_ID (local: .env.local,
// deploy: a GitHub Actions variable). Unset = empty = analytics disabled, so dev
// and prod can point at different properties or none. Not a secret; the ID ships
// in the client bundle regardless.
const MEASUREMENT_ID = import.meta.env.VITE_GA_ID ?? "";

const isEnabled = () => MEASUREMENT_ID.length > 0;

// Loads gtag.js and opens a session. Call once at startup; no-op if there's no
// ID or gtag is already loaded.
export function initAnalytics() {
  if (!isEnabled() || window.gtag) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
}

// Sends a custom event. No-op when analytics is off, so callers don't need to
// guard the call.
export function trackEvent(name, params = {}) {
  if (!isEnabled() || !window.gtag) return;
  window.gtag("event", name, params);
}
