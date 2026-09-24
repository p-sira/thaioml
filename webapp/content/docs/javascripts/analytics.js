document.addEventListener("DOMContentLoaded", function() {
    // PostHog snippet initialization (stub loader)
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    // Read PostHog config from meta tags injected by MkDocs template (main.html)
    const metaTag = document.querySelector('meta[name="posthog-key"]');
    const POSTHOG_KEY = metaTag ? metaTag.getAttribute('content') : null;
    const hostMetaTag = document.querySelector('meta[name="posthog-host"]');
    const POSTHOG_HOST = hostMetaTag ? hostMetaTag.getAttribute('content') : "https://us.i.posthog.com";

    // Cookie helpers
    function setConsentCookie(value) {
        const domainStr = window.location.hostname.includes('thaioml.org') ? '; domain=.thaioml.org' : '';
        document.cookie = "cookie_consent=" + value + "; path=/; max-age=15552000" + domainStr;
    }

    function getConsentCookie() {
        const match = document.cookie.match(new RegExp('(^| )cookie_consent=([^;]+)'));
        if (match) return match[2];
        return null;
    }

    // Expose a global reset function for the footer Privacy link
    window.resetCookieConsent = function() {
        const domainStr = window.location.hostname.includes('thaioml.org') ? '; domain=.thaioml.org' : '';
        document.cookie = "cookie_consent=; path=/; max-age=0" + domainStr;
        window.location.reload();
    };

    if (!POSTHOG_KEY || POSTHOG_KEY === "YOUR_POSTHOG_API_KEY") {
        // No valid key — skip all analytics setup
        return;
    }

    const consent = getConsentCookie();
    const hasConsented = consent === 'granted';

    // Initialize PostHog.
    // - `capture_pageview: false` — we manage pageviews manually to support
    //   MkDocs Material's `navigation.instant` SPA-like navigation via document$.
    // - `opt_out_capturing_by_default` — respect the Privacy First model: only
    //   capture events once the user explicitly accepts cookies.
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        opt_out_capturing_by_default: !hasConsented,
    });

    // --- Pageview on navigation (including instant navigation) ---
    // Material for MkDocs emits a `document$` RxJS observable whenever the page
    // content is replaced during instant navigation. Subscribe to it so that
    // every page transition (including the initial load) fires a $pageview.
    // On a full page reload, document$ fires once immediately; on instant nav
    // it fires again for each subsequent URL change.
    if (typeof document$ !== 'undefined') {
        document$.subscribe(function() {
            if (!posthog.has_opted_out_capturing()) {
                posthog.capture('$pageview');
            }
        });
    } else {
        // Fallback for when document$ is not yet available (e.g., race condition):
        // fire a single pageview for the initial load.
        if (hasConsented) {
            posthog.capture('$pageview');
        }
    }

    // --- Cookie consent banner (shown only when no decision has been made yet) ---
    if (!consent) {
        const banner = document.createElement('div');
        banner.style.cssText = [
            'position:fixed', 'bottom:0', 'left:0', 'width:100%',
            'background-color:#0f172a', 'color:white', 'padding:16px',
            'display:flex', 'justify-content:space-between', 'align-items:center',
            'z-index:9999', 'box-shadow:0 -4px 6px -1px rgba(0,0,0,0.1)',
            'font-family:system-ui,sans-serif', 'box-sizing:border-box',
        ].join(';');

        const text = document.createElement('p');
        text.innerText = 'We use cookies to analyze traffic and improve our services. By clicking "Accept", you consent to our use of cookies.';
        text.style.cssText = 'margin:0;font-size:14px;flex:1;padding-right:16px';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;gap:16px;flex-shrink:0';

        const declineBtn = document.createElement('button');
        declineBtn.innerText = 'Decline';
        declineBtn.style.cssText = 'background:none;border:none;color:#cbd5e1;cursor:pointer;text-decoration:underline;font-size:14px';

        const acceptBtn = document.createElement('button');
        acceptBtn.innerText = 'Accept';
        acceptBtn.style.cssText = 'background-color:#2563eb;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:500;font-size:14px';

        declineBtn.onclick = function() {
            setConsentCookie('denied');
            banner.remove();
        };

        acceptBtn.onclick = function() {
            setConsentCookie('granted');
            posthog.opt_in_capturing();
            // Capture the initial pageview that was intentionally skipped during opt-out init
            posthog.capture('$pageview');
            banner.remove();
        };

        btnContainer.appendChild(declineBtn);
        btnContainer.appendChild(acceptBtn);
        banner.appendChild(text);
        banner.appendChild(btnContainer);
        document.body.appendChild(banner);
    }
});
