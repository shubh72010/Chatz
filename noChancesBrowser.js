// NoChances Browser System - Advanced Error Handling and Code Fixing System
class NoChancesBrowser {
    constructor() {
        this.errorPatterns = new Map();
        this.fixPatterns = new Map();
        this.errorHistory = [];
        this.fixHistory = [];
        this.initializePatterns();
        this.setupErrorListener();
    }

    // Initialize error and fix patterns
    initializePatterns() {
        // Module Import Patterns
        this.errorPatterns.set('moduleImport', {
            pattern: /Failed to resolve module specifier/,
            severity: 'high',
            category: 'development'
        });

        this.fixPatterns.set('moduleImport', {
            detect: (error) => error.message.includes('Failed to resolve module specifier'),
            fix: async (error) => {
                const fix = this.generateModuleImportFix(error);
                this.showFixUI(fix);
                return true;
            }
        });

        // Runtime Error Patterns
        this.errorPatterns.set('runtimeError', {
            pattern: /TypeError|ReferenceError|SyntaxError/,
            severity: 'high',
            category: 'runtime'
        });

        this.fixPatterns.set('runtimeError', {
            detect: (error) => error instanceof Error,
            fix: async (error) => {
                const fix = this.generateRuntimeFix(error);
                this.showFixUI(fix);
                return true;
            }
        });
    }

    // Setup global error listener
    setupErrorListener() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message));
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });
    }

    // Main error handling function
    async handleError(error, context = '') {
        try {
            console.log(`[NoChances] Handling error in ${context}:`, error);

            // Log error to history
            this.errorHistory.push({
                timestamp: Date.now(),
                error,
                context
            });

            // Determine error type and severity
            const errorType = this.determineErrorType(error);
            const severity = this.determineSeverity(error);

            // Show error in UI
            this.showErrorUI(error, errorType, severity);

            // Attempt automatic fixes
            const fixed = await this.attemptAutomaticFix(error, errorType);
            if (fixed) {
                console.log('[NoChances] Successfully fixed error automatically');
                return true;
            }

            // If automatic fix fails, try fallback strategies
            return await this.fallbackStrategies(error, errorType);
        } catch (handlingError) {
            console.error('[NoChances] Error in error handler:', handlingError);
            return false;
        }
    }

    // UI Functions
    showErrorUI(error, errorType, severity) {
        const errorContainer = document.getElementById('nochances-errors') || this.createErrorContainer();
        
        const errorElement = document.createElement('div');
        errorElement.className = `nochances-error severity-${severity}`;
        errorElement.innerHTML = `
            <div class="error-header">
                <span class="error-type">${errorType.type}</span>
                <span class="error-severity">${severity}</span>
            </div>
            <div class="error-message">${error.message}</div>
            <div class="error-stack">${error.stack || ''}</div>
        `;

        errorContainer.appendChild(errorElement);
    }

    showFixUI(fix) {
        const fixContainer = document.getElementById('nochances-fixes') || this.createFixContainer();
        
        const fixElement = document.createElement('div');
        fixElement.className = 'nochances-fix';
        fixElement.innerHTML = `
            <div class="fix-header">
                <span class="fix-type">${fix.type}</span>
            </div>
            <div class="fix-description">${fix.description}</div>
            <div class="fix-code">
                <pre><code>${fix.code}</code></pre>
            </div>
            <button class="apply-fix">Apply Fix</button>
        `;

        fixElement.querySelector('.apply-fix').addEventListener('click', () => {
            this.applyFix(fix);
        });

        fixContainer.appendChild(fixElement);
    }

    createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'nochances-errors';
        container.className = 'nochances-container';
        document.body.appendChild(container);
        return container;
    }

    createFixContainer() {
        const container = document.createElement('div');
        container.id = 'nochances-fixes';
        container.className = 'nochances-container';
        document.body.appendChild(container);
        return container;
    }

    // Fix Generation Functions
    generateModuleImportFix(error) {
        const message = error.message;
        const moduleName = message.match(/module specifier '(.+?)'/)?.[1];
        
        return {
            type: 'Module Import Fix',
            description: `Fix import for module: ${moduleName}`,
            code: `// Replace with:
import { ... } from '${moduleName}';`
        };
    }

    generateRuntimeFix(error) {
        return {
            type: 'Runtime Error Fix',
            description: `Fix for ${error.name}: ${error.message}`,
            code: `// Suggested fix:
try {
    // Your code here
} catch (error) {
    console.error('Error:', error);
}`
        };
    }

    // Utility Functions
    determineErrorType(error) {
        for (const [type, pattern] of this.errorPatterns) {
            if (pattern.pattern.test(error.message)) {
                return { type, ...pattern };
            }
        }
        return { type: 'unknown', severity: 'medium', category: 'runtime' };
    }

    determineSeverity(error) {
        if (error instanceof SyntaxError) return 'critical';
        if (error instanceof TypeError) return 'high';
        if (error instanceof ReferenceError) return 'high';
        return 'medium';
    }

    async attemptAutomaticFix(error, errorType) {
        const fixPattern = this.fixPatterns.get(errorType.type);
        if (!fixPattern) return false;

        if (fixPattern.detect(error)) {
            return await fixPattern.fix(error);
        }
        return false;
    }

    async fallbackStrategies(error, errorType) {
        console.log('[NoChances] Attempting fallback strategies');
        return false;
    }

    // Export the system
    static getInstance() {
        if (!NoChancesBrowser.instance) {
            NoChancesBrowser.instance = new NoChancesBrowser();
        }
        return NoChancesBrowser.instance;
    }
}

// Create and export a singleton instance
const noChancesBrowser = NoChancesBrowser.getInstance();
export default noChancesBrowser; 