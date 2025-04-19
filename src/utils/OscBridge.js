/**
 * OscBridge - Handles OSC communication between the web application and SuperCollider
 * 
 * This class manages sending OSC messages to SuperCollider when journal entries are selected,
 * transmitting emotion values that control the algorithmic music generation.
 */

class OscBridge {
  constructor() {
    this.connected = false;
    this.connection = null;
    this.port = 57121; // Default SuperCollider OSC port
    this.address = '127.0.0.1'; // Local connection
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    // Import osc.js dynamically
    this.loadOscLib();
  }
  
  /**
   * Dynamically import the osc.js library
   * This allows the application to still run if the library fails to load
   */
  async loadOscLib() {
    try {
      // This would use dynamic import in the actual implementation
      // Due to module bundling considerations, we'll need to properly install
      // and import the osc.js library in the final implementation
      console.log('OscBridge: would load osc.js library here');
      
      // For now, just simulate success
      this.oscLoaded = true;
      console.log('OscBridge: OSC library loaded successfully');
      
      // Try to establish connection after loading
      await this.connect();
    } catch (error) {
      console.error('OscBridge: Failed to load OSC library:', error);
      this.oscLoaded = false;
    }
  }
  
  /**
   * Connect to SuperCollider via OSC
   * @returns {Promise<boolean>} True if connection successful, false otherwise
   */
  async connect() {
    if (!this.oscLoaded) {
      console.error('OscBridge: Cannot connect - OSC library not loaded');
      return false;
    }
    
    if (this.connected) {
      console.log('OscBridge: Already connected');
      return true;
    }
    
    try {
      this.connectionAttempts++;
      console.log(`OscBridge: Attempting to connect to SuperCollider (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      
      // In the actual implementation, we would create the OSC connection here
      // For now, simulate a successful connection
      this.connected = true;
      console.log(`OscBridge: Successfully connected to SuperCollider at ${this.address}:${this.port}`);
      
      // Reset connection attempts on success
      this.connectionAttempts = 0;
      
      return true;
    } catch (error) {
      console.error('OscBridge: Failed to connect to SuperCollider:', error);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log('OscBridge: Will retry connection...');
        // In real implementation, add a delay before retry
        setTimeout(() => this.connect(), 2000);
      } else {
        console.error('OscBridge: Max connection attempts reached, giving up');
      }
      
      return false;
    }
  }
  
  /**
   * Send emotion values for a journal entry to SuperCollider
   * @param {Object} emotions - Object containing emotion values (0-1)
   * @returns {boolean} True if message sent successfully, false otherwise
   */
  sendEmotionValues(emotions) {
    if (!this.connected) {
      console.error('OscBridge: Cannot send emotions - not connected');
      // Try to reconnect
      this.connect();
      return false;
    }
    
    try {
      // Extract emotion values in the correct order
      const values = [
        emotions.joy || 0,
        emotions.trust || 0,
        emotions.fear || 0,
        emotions.surprise || 0,
        emotions.sadness || 0, 
        emotions.disgust || 0,
        emotions.anger || 0,
        emotions.anticipation || 0
      ];
      
      console.log('OscBridge: Sending emotion values to SuperCollider:', values);
      
      // In the actual implementation, send the OSC message here
      // This would use the osc.js library's send method
      // For now, just log the values
      console.log(`OscBridge: Would send OSC message to /warhol/entry/emotions with values: ${values.join(', ')}`);
      
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
    if (!this.connected) {
      console.error('OscBridge: Cannot stop sounds - not connected');
      return false;
    }
    
    try {
      console.log('OscBridge: Sending stop command to SuperCollider');
      
      // In the actual implementation, send an OSC message with all zeros
      // or a specific stop command
      // For now, just log the action
      console.log('OscBridge: Would send stop command to SuperCollider');
      
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
    if (!this.connected) {
      return;
    }
    
    try {
      console.log('OscBridge: Disconnecting from SuperCollider');
      
      // In the actual implementation, close the OSC connection
      // For now, just update the state
      this.connected = false;
      
      console.log('OscBridge: Disconnected from SuperCollider');
    } catch (error) {
      console.error('OscBridge: Error while disconnecting:', error);
    }
  }
}

export default OscBridge; 