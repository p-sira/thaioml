const publishableKey = "pk_test_YW11c2VkLWhlcm1pdC01ODYuY2xlcmsuYWNjb3VudHMuZGV2JA";

const startClerk = async () => {
  const Clerk = window.Clerk;
  try {
    await Clerk.load();

    const authContainer = document.getElementById("clerk-auth-container");
    const signInBtn = document.getElementById("clerk-sign-in-btn");

    if (!authContainer || !signInBtn) return;

    if (Clerk.user) {
      // User is signed in, replace Sign In button with User avatar
      signInBtn.style.display = "none";
      
      const username = Clerk.user.username || Clerk.user.id;
      const profileUrl = "http://localhost:3000/user/" + username;

      const userButtonDiv = document.createElement("div");
      authContainer.appendChild(userButtonDiv);
      
      Clerk.mountUserButton(userButtonDiv, {
        userProfileMode: "navigation",
        userProfileUrl: "http://localhost:3000/settings",
        appearance: {
          elements: {
            userButtonPopoverActionButton: {
              color: 'inherit',
            },
            userButtonPopoverActionButtonIconBox: {
              color: 'inherit',
            },
            userButtonPopoverActionButtonText: {
              color: 'inherit',
            },
            userButtonPopoverCustomItem: {
              color: 'inherit',
            },
            userButtonPopoverCustomItemButton: {
              color: 'inherit',
            },
          }
        },
        customMenuItems: [
          {
            label: "Profile",
            href: profileUrl,
            labelIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          }
        ]
      });
    } else {
      // User is not signed in
      signInBtn.style.display = "inline-block";
    }
  } catch (err) {
    console.error("Error loading Clerk: ", err);
  }
};

const loadClerkScript = () => {
  const script = document.createElement('script');
  script.setAttribute('data-clerk-publishable-key', publishableKey);
  script.async = true;
  script.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
  script.crossOrigin = 'anonymous';
  script.onload = () => startClerk();
  document.body.appendChild(script);
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', loadClerkScript);
