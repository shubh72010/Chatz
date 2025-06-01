// Theme Manager for Chatz
const themes = {
    light: {
        primary: '#ffffff',
        secondary: '#f5f5f5',
        text: '#333333',
        accent: '#2196f3',
        border: '#e0e0e0',
        shadow: 'rgba(0, 0, 0, 0.1)',
        messageOwn: '#e3f2fd',
        messageOther: '#f5f5f5',
        inputBg: '#ffffff',
    },
    purple: {
        primary: '#f3e5f5',
        secondary: '#e1bee7',
        text: '#4a148c',
        accent: '#9c27b0',
        border: '#ce93d8',
        shadow: 'rgba(156, 39, 176, 0.1)',
        messageOwn: '#e1bee7',
        messageOther: '#f3e5f5',
        inputBg: '#ffffff',
    },
    dark: {
        primary: '#1a1a1a',
        secondary: '#2d2d2d',
        text: '#ffffff',
        accent: '#bb86fc',
        border: '#404040',
        shadow: 'rgba(0, 0, 0, 0.3)',
        messageOwn: '#4a4a4a',
        messageOther: '#2d2d2d',
        inputBg: '#333333',
    }
};

let themeInterval = null;
let currentTheme = null;

function getCurrentTheme() {
    try {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 13) {
            return 'light';
        } else if (hour >= 13 && hour < 20) {
            return 'purple';
        } else {
            return 'dark';
        }
    } catch (error) {
        console.error('Error getting current theme:', error);
        return 'light'; // Fallback to light theme
    }
}

function applyTheme(themeName) {
    try {
        if (!themes[themeName]) {
            console.error(`Theme "${themeName}" not found, falling back to light theme`);
            themeName = 'light';
        }

        const theme = themes[themeName];
        const root = document.documentElement;
        
        if (!root) {
            throw new Error('Document root element not found');
        }

        // Only apply theme if it's different from current
        if (currentTheme !== themeName) {
            root.style.setProperty('--primary-bg', theme.primary);
            root.style.setProperty('--secondary-bg', theme.secondary);
            root.style.setProperty('--text-color', theme.text);
            root.style.setProperty('--accent-color', theme.accent);
            root.style.setProperty('--border-color', theme.border);
            root.style.setProperty('--shadow-color', theme.shadow);
            root.style.setProperty('--message-own-bg', theme.messageOwn);
            root.style.setProperty('--message-other-bg', theme.messageOther);
            root.style.setProperty('--input-bg', theme.inputBg);
            
            currentTheme = themeName;
            
            // Dispatch theme change event
            window.dispatchEvent(new CustomEvent('themechange', { 
                detail: { theme: themeName }
            }));
        }
    } catch (error) {
        console.error('Error applying theme:', error);
        // Try to apply light theme as fallback
        if (themeName !== 'light') {
            applyTheme('light');
        }
    }
}

function initThemeManager() {
    try {
        // Clear any existing interval
        if (themeInterval) {
            clearInterval(themeInterval);
        }

        // Apply theme immediately
        applyTheme(getCurrentTheme());
        
        // Check and update theme every minute
        themeInterval = setInterval(() => {
            applyTheme(getCurrentTheme());
        }, 60000);

        // Add cleanup on page unload
        window.addEventListener('unload', () => {
            if (themeInterval) {
                clearInterval(themeInterval);
            }
        });

        return true;
    } catch (error) {
        console.error('Error initializing theme manager:', error);
        return false;
    }
}

// Export functions
window.themeManager = {
    getCurrentTheme,
    applyTheme,
    initThemeManager,
    // Add method to get current theme object
    getThemeColors: (themeName) => themes[themeName] || themes.light
}; 
