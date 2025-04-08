/**
 * Manages system notifications with efficient reuse of DOM elements
 */
export default class Notifications {
  constructor(options = {}) {
    this.options = Object.assign({
      duration: 5000,         // Default duration in ms
      position: {
        top: '20px',
        left: '50%'
      },
      styles: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        zIndex: '1000',
        fontSize: '14px',
        transition: 'opacity 1s ease'
      }
    }, options);
    
    this.notificationElement = null;
    this.timeout = null;
  }
  
  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {Object} options - Optional override settings for this notification
   */
  show(message, options = {}) {
    const settings = { ...this.options, ...options };
    
    // Create or reuse notification element
    if (!this.notificationElement) {
      this.notificationElement = document.createElement('div');
      this.notificationElement.id = 'system-notification';
      
      // Apply position styles
      this.notificationElement.style.position = 'fixed';
      this.notificationElement.style.top = settings.position.top;
      this.notificationElement.style.left = settings.position.left;
      this.notificationElement.style.transform = 'translateX(-50%)';
      
      // Apply appearance styles
      Object.entries(settings.styles).forEach(([prop, value]) => {
        this.notificationElement.style[prop] = value;
      });
      
      document.body.appendChild(this.notificationElement);
    }
    
    // Clear any existing timeout to prevent multiple fades
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    // Update message and show notification
    this.notificationElement.textContent = message;
    this.notificationElement.style.opacity = '1';
    
    // Hide notification after specified duration
    this.timeout = setTimeout(() => {
      this.notificationElement.style.opacity = '0';
    }, settings.duration);
  }
  
  /**
   * Show a success notification (green)
   * @param {string} message - The message to display
   */
  success(message) {
    this.show(message, {
      styles: {
        backgroundColor: 'rgba(0, 128, 0, 0.8)'
      }
    });
  }
  
  /**
   * Show an error notification (red)
   * @param {string} message - The message to display 
   */
  error(message) {
    this.show(message, {
      styles: {
        backgroundColor: 'rgba(220, 0, 0, 0.8)'
      },
      duration: 8000 // Show errors longer
    });
  }
  
  /**
   * Show a warning notification (yellow/orange)
   * @param {string} message - The message to display
   */
  warning(message) {
    this.show(message, {
      styles: {
        backgroundColor: 'rgba(255, 165, 0, 0.8)',
        color: 'black'
      }
    });
  }
  
  /**
   * Show a notification that won't fade automatically
   * @param {string} message - The message to display
   * @returns {Function} - Function to call to dismiss the notification
   */
  persistent(message) {
    // Show the notification but don't set a timeout
    this.show(message);
    
    // Clear the auto-hide timeout
    clearTimeout(this.timeout);
    this.timeout = null;
    
    // Return a function that can be called to dismiss the notification
    return () => {
      if (this.notificationElement) {
        this.notificationElement.style.opacity = '0';
      }
    };
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.notificationElement && this.notificationElement.parentNode) {
      this.notificationElement.parentNode.removeChild(this.notificationElement);
      this.notificationElement = null;
    }
  }
} 