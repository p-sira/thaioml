document.addEventListener('DOMContentLoaded', () => {
  // Function to get a cookie value by name
  const getCookie = (name) => {
    const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
  };

  const applyThemeVariables = (theme, hex) => {
    if (theme) {
      document.body.setAttribute('data-md-color-scheme', theme);
    }
    
    if (hex) {
      document.documentElement.style.setProperty('--md-accent-fg-color', hex);
      let r = 0, g = 0, b = 0;
      if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      document.documentElement.style.setProperty(
        '--md-accent-fg-color--transparent', 
        `rgba(${r}, ${g}, ${b}, 0.1)`
      );
    }
  };

  // 1. Read cookies for theme and accent
  const savedTheme = getCookie('thaioml-theme');
  const savedAccent = getCookie('thaioml-accent-color');
  
  // 2. Apply theme variables
  if (savedTheme || savedAccent) {
    applyThemeVariables(savedTheme, savedAccent);
  }
});
