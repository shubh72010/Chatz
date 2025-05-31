// themeManager.js

// Theme time ranges (24-hour format)
const THEME_RANGES = {
  LIGHT: { start: 6, end: 14 },
  PURPLE: { start: 14, end: 20 },
  DARK: { start: 20, end: 6 }
};

// Theme transition duration
const TRANSITION_DURATION = '0.5s';

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

// Get next theme change time
function getNextThemeChange() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= THEME_RANGES.LIGHT.start && hour < THEME_RANGES.LIGHT.end) {
    return new Date(now.setHours(THEME_RANGES.PURPLE.start, 0, 0, 0));
  } else if (hour >= THEME_RANGES.PURPLE.start && hour < THEME_RANGES.PURPLE.end) {
    return new Date(now.setHours(THEME_RANGES.DARK.start, 0, 0, 0));
  } else {
    // If we're in dark theme, next change is light theme tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.setHours(THEME_RANGES.LIGHT.start, 0, 0, 0));
  }
}

// Initialize theme
function initTheme() {
  // Add transition styles to document
  const style = document.createElement('style');
  style.textContent = `
    body, .settings-card, header, select, input, button {
      transition: all ${TRANSITION_DURATION} ease-in-out !important;
    }
  `;
  document.head.appendChild(style);

  // Get saved theme preference
  const savedTheme = localStorage.getItem('chatzTheme');
  
  // If theme is set to auto (day-night cycle)
  if (savedTheme === 'auto') {
    applyTheme(getCurrentTheme());
    startThemeTimer();
  } else {
    // Apply saved theme or default to purple
    applyTheme(savedTheme || 'default');
  }
}

// Start theme timer
function startThemeTimer() {
  // Initial check
  applyTheme(getCurrentTheme());
  
  // Calculate time until next theme change
  const nextChange = getNextThemeChange();
  const timeUntilChange = nextChange.getTime() - Date.now();
  
  // Schedule next theme change
  setTimeout(() => {
    applyTheme(getCurrentTheme());
    // Restart timer for next change
    startThemeTimer();
  }, timeUntilChange);
  
  // Also check every minute (as backup)
  setInterval(() => {
    applyTheme(getCurrentTheme());
  }, 60000);
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
    startThemeTimer();
  } else {
    applyTheme(theme);
  }
}

// Get current theme info
function getThemeInfo() {
  const currentTheme = getCurrentTheme();
  const nextChange = getNextThemeChange();
  const timeUntilChange = nextChange.getTime() - Date.now();
  
  return {
    current: currentTheme,
    next: nextChange,
    timeRemaining: timeUntilChange
  };
}

// Export functions
export {
  initTheme,
  saveTheme,
  getCurrentTheme,
  getThemeInfo
};
