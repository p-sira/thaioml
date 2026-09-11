/**
 * ThaiOML Theme Sync Script
 *
 * Architecture: Reads the shared `thaioml-theme` cookie (set by the Next.js
 * webapp) as the single source of truth. Also syncs to the MkDocs Material
 * localStorage key so the theme persists correctly across navigations
 * (including Instant Loading / SPA-style transitions).
 *
 * Resolution order (per frontend-architecture.md):
 *   1. thaioml-theme cookie  → apply immediately
 *   2. prefers-color-scheme  → fallback if no cookie
 *   3. MkDocs localStorage   → kept in sync so Material doesn't override us
 */

(function () {
  // ── Helpers ────────────────────────────────────────────────────────────────

  function getCookie(name) {
    const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
  }

  /**
   * Resolve the active theme using the standard resolution flow:
   *   cookie → OS preference → 'leuko' (safe default)
   */
  function resolveTheme() {
    const cookie = getCookie('thaioml-theme');
    if (cookie) return cookie;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'darkroom'
      : 'leuko';
  }

  /**
   * Apply theme to the DOM and keep MkDocs Material's localStorage in sync.
   * This prevents Material's built-in palette logic from overriding our theme
   * on Instant-Loading navigations.
   */
  function applyTheme(theme) {
    // 1. Set the CSS attribute that our custom-theme.css selectors use.
    document.body.setAttribute('data-md-color-scheme', theme);

    // 2. Sync into MkDocs Material's localStorage key so its own palette
    //    toggle and instant-loading hooks don't clobber our value.
    try {
      localStorage.setItem('data-md-color-scheme', theme);
    } catch (_) {
      // Private browsing or storage denied – silently ignore.
    }

    // 3. Apply optional accent colour override from its own cookie.
    const accentHex = getCookie('thaioml-accent-color');
    if (accentHex) {
      document.documentElement.style.setProperty('--md-accent-fg-color', accentHex);
      var r = parseInt(accentHex.substring(1, 3), 16) || 0;
      var g = parseInt(accentHex.substring(3, 5), 16) || 0;
      var b = parseInt(accentHex.substring(5, 7), 16) || 0;
      document.documentElement.style.setProperty(
        '--md-accent-fg-color--transparent',
        'rgba(' + r + ', ' + g + ', ' + b + ', 0.1)'
      );
    }
  }

  // ── Initial synchronous application (prevents FOUC) ───────────────────────
  // This IIFE runs immediately as the script tag is parsed, before
  // DOMContentLoaded, blocking the browser from painting the wrong theme.
  applyTheme(resolveTheme());

  // ── MkDocs Material Instant Loading hook ──────────────────────────────────
  // `document$` is a RxJS observable exposed by MkDocs Material. It fires on
  // every page load including SPA-style instant navigations. Subscribing to it
  // ensures we re-apply the theme after Material re-mounts the DOM.
  if (typeof document$ !== 'undefined') {
    document$.subscribe(function () {
      applyTheme(resolveTheme());
    });
  } else {
    // Fallback for environments without the observable.
    document.addEventListener('DOMContentLoaded', function () {
      applyTheme(resolveTheme());
    });
  }

  // ── OS preference listener ─────────────────────────────────────────────────
  // Only re-applies if there is no explicit cookie set (user follows OS pref).
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (!getCookie('thaioml-theme')) {
      applyTheme(resolveTheme());
    }
  });
})();

