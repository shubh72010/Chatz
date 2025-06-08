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
    try {
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

      // Get the root element
      const root = document.documentElement;
      if (!root || !root.classList) {
        console.error('Root element or classList not available');
        return;
      }
      
      // Debug current classes
      console.log('Current classes:', Array.from(root.classList));
      
      // Remove theme classes one by one with validation
      const themeClasses = Object.values(this.themes).filter(Boolean);
      themeClasses.forEach(themeClass => {
        try {
          if (themeClass && typeof themeClass === 'string' && themeClass.trim()) {
            if (root.classList.contains(themeClass)) {
              root.classList.remove(themeClass);
            }
          }
        } catch (err) {
          console.warn(`Failed to remove theme class ${themeClass}:`, err);
        }
      });
      
      // Apply new theme class with validation
      const themeClass = this.themes[currentTheme];
      if (themeClass && typeof themeClass === 'string' && themeClass.trim()) {
        try {
          root.classList.add(themeClass);
          console.log('Applied theme class:', themeClass);
        } catch (err) {
          console.error('Failed to add theme class:', err);
        }
      }
      
      // Save to localStorage
      localStorage.setItem('chatzTheme', currentTheme);
    } catch (error) {
      console.error('Error in applyTheme:', error);
      // Fallback to nothing theme
      try {
        document.documentElement.classList.add('theme-nothing');
      } catch (err) {
        console.error('Failed to apply fallback theme:', err);
      }
    }
  },

  // Apply font to document
  applyFont(font) {
    try {
      // Validate font exists
      if (!this.fonts[font]) {
        console.warn(`Font "${font}" not found, using "ntype" font`);
        font = 'ntype';
      }
      
      // Get the root element
      const root = document.documentElement;
      if (!root || !root.classList) {
        console.error('Root element or classList not available');
        return;
      }
      
      // Remove font classes one by one with validation
      const fontClasses = Object.values(this.fonts).filter(Boolean);
      fontClasses.forEach(fontClass => {
        try {
          if (fontClass && typeof fontClass === 'string' && fontClass.trim()) {
            if (root.classList.contains(fontClass)) {
              root.classList.remove(fontClass);
            }
          }
        } catch (err) {
          console.warn(`Failed to remove font class ${fontClass}:`, err);
        }
      });
      
      // Apply new font class with validation
      const fontClass = this.fonts[font];
      if (fontClass && typeof fontClass === 'string' && fontClass.trim()) {
        try {
          root.classList.add(fontClass);
          console.log('Applied font class:', fontClass);
        } catch (err) {
          console.error('Failed to add font class:', err);
        }
      }
      
      // Save to localStorage
      localStorage.setItem('chatzFont', font);
    } catch (error) {
      console.error('Error in applyFont:', error);
      // Fallback to ntype font
      try {
        document.documentElement.classList.add('font-ntype');
      } catch (err) {
        console.error('Failed to apply fallback font:', err);
      }
    }
  },

  // Initialize theme and font
  init() {
    try {
      console.log('Initializing theme manager...');
      
      // Get saved preferences or use defaults
      const savedTheme = localStorage.getItem('chatzTheme') || 'nothing';
      const savedFont = localStorage.getItem('chatzFont') || 'ntype';
      
      console.log('Saved preferences:', { theme: savedTheme, font: savedFont });
      
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
      
      console.log('Theme manager initialized successfully');
    } catch (error) {
      console.error('Error initializing theme:', error);
      // Fallback to default theme
      try {
        document.documentElement.classList.add('theme-nothing');
        document.documentElement.classList.add('font-ntype');
      } catch (err) {
        console.error('Failed to apply fallback theme and font:', err);
      }
    }
  }
};

// Initialize theme manager when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing theme...');
    ThemeManager.init();
  });
} else {
  console.log('DOM already loaded, initializing theme immediately...');
  ThemeManager.init();
} 