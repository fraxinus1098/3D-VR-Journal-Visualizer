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
    this.wsUrl = "ws://localhost:8080"; // Default WebSocket server URL
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5; // Increased from 3 to 5 to allow for more retries
    
    // Define alternate URLs to try if the main one fails
    this.alternateUrls = [
      "ws://localhost:8080",    // Standard localhost
      "ws://127.0.0.1:8080",    // IP address version
      "ws://[::1]:8080"         // IPv6 localhost
    ];
    
    // Debug flag - can be enabled from console for more verbose logging
    this.debug = false;
    
    // Make this accessible from console for debugging
    window._oscBridge = this;
    
    // Initialize connection
    this.connect();
    
    console.log('OscBridge: Initialization complete');
    console.log('OscBridge: For debugging, use window._oscBridge in console');
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
        
        // Select URL based on connection attempt
        // Use a rotating strategy to try different URLs
        const urlIndex = (this.connectionAttempts - 1) % this.alternateUrls.length;
        this.wsUrl = this.alternateUrls[urlIndex];
        
        console.log(`OscBridge: Attempting to connect to WebSocket OSC bridge (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        console.log(`OscBridge: Using WebSocket URL: ${this.wsUrl}`);
        
        // Add diagnostic information about the browser's WebSocket support
        console.log('OscBridge: Browser WebSocket support check:');
        console.log('  - WebSocket available:', typeof WebSocket !== 'undefined');
        console.log('  - WebSocket version:', WebSocket.CLOSING !== undefined ? 'Modern' : 'Legacy');
        
        // Create WebSocket connection
        this.socket = new WebSocket(this.wsUrl);
        
        // Add a timeout to detect stalled connections
        const connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
            console.warn('OscBridge: Connection attempt stalled - this may indicate a firewall or network issue');
            console.warn('OscBridge: Check that the bridge server is running and accessible at', this.wsUrl);
            
            // Force close the socket to trigger onclose
            try {
              this.socket.close();
            } catch (e) {
              // Ignore errors during forced close
            }
          }
        }, 3000);
        
        // Set up event listeners
        this.socket.onopen = () => {
          console.log(`OscBridge: Successfully connected to WebSocket OSC bridge`);
          console.log(`OscBridge: Connection state: ${this.socket.readyState} (OPEN=${WebSocket.OPEN})`);
          
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.connectionAttempts = 0;
          
          // Send a test message
          this.sendTestMessage();
          
          resolve(true);
        };
        
        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`OscBridge: WebSocket connection closed with code ${event.code} and reason "${event.reason}"`);
          console.log('OscBridge: Common close codes: 1000=Normal, 1001=GoingAway, 1006=Abnormal, 1011=Server Error');
          
          this.connected = false;
          
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            console.log('OscBridge: Will retry connection after delay...');
            setTimeout(() => this.connect(), 2000);
          } else {
            console.error('OscBridge: Max connection attempts reached, giving up');
            console.error('OscBridge: TROUBLESHOOTING TIPS:');
            console.error('1. Verify bridge server is running with "npm run bridge"');
            console.error('2. Check for any error messages in the bridge server terminal');
            console.error('3. Make sure port 8080 is not blocked by firewall');
            console.error('4. Try restarting the bridge server');
          }
          
          resolve(false);
        };
        
        this.socket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("OscBridge: WebSocket error:", error);
          console.error("OscBridge: Browser error events typically don't provide detailed information");
          console.error("OscBridge: Common issues include:");
          console.error("- Bridge server not running (start with npm run bridge)");
          console.error("- Port 8080 is in use by another application");
          console.error("- Network/firewall blocking WebSocket connections");
          
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
          console.error('OscBridge: Check that the bridge server is running with "npm run bridge"');
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
   * Send a volume control message to SuperCollider
   * @param {number} volume - Volume level (0-1)
   * @returns {boolean} Success status
   */
  sendVolumeControl(volume) {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('OscBridge: Cannot send volume control - not connected');
      return false;
    }
    
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      console.log(`OscBridge: Sending volume control: ${clampedVolume.toFixed(2)}`);
      
      // Create message with volume value
      const message = {
        address: "/warhol/volume",
        values: [clampedVolume]
      };
      
      // Send through WebSocket
      this.socket.send(JSON.stringify(message));
      
      return true;
    } catch (error) {
      console.error('OscBridge: Failed to send volume control:', error);
      return false;
    }
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
      
      // ===== ADDED ENHANCED DEBUGGING =====
      console.log('===== OSC BRIDGE DETAILED EMOTION INSPECTION =====');
      
      // Check if emotions is actually an array
      console.log('Emotions is Array?', Array.isArray(emotions));
      
      // Deep inspection of the emotions object
      console.log('Emotions object structure:', JSON.stringify(emotions));
      console.log('Emotions object prototype:', Object.getPrototypeOf(emotions));
      console.log('Emotions constructor name:', emotions.constructor?.name);
      
      // Check if all expected emotion properties exist
      const expectedEmotions = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];
      const missingEmotions = expectedEmotions.filter(e => !(e in emotions));
      if (missingEmotions.length > 0) {
        console.warn('Missing expected emotions:', missingEmotions);
      }
      
      // Log all properties including non-enumerable ones
      console.log('All properties (including non-enumerable):', Object.getOwnPropertyNames(emotions));
      
      // ===== END ENHANCED DEBUGGING =====
      
      // Detailed validation of emotion values
      console.log('OscBridge: Raw emotion values:');
      Object.entries(emotions).forEach(([emotion, value]) => {
        const parsedValue = parseFloat(value || 0);
        console.log(`  - ${emotion}: ${value} (parsed: ${parsedValue})`);
        if (isNaN(parsedValue)) {
          console.warn(`OscBridge: Invalid emotion value for ${emotion}: ${value}`);
        }
      });
      
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
      
      // Log confirmation
      console.log('OscBridge: Message sent successfully');
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