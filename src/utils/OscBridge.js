/**
 * OscBridge - Handles OSC communication between the web application and SuperCollider
 * 
 * This class manages sending OSC messages to SuperCollider when journal entries are selected,
 * transmitting emotion values that control the algorithmic music generation.
 * 
 * Uses WebSocket for browser compatibility instead of direct UDP connections.
 */

class OscBridge {
  constructor() {
    this.connected = false;
    this.socket = null;
    this.wsUrl = "ws://localhost:8080"; // WebSocket server URL
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    // Initialize connection
    this.connect();
  }
  
  /**
   * Connect to WebSocket OSC bridge
   * @returns {Promise<boolean>} True if connection successful, false otherwise
   */
  async connect() {
    if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('OscBridge: Already connected');
      return true;
    }
    
    return new Promise((resolve) => {
      try {
        this.connectionAttempts++;
        console.log(`OscBridge: Attempting to connect to WebSocket OSC bridge (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        
        // Create WebSocket connection
        this.socket = new WebSocket(this.wsUrl);
        
        // Set up event listeners
        this.socket.onopen = () => {
          console.log(`OscBridge: Successfully connected to WebSocket OSC bridge`);
          this.connected = true;
          this.connectionAttempts = 0;
          
          // Send a test message
          this.sendTestMessage();
          
          resolve(true);
        };
        
        this.socket.onclose = () => {
          console.log('OscBridge: WebSocket connection closed');
          this.connected = false;
          
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            console.log('OscBridge: Will retry connection after delay...');
            setTimeout(() => this.connect(), 2000);
          }
          
          resolve(false);
        };
        
        this.socket.onerror = (error) => {
          console.error("OscBridge: WebSocket error:", error);
          this.connected = false;
          resolve(false);
        };
        
      } catch (error) {
        console.error('OscBridge: Failed to connect to WebSocket OSC bridge:', error);
        
        this.connected = false;
        
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          console.log('OscBridge: Will retry connection...');
          setTimeout(() => this.connect(), 2000);
        } else {
          console.error('OscBridge: Max connection attempts reached, giving up');
        }
        
        resolve(false);
      }
    });
  }
  
  /**
   * Send a test message to SuperCollider
   */
  sendTestMessage() {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    console.log('OscBridge: Sending test message to SuperCollider');
    
    // Create message with low values to avoid unwanted sounds
    const message = {
      address: "/warhol/entry/emotions",
      values: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    };
    
    this.socket.send(JSON.stringify(message));
  }
  
  /**
   * Send emotion values for a journal entry to SuperCollider
   * @param {Object} emotions - Object containing emotion values (0-1)
   * @returns {boolean} True if message sent successfully, false otherwise
   */
  sendEmotionValues(emotions) {
    // If not connected, try to reconnect but return false for this attempt
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('OscBridge: Cannot send emotions - not connected');
      this.connect();
      return false;
    }
    
    try {
      // Validate emotions object
      if (!emotions || typeof emotions !== 'object') {
        console.error('OscBridge: Invalid emotions object:', emotions);
        return false;
      }
      
      // Extract emotion values in the correct order
      const values = [
        parseFloat(emotions.joy || 0),
        parseFloat(emotions.trust || 0),
        parseFloat(emotions.fear || 0),
        parseFloat(emotions.surprise || 0),
        parseFloat(emotions.sadness || 0), 
        parseFloat(emotions.disgust || 0),
        parseFloat(emotions.anger || 0),
        parseFloat(emotions.anticipation || 0)
      ];
      
      // Check if all values are zero - this might indicate a data problem
      const allZeros = values.every(val => val === 0);
      if (allZeros) {
        console.warn('OscBridge: All emotion values are zero. This may indicate missing data.');
      }
      
      console.log('OscBridge: Sending emotion values to SuperCollider:', values);
      
      // Create message
      const message = {
        address: "/warhol/entry/emotions",
        values: values
      };
      
      // Send through WebSocket
      this.socket.send(JSON.stringify(message));
      
      return true;
    } catch (error) {
      console.error('OscBridge: Failed to send emotion values:', error);
      return false;
    }
  }
  
  /**
   * Send a command to stop all sounds
   * @returns {boolean} True if message sent successfully, false otherwise
   */
  stopAllSounds() {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('OscBridge: Cannot stop sounds - not connected');
      return false;
    }
    
    try {
      console.log('OscBridge: Sending stop command to SuperCollider');
      
      // Create message with all zeros
      const message = {
        address: "/warhol/entry/emotions",
        values: [0, 0, 0, 0, 0, 0, 0, 0]
      };
      
      // Send through WebSocket
      this.socket.send(JSON.stringify(message));
      
      return true;
    } catch (error) {
      console.error('OscBridge: Failed to send stop command:', error);
      return false;
    }
  }
  
  /**
   * Close the OSC connection
   */
  disconnect() {
    if (!this.connected || !this.socket) {
      return;
    }
    
    try {
      console.log('OscBridge: Disconnecting from WebSocket OSC bridge');
      
      // Send all zeros before disconnecting
      this.stopAllSounds();
      
      // Close the socket
      this.socket.close();
      this.connected = false;
      
      console.log('OscBridge: Disconnected from WebSocket OSC bridge');
    } catch (error) {
      console.error('OscBridge: Error while disconnecting:', error);
    }
  }
}

export default OscBridge; 