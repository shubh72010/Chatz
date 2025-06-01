// Simple Error Handler for Chatz
class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxHistoryLength = 50;
    }

    handleError(error, context = '') {
        // Log the error
        console.error(`Error in ${context}:`, error);

        // Add to history
        this.addToHistory({
            error: error.message || error.toString(),
            context,
            timestamp: Date.now()
        });

        // Show user-friendly message
        this.showErrorMessage(error, context);
    }

    addToHistory(errorInfo) {
        this.errorHistory.unshift(errorInfo);
        
        // Keep history at reasonable size
        if (this.errorHistory.length > this.maxHistoryLength) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistoryLength);
        }
    }

    showErrorMessage(error, context) {
        // Create or get error container
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 350px;
                z-index: 10000;
            `;
            document.body.appendChild(errorContainer);
        }

        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.style.cssText = `
            background: #ff4444;
            color: white;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Add error message
        const message = document.createElement('div');
        message.textContent = this.getErrorMessage(error, context);
        errorElement.appendChild(message);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0 0 0 10px;
        `;
        closeButton.onclick = () => errorElement.remove();
        errorElement.appendChild(closeButton);

        // Add to container
        errorContainer.appendChild(errorElement);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode === errorContainer) {
                errorElement.remove();
            }
        }, 5000);
    }

    getErrorMessage(error, context) {
        // Get user-friendly error message
        const message = error.message || error.toString();
        if (message.includes('permission-denied')) {
            return 'You don\'t have permission to perform this action.';
        } else if (message.includes('not-found')) {
            return 'The requested resource was not found.';
        } else if (message.includes('network')) {
            return 'Please check your internet connection.';
        } else if (message.includes('unauthorized')) {
            return 'Please sign in to continue.';
        } else {
            return `Error in ${context}: Please try again.`;
        }
    }

    getErrorHistory() {
        return this.errorHistory;
    }

    clearErrorHistory() {
        this.errorHistory = [];
    }
}

// Export a single instance
const errorHandler = new ErrorHandler();
export default errorHandler;
