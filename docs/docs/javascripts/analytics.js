document.addEventListener("DOMContentLoaded", function() {
    // PostHog initialization
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    // Use a placeholder or inject via build system. Since it's a static site, we can use a placeholder for now
    // and the user can replace it in the file or through env vars in mkdocs.yml (using !ENV) if passed to a template.
    // However, since we are doing this in JS, we'll look for a meta tag if we inject it, or just leave it here.
    const metaTag = document.querySelector('meta[name="posthog-key"]');
    const POSTHOG_KEY = metaTag ? metaTag.getAttribute('content') : "YOUR_POSTHOG_API_KEY"; 
    const POSTHOG_HOST = "https://app.posthog.com";

    if (POSTHOG_KEY && POSTHOG_KEY !== "YOUR_POSTHOG_API_KEY") {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            opt_out_capturing_by_default: true,
        });

        const consent = localStorage.getItem('cookie_consent');
        if (consent === 'granted') {
            posthog.opt_in_capturing();
        } else if (!consent) {
            // Create banner
            const banner = document.createElement('div');
            banner.style.position = 'fixed';
            banner.style.bottom = '0';
            banner.style.left = '0';
            banner.style.width = '100%';
            banner.style.backgroundColor = '#0f172a'; // slate-900
            banner.style.color = 'white';
            banner.style.padding = '16px';
            banner.style.display = 'flex';
            banner.style.justifyContent = 'space-between';
            banner.style.alignItems = 'center';
            banner.style.zIndex = '9999';
            banner.style.boxShadow = '0 -4px 6px -1px rgba(0, 0, 0, 0.1)';
            banner.style.fontFamily = 'system-ui, sans-serif';

            const text = document.createElement('p');
            text.innerText = 'We use cookies to analyze traffic and improve our services. By clicking "Accept", you consent to our use of cookies.';
            text.style.margin = '0';
            text.style.fontSize = '14px';

            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '16px';

            const declineBtn = document.createElement('button');
            declineBtn.innerText = 'Decline';
            declineBtn.style.background = 'none';
            declineBtn.style.border = 'none';
            declineBtn.style.color = '#cbd5e1';
            declineBtn.style.cursor = 'pointer';
            declineBtn.style.textDecoration = 'underline';

            const acceptBtn = document.createElement('button');
            acceptBtn.innerText = 'Accept';
            acceptBtn.style.backgroundColor = '#2563eb'; // blue-600
            acceptBtn.style.color = 'white';
            acceptBtn.style.border = 'none';
            acceptBtn.style.padding = '8px 16px';
            acceptBtn.style.borderRadius = '4px';
            acceptBtn.style.cursor = 'pointer';
            acceptBtn.style.fontWeight = '500';

            declineBtn.onclick = function() {
                localStorage.setItem('cookie_consent', 'denied');
                banner.remove();
            };

            acceptBtn.onclick = function() {
                localStorage.setItem('cookie_consent', 'granted');
                posthog.opt_in_capturing();
                banner.remove();
            };

            btnContainer.appendChild(declineBtn);
            btnContainer.appendChild(acceptBtn);
            banner.appendChild(text);
            banner.appendChild(btnContainer);
            document.body.appendChild(banner);
        }
    }
});
