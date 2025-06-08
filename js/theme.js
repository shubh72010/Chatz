// Theme Management
const ThemeManager = {
  // Theme names and their corresponding classes
  themes: {
    nothing: 'theme-nothing',
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
    
    // Validate theme exists
    if (!this.themes[currentTheme]) {
      console.warn(`Theme "${currentTheme}" not found, using "nothing" theme`);
      currentTheme = 'nothing';
    }
    
    // Remove all theme classes safely
    const currentClasses = Array.from(document.documentElement.classList);
    currentClasses.forEach(className => {
      if (className.startsWith('theme-')) {
        document.documentElement.classList.remove(className);
      }
    });
    
    // Apply new theme class
    const themeClass = this.themes[currentTheme];
    if (themeClass && typeof themeClass === 'string' && themeClass.trim()) {
      document.documentElement.classList.add(themeClass);
    }
    
    // Save to localStorage
    localStorage.setItem('chatzTheme', currentTheme);
  },

  // Apply font to document
  applyFont(font) {
    // Validate font exists
    if (!this.fonts[font]) {
      console.warn(`Font "${font}" not found, using "ntype" font`);
      font = 'ntype';
    }
    
    // Remove all font classes safely
    const currentClasses = Array.from(document.documentElement.classList);
    currentClasses.forEach(className => {
      if (className.startsWith('font-')) {
        document.documentElement.classList.remove(className);
      }
    });
    
    // Apply new font class
    const fontClass = this.fonts[font];
    if (fontClass && typeof fontClass === 'string' && fontClass.trim()) {
      document.documentElement.classList.add(fontClass);
    }
    
    // Save to localStorage
    localStorage.setItem('chatzFont', font);
  },

  // Initialize theme and font
  init() {
    try {
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
    } catch (error) {
      console.error('Error initializing theme:', error);
      // Fallback to default theme
      this.applyTheme('nothing');
      this.applyFont('ntype');
    }
  }
};

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
}); 