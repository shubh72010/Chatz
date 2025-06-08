// Theme Management
const ThemeManager = {
  // Theme names and their corresponding classes
  themes: {
    nothing: '',  // Default theme (no class needed)
    dark: 'theme-dark',
    light: 'theme-light'
  },

  // Font options
  fonts: {
    ntype: 'font-ntype',
    ndot: 'font-ndot'
  },

  // Get time-based theme
  getTimeBasedTheme() {
    const hour = new Date().getHours();
    
    // 6:00 to 14:00 - Light mode
    if (hour >= 6 && hour < 14) {
      return 'light';
    }
    // 14:00 to 20:00 - Nothing mode (default)
    else if (hour >= 14 && hour < 20) {
      return 'nothing';
    }
    // 20:00 to 6:00 - Dark mode
    else {
      return 'dark';
    }
  },

  // Apply theme to document
  applyTheme(theme) {
    let currentTheme = theme;
    
    // If no theme provided or theme is 'auto', use time-based theme
    if (!currentTheme || currentTheme === 'auto') {
      currentTheme = this.getTimeBasedTheme();
    }
    
    // Remove all theme classes
    Object.values(this.themes).forEach(themeClass => {
      document.documentElement.classList.remove(themeClass);
    });
    
    // Apply new theme class if not default
    if (this.themes[currentTheme]) {
      document.documentElement.classList.add(this.themes[currentTheme]);
    }
    
    // Save to localStorage
    localStorage.setItem('chatzTheme', currentTheme);
  },

  // Apply font to document
  applyFont(font) {
    // Remove all font classes
    Object.values(this.fonts).forEach(fontClass => {
      document.documentElement.classList.remove(fontClass);
    });
    
    // Apply new font class
    if (this.fonts[font]) {
      document.documentElement.classList.add(this.fonts[font]);
    }
    
    // Save to localStorage
    localStorage.setItem('chatzFont', font);
  },

  // Initialize theme and font
  init() {
    // Get saved preferences or use defaults
    const savedTheme = localStorage.getItem('chatzTheme') || 'nothing';
    const savedFont = localStorage.getItem('chatzFont') || 'ntype';
    
    // Apply saved preferences
    this.applyTheme(savedTheme);
    this.applyFont(savedFont);
    
    // Set up auto theme updates
    if (savedTheme === 'auto') {
      setInterval(() => {
        if (localStorage.getItem('chatzTheme') === 'auto') {
          this.applyTheme('auto');
        }
      }, 60000); // Check every minute
    }
    
    // Listen for theme changes in other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatzTheme') {
        this.applyTheme(e.newValue);
      } else if (e.key === 'chatzFont') {
        this.applyFont(e.newValue);
      }
    });
  }
};

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
}); 