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
      
      const avatarUrl = Clerk.user.imageUrl;
      
      const profileLink = document.createElement("a");
      profileLink.href = "http://localhost:3000/profile";
      profileLink.className = "clerk-profile-link";
      
      const avatarImg = document.createElement("img");
      avatarImg.src = avatarUrl;
      avatarImg.alt = "Profile";
      avatarImg.className = "clerk-avatar";
      
      profileLink.appendChild(avatarImg);
      authContainer.appendChild(profileLink);
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
