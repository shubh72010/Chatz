// Theme Management
function getTimeBasedTheme() {
  const hour = new Date().getHours();
  
  // 6:00 to 14:00 - Light mode
  if (hour >= 6 && hour < 14) {
    return 'light';
  }
  // 14:00 to 20:00 - Purple mode (default)
  else if (hour >= 14 && hour < 20) {
    return 'default';
  }
  // 20:00 to 6:00 - Dark mode
  else {
    return 'dark';
  }
}

function applyTheme(theme) {
  // Remove all theme classes first
  document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-nothing');
  
  // Apply the new theme class
  if (theme === 'nothing') {
    document.documentElement.classList.add('theme-nothing');
  } else if (theme === 'dark') {
    document.documentElement.classList.add('theme-dark');
  } else if (theme === 'light') {
    document.documentElement.classList.add('theme-light');
  }
  // Default theme doesn't need a class

  // Apply font family
  const fontFamily = localStorage.getItem('chatzFont') || 'ntype';
  document.documentElement.classList.remove('font-ntype', 'font-ndot');
  document.documentElement.classList.add('font-' + fontFamily);
}

// Initialize theme and font
function initializeTheme() {
  // Set Nothing theme as default if no theme is set
  const savedTheme = localStorage.getItem('chatzTheme') || 'nothing';
  const savedFont = localStorage.getItem('chatzFont') || 'ntype';
  
  // Apply theme and font
  applyTheme(savedTheme);
  document.documentElement.classList.add('font-' + savedFont);

  // Update radio buttons if they exist
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === savedTheme;
  });

  const fontRadios = document.querySelectorAll('input[name="font"]');
  fontRadios.forEach(radio => {
    radio.checked = radio.value === savedFont;
  });

  // Add event listeners to theme radios if they exist
  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      localStorage.setItem('chatzTheme', e.target.value);
      applyTheme(e.target.value);
    });
  });

  // Add event listeners to font radios if they exist
  fontRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      localStorage.setItem('chatzFont', e.target.value);
      document.documentElement.classList.remove('font-ntype', 'font-ndot');
      document.documentElement.classList.add('font-' + e.target.value);
    });
  });
}

// Update theme every minute only if auto is selected
setInterval(() => {
  const currentTheme = localStorage.getItem('chatzTheme') || 'nothing';
  if (currentTheme === 'auto') {
    applyTheme(getTimeBasedTheme());
  }
}, 60000);

// Listen for theme changes in other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'chatzTheme') {
    const theme = e.newValue || 'nothing';
    applyTheme(theme);
  } else if (e.key === 'chatzFont') {
    const font = e.newValue || 'ntype';
    document.documentElement.classList.remove('font-ntype', 'font-ndot');
    document.documentElement.classList.add('font-' + font);
  }
});

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);

// Export functions for use in other modules
export { applyTheme, getTimeBasedTheme, initializeTheme }; 