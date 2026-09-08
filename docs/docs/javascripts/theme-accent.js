document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'thaioml-accent-color';
  
  // Curated medical/professional accent colors
  const accents = [
    { name: 'Slate (Default)', hex: '#64748b' },
    { name: 'Medical Blue', hex: '#0284c7' },
    { name: 'Cyan', hex: '#0891b2' },
    { name: 'Teal', hex: '#0d9488' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Crimson', hex: '#e11d48' },
    { name: 'Rose', hex: '#be123c' },
    { name: 'Amber', hex: '#d97706' }
  ];

  // Function to apply the color to the document
  const applyColor = (hex) => {
    document.documentElement.style.setProperty('--md-accent-fg-color', hex);
    
    // Convert hex to rgb for the transparent version
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
  };

  // 1. Apply saved color on load
  const savedColor = localStorage.getItem(STORAGE_KEY);
  if (savedColor) {
    applyColor(savedColor);
  }

  // 2. Render color picker if on the settings page
  const pickerContainer = document.getElementById('accent-color-picker');
  if (pickerContainer) {
    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'color-picker-grid';

    // Populate swatches
    accents.forEach(accent => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = accent.hex;
      swatch.title = accent.name;
      
      // Check if this is the active color
      const currentActive = savedColor || accents[0].hex;
      if (currentActive.toLowerCase() === accent.hex.toLowerCase()) {
        swatch.classList.add('active');
      }

      swatch.addEventListener('click', () => {
        // Update storage and apply
        localStorage.setItem(STORAGE_KEY, accent.hex);
        applyColor(accent.hex);
        
        // Update active states in UI
        document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
        swatch.classList.add('active');
      });

      grid.appendChild(swatch);
    });

    pickerContainer.appendChild(grid);
  }
});
