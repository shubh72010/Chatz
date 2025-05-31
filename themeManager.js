 // themeManager.js

// Theme time ranges (24-hour format)
const THEME_RANGES = {
    LIGHT: { start: 6, end: 14 },
    PURPLE: { start: 14, end: 20 },
    DARK: { start: 20, end: 6 }
  };
  
  // Get current theme based on time
  function getCurrentTheme() {
    const hour = new Date().getHours();
    
    if (hour >= THEME_RANGES.LIGHT.start && hour < THEME_RANGES.LIGHT.end) {
      return 'light';
    } else if (hour >= THEME_RANGES.PURPLE.start && hour < THEME_RANGES.PURPLE.end) {
      return 'default'; // Purple theme
    } else {
      return 'dark';
    }
  }
  
  // Initialize theme
  function initTheme() {
    // Get saved theme preference
    const savedTheme = localStorage.getItem('chatzTheme');
    
    // If theme is set to auto (day-night cycle)
    if (savedTheme === 'auto') {
      applyTheme(getCurrentTheme());
      // Check every minute for theme changes
      setInterval(() => {
        applyTheme(getCurrentTheme());
      }, 60000); // 60000ms = 1 minute
    } else {
      // Apply saved theme or default to purple
      applyTheme(savedTheme || 'default');
    }
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.className = 'theme-' + theme;
  }
  
  // Save theme preference
  function saveTheme(theme) {
    localStorage.setItem('chatzTheme', theme);
    if (theme === 'auto') {
      applyTheme(getCurrentTheme());
      // Start checking for time-based changes
      initTheme();
    } else {
      applyTheme(theme);
    }
  }
  
  // Export functions
  export {
    initTheme,
    saveTheme,
    getCurrentTheme
  };
