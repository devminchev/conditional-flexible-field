// Debug utility for runtime logging control
const DEBUG_KEY = 'contentful-app-debug';

let debugEnabled = false;

// Initialize debug state from sessionStorage on load
const initializeDebugState = (): void => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
            const stored = sessionStorage.getItem(DEBUG_KEY);
            debugEnabled = stored === 'true';
            if (debugEnabled) {
                console.log('🐛 Debug logging restored from session');
            }
        } catch (error) {
            // SessionStorage might not be available, fallback to false
            debugEnabled = false;
        }
    }
};

export const isDebugEnabled = (): boolean => debugEnabled;

export const enableDebug = (): void => {
    debugEnabled = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
            sessionStorage.setItem(DEBUG_KEY, 'true');
        } catch (error) {
            // Ignore storage errors
        }
    }
    console.log('🐛 Debug logging enabled for Contentful app');
};

export const disableDebug = (): void => {
    debugEnabled = false;
    if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
            sessionStorage.removeItem(DEBUG_KEY);
        } catch (error) {
            // Ignore storage errors
        }
    }
    console.log('🔇 Debug logging disabled for Contentful app');
};

export const debugLog = (message: string, ...args: any[]): void => {
    if (isDebugEnabled()) {
        console.log(message, ...args);
    }
};

export const debugGroup = (label: string, fn: () => void): void => {
    if (isDebugEnabled()) {
        console.group(label);
        fn();
        console.groupEnd();
    }
};

// Initialize debug state on module load
initializeDebugState();

// Expose debug controls globally for console access
if (typeof window !== 'undefined') {
    (window as any).contentfulDebug = {
        enable: enableDebug,
        disable: disableDebug,
        status: () => console.log(`Debug logging is ${debugEnabled ? 'enabled' : 'disabled'}`),
        help: () => {
            console.log(`
🐛 Contentful App Debug Controls:
- contentfulDebug.enable()  - Enable debug logging
- contentfulDebug.disable() - Disable debug logging  
- contentfulDebug.status()  - Check current status
- contentfulDebug.help()    - Show this help

Debug state persists for the browser session.
            `);
        }
    };
} 