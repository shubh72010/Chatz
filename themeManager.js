// Theme Manager for Chatz
const themes = {
    light: {
        main: '#7b5cff',
        mainDark: '#5a3ec8',
        mainLight: '#b3aaff',
        bg: '#f4f6fb',
        bgLight: '#fff',
        bgGradient: 'linear-gradient(135deg, #e9e6ff 0%, #f4f6fb 100%)',
        bubbleOwn: '#7b5cff',
        bubbleOther: '#e9e6ff',
        bubbleOwnText: '#fff',
        bubbleOtherText: '#23272f',
        headerBg: '#fff',
        headerShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
        inputBg: '#f4f6fb',
        inputBorder: '#b3aaff',
        replyBg: '#e9e6ff',
        replyBorder: '#7b5cff',
        scrollbarThumb: '#b3aaff',
        scrollbarTrack: '#f4f6fb'
    },
    purple: {
        main: '#726dff',
        mainDark: '#554fa6',
        mainLight: '#a3a0ff',
        bg: '#23272f',
        bgLight: '#2e323c',
        bgGradient: 'linear-gradient(135deg, #726dff 0%, #554fa6 100%)',
        bubbleOwn: '#726dff',
        bubbleOther: '#2e323c',
        bubbleOwnText: '#fff',
        bubbleOtherText: '#e6e6fa',
        headerBg: '#23272f',
        headerShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
        inputBg: '#292d36',
        inputBorder: '#44415e',
        replyBg: '#554fa6',
        replyBorder: '#a3a0ff',
        scrollbarThumb: '#726dff55',
        scrollbarTrack: '#23272f'
    },
    dark: {
        main: '#23272f',
        mainDark: '#181b20',
        mainLight: '#44415e',
        bg: '#181b20',
        bgLight: '#23272f',
        bgGradient: 'linear-gradient(135deg, #181b20 0%, #23272f 100%)',
        bubbleOwn: '#44415e',
        bubbleOther: '#23272f',
        bubbleOwnText: '#fff',
        bubbleOtherText: '#e6e6fa',
        headerBg: '#181b20',
        headerShadow: '0 2px 12px 0 rgba(0,0,0,0.15)',
        inputBg: '#23232f',
        inputBorder: '#44415e',
        replyBg: '#23272f',
        replyBorder: '#726dff',
        scrollbarThumb: '#44415e',
        scrollbarTrack: '#181b20'
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
            root.style.setProperty('--main', theme.main);
            root.style.setProperty('--main-dark', theme.mainDark);
            root.style.setProperty('--main-light', theme.mainLight);
            root.style.setProperty('--bg', theme.bg);
            root.style.setProperty('--bg-light', theme.bgLight);
            root.style.setProperty('--bg-gradient', theme.bgGradient);
            root.style.setProperty('--bubble-own', theme.bubbleOwn);
            root.style.setProperty('--bubble-other', theme.bubbleOther);
            root.style.setProperty('--bubble-own-text', theme.bubbleOwnText);
            root.style.setProperty('--bubble-other-text', theme.bubbleOtherText);
            root.style.setProperty('--header-bg', theme.headerBg);
            root.style.setProperty('--header-shadow', theme.headerShadow);
            root.style.setProperty('--input-bg', theme.inputBg);
            root.style.setProperty('--input-border', theme.inputBorder);
            root.style.setProperty('--reply-bg', theme.replyBg);
            root.style.setProperty('--reply-border', theme.replyBorder);
            root.style.setProperty('--scrollbar-thumb', theme.scrollbarThumb);
            root.style.setProperty('--scrollbar-track', theme.scrollbarTrack);
            
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
    getThemeColors: (themeName) => themes[themeName] || themes.light
}; 
