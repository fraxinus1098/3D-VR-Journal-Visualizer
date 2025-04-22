import * as THREE from 'three';
import OscBridge from './OscBridge.js';

/**
 * AudioSystem - Handles audio functionality for the visualization
 * 
 * Features:
 * - Connects to SuperCollider via WebSocket-OSC bridge
 * - Sends emotion data from journal entries to SuperCollider
 * - Provides basic controls (mute, volume)
 */
class AudioSystem {
  constructor() {
    // OSC communication bridge with SuperCollider
    this.oscBridge = new OscBridge();
    
    // Audio state
    this.initialized = false;
    this.muted = false;
    
    // Cache for emotion centers (for reference)
    this.emotionCenters = {};
    
    // Last selected entry for replay after unmute
    this.lastSelectedEntry = null;
  }
  
  /**
   * Initialize the audio system
   * @returns {Promise} Promise that resolves when audio is initialized
   */
  async init() {
    if (this.initialized) return Promise.resolve();
    
    try {
      console.log('AudioSystem: Connecting to SuperCollider via WebSocket-OSC bridge...');
      console.log('AudioSystem: Ensure the bridge server is running with "npm run bridge" in a separate terminal');
      
      // Try to connect to SuperCollider via WebSocket-OSC bridge
      try {
        // Wrap with a timeout to prevent blocking if connection fails
        const connectPromise = this.oscBridge.connect();
        
        // Set a timeout for the connection attempt - increased to 5 seconds
        const timeoutPromise = new Promise(resolve => {
          setTimeout(() => {
            console.warn('AudioSystem: WebSocket connection timeout after 5 seconds');
            resolve(false);
          }, 5000); // 5 second timeout (increased from 3s)
        });
        
        // Race the connect promise against the timeout
        const oscConnected = await Promise.race([connectPromise, timeoutPromise]);
        
        console.log('===== OSC CONNECTION STATUS =====');
        console.log('Connected to OSC Bridge:', oscConnected);
        
        if (oscConnected) {
          console.log('AudioSystem: Successfully connected to WebSocket-OSC bridge');
          
          // Send a test message with low values to ensure connection works
          this.sendTestEmotions(0.1);
        } else {
          console.warn('AudioSystem: WebSocket-OSC bridge connection failed or timed out');
          console.warn('IMPORTANT: To enable audio, make sure to:');
          console.warn('1. Run "npm run bridge" in a separate terminal');
          console.warn('2. Have SuperCollider running with warholEmotions.scd loaded');
          console.warn('3. Then reload this page');
        }
      } catch (oscError) {
        console.error('AudioSystem: Error connecting to WebSocket-OSC bridge:', oscError);
        console.error('IMPORTANT: To enable audio, make sure to:');
        console.error('1. Run "npm run bridge" in a separate terminal');
        console.error('2. Have SuperCollider running with warholEmotions.scd loaded');
        console.error('3. Then reload this page');
      }
      
      this.initialized = true;
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
      
      // Even if we fail, mark as initialized to avoid blocking the app
      this.initialized = true;
      return Promise.resolve();
    }
  }
  
  /**
   * Calculate and set emotion centers based on journal entries
   * @param {Array} entries - The journal entries
   */
  calculateEmotionCenters(entries) {
    if (!entries || entries.length === 0) return;
    
    // Initialize emotion groupings
    const emotionGroups = {
      joy: { count: 0, x: 0, y: 0, z: 0 },
      trust: { count: 0, x: 0, y: 0, z: 0 },
      fear: { count: 0, x: 0, y: 0, z: 0 },
      surprise: { count: 0, x: 0, y: 0, z: 0 },
      sadness: { count: 0, x: 0, y: 0, z: 0 },
      disgust: { count: 0, x: 0, y: 0, z: 0 },
      anger: { count: 0, x: 0, y: 0, z: 0 },
      anticipation: { count: 0, x: 0, y: 0, z: 0 }
    };
    
    // Process each entry
    entries.forEach(entry => {
      if (!entry.emotions || !entry.coordinates) return;
      
      // Find dominant emotion
      let dominantEmotion = null;
      let maxValue = -1;
      
      Object.entries(entry.emotions).forEach(([emotion, value]) => {
        if (value > maxValue) {
          maxValue = value;
          dominantEmotion = emotion;
        }
      });
      
      if (dominantEmotion && emotionGroups[dominantEmotion]) {
        // Add to emotion group
        emotionGroups[dominantEmotion].count++;
        emotionGroups[dominantEmotion].x += entry.coordinates.x;
        emotionGroups[dominantEmotion].y += entry.coordinates.y;
        emotionGroups[dominantEmotion].z += entry.coordinates.z;
      }
    });
    
    // Calculate average positions for each emotion
    Object.keys(emotionGroups).forEach(emotion => {
      const group = emotionGroups[emotion];
      
      if (group.count > 0) {
        const position = new THREE.Vector3(
          group.x / group.count,
          group.y / group.count,
          group.z / group.count
        );
        this.emotionCenters[emotion] = position;
      }
    });
    
    console.log('Emotion centers calculated:', this.emotionCenters);
  }
  
  /**
   * Updates audio based on camera position - not needed with SuperCollider but
   * kept as a placeholder for compatibility with existing code
   */
  updateAudioMix() {
    // No implementation needed - SuperCollider handles audio internally
    // This method is kept for compatibility with existing code
  }
  
  /**
   * Initialize audio after user interaction
   * This method ensures we don't block the main application loading sequence
   */
  async initContextAndSounds({ journalEntries, notifications, audioControls }) {
    try {
      // Use a timeout to ensure the application UI is loaded first
      setTimeout(async () => {
        try {
          await this.init();
          
          // Calculate emotion centers for spatial reference
          if (journalEntries && journalEntries.length > 0) {
            this.calculateEmotionCenters(journalEntries);
          }
          
          // We don't need to call setAudioSystem since AudioControls already has a reference
          // from its constructor. Attempting to call the non-existent method causes warnings.
          
          // Show status notification about audio
          if (notifications) {
            if (this.oscBridge && this.oscBridge.connected) {
              notifications.show('SuperCollider audio connected via WebSocket!');
            } else {
              notifications.show('Audio connection failed - requires bridge server');
              
              // Add a delayed second notification explaining how to fix
              setTimeout(() => {
                notifications.show('Run "npm run bridge" in terminal & reload page for audio');
              }, 3000);
              
              // Add a third notification for SuperCollider
              setTimeout(() => {
                notifications.show('Also ensure SuperCollider is running with warholEmotions.scd');
              }, 6000);
            }
          }
        } catch (innerError) {
          console.error('Error during audio initialization:', innerError);
          if (notifications) {
            notifications.show('Audio initialization failed - see console for details');
            
            // Add delayed instructions
            setTimeout(() => {
              notifications.show('For audio: Run "npm run bridge" in terminal & reload page');
            }, 3000);
          }
        }
      }, 100); // short delay to ensure UI loads first
      
      // Return immediately so we don't block loading
      return Promise.resolve(true);
    } catch (error) {
      console.error('Error initializing audio:', error);
      
      // Even if we fail, don't block the application
      return Promise.resolve(false);
    }
  }
  
  /**
   * Send test emotion values to SuperCollider (diagnostic function)
   * @param {number} [intensity=0.7] - Intensity value for test (0-1)
   * @returns {boolean} Success of test
   */
  sendTestEmotions(intensity = 0.7) {
    console.log(`AudioSystem: Sending test emotions with intensity ${intensity}`);
    
    if (!this.initialized) {
      console.error('Cannot send test: Audio system not initialized');
      return false;
    }
    
    // Create test emotions with varying values
    const testEmotions = {
      joy: intensity,
      trust: intensity * 0.8,
      fear: intensity * 0.6,
      surprise: intensity * 0.7,
      sadness: intensity * 0.4,
      disgust: intensity * 0.3,
      anger: intensity * 0.5,
      anticipation: intensity * 0.9
    };
    
    console.log('Test emotion values:', testEmotions);
    
    // Send via OSC bridge
    if (this.oscBridge) {
      console.log('Sending test via OSC bridge');
      return this.oscBridge.sendEmotionValues(testEmotions);
    }
    
    return false;
  }
  
  /**
   * Set the last selected entry for replay after unmuting
   * @param {Object} entry - The journal entry that was selected
   */
  setLastSelectedEntry(entry) {
    this.lastSelectedEntry = entry;
  }
  
  /**
   * Play a selection interaction sound (placeholder for compatibility)
   * No implementation needed with SuperCollider - kept for compatibility
   */
  playSelectSound() {
    // No implementation needed - kept for compatibility with existing code
    console.log('Selection sound triggered (no-op)');
  }
  
  /**
   * Play a hover interaction sound (placeholder for compatibility)
   * No implementation needed with SuperCollider - kept for compatibility
   */
  playHoverSound() {
    // No implementation needed - kept for compatibility with existing code
  }
  
  /**
   * Play entry audio based on emotion values
   * @param {Object} entryData - The journal entry data
   * @returns {boolean} Success of playback initiation
   */
  playEntryAudio(entryData) {
    if (!this.initialized) {
      console.error('Cannot play entry audio: Audio system not initialized');
      return false;
    }
    
    // Check if OSC bridge is actually connected
    if (!this.oscBridge || !this.oscBridge.connected) {
      console.warn('Cannot play entry audio: No connection to OSC bridge');
      console.warn('To enable audio:');
      console.warn('1. Run "npm run bridge" in a separate terminal');
      console.warn('2. Have SuperCollider running with warholEmotions.scd loaded');
      console.warn('3. Reload the page');
      return false;
    }
    
    // Check if we have emotion data
    if (!entryData || !entryData.emotions) {
      console.error('Cannot play entry audio: No emotion data in entry', entryData);
      return false;
    }
    
    // Important: First stop any previous sounds to prevent SuperCollider resource exhaustion
    this.stopAllSounds();
    
    // ===== ADDED DETAILED EMOTION DEBUGGING =====
    console.log('===== DETAILED EMOTION DEBUGGING =====');
    console.log('Entry ID:', entryData.id);
    console.log('Complete entry object:', entryData);
    console.log('Emotions object type:', typeof entryData.emotions);
    console.log('Is emotions an object?', entryData.emotions instanceof Object);
    console.log('Emotions keys:', Object.keys(entryData.emotions));
    
    // Check each expected emotion property
    const expectedEmotions = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];
    console.log('Checking individual emotion properties:');
    let allZeros = true;
    
    expectedEmotions.forEach(emotion => {
      const value = parseFloat(entryData.emotions[emotion] || 0);
      console.log(`- ${emotion}: ${entryData.emotions[emotion]} (parsed: ${value})`);
      
      // Check if at least one value is non-zero
      if (value > 0) {
        allZeros = false;
      }
    });
    
    console.log('All emotion values are zero?', allZeros);
    
    if (allZeros) {
      console.warn('WARNING: All emotion values are zero. This may indicate missing or invalid data.');
      console.warn('Check the journal entry data source and format.');
    }
    // ===== END ADDED DEBUGGING =====
    
    // Skip if muted
    if (this.muted) {
      console.log('Audio is muted, skipping playback');
      // Store for replay when unmuted
      this.lastSelectedEntry = entryData;
      return true;
    }
    
    // Enhanced debugging to trace emotion values
    console.log('===== PLAYING AUDIO FOR ENTRY =====');
    console.log('Entry ID:', entryData.id);
    console.log('Emotion values:', JSON.stringify(entryData.emotions, null, 2));
    
    // Store for replay when unmuted
    this.lastSelectedEntry = entryData;
    
    // Send emotion values via OSC
    if (this.oscBridge) {
      console.log('Sending emotion values to SuperCollider via OSC bridge');
      const success = this.oscBridge.sendEmotionValues(entryData.emotions);
      console.log('OSC send result:', success ? 'SUCCESS' : 'FAILED');
      return success;
    } else {
      console.warn('No OSC bridge available - cannot play audio');
      return false;
    }
  }
  
  /**
   * Toggle muted state of all audio
   * @returns {boolean} The new muted state
   */
  toggleMute() {
    this.muted = !this.muted;
    
    if (this.muted) {
      // Mute audio by sending all zeros
      if (this.oscBridge) {
        this.oscBridge.stopAllSounds();
      }
      console.log('Audio muted');
    } else {
      console.log('Audio unmuted');
      // If there's a selected entry, replay its audio
      if (this.lastSelectedEntry) {
        this.playEntryAudio(this.lastSelectedEntry);
      }
    }
    
    return this.muted;
  }
  
  /**
   * Set volume level - for SuperCollider this sends a volume control message
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    if (!this.initialized) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Send volume control message via OSC
    if (this.oscBridge) {
      this.oscBridge.sendVolumeControl(clampedVolume);
    }
    
    // Update muted state based on volume
    this.muted = (clampedVolume === 0);
  }
  
  /**
   * Get current volume level (placeholder since we can't query SuperCollider)
   * @returns {number} Assumed volume (1.0 if not muted, 0.0 if muted)
   */
  getVolume() {
    return this.muted ? 0.0 : 1.0;
  }
  
  /**
   * Dispose of audio resources
   */
  dispose() {
    // Stop all sounds
    if (this.oscBridge) {
      this.oscBridge.stopAllSounds();
      this.oscBridge.disconnect();
    }
    
    this.initialized = false;
  }
  
  /**
   * Stop all currently playing sounds
   * This helps prevent SuperCollider from running out of resources
   */
  stopAllSounds() {
            if (this.oscBridge && this.oscBridge.connected) {
      console.log('AudioSystem: Stopping all previous sounds before playing new ones');
      this.oscBridge.stopAllSounds();
      
      // Add a small delay to give SuperCollider time to free resources
      // This helps prevent "out of real time memory" errors
      return new Promise(resolve => setTimeout(resolve, 50));
    }
    return Promise.resolve();
  }
  
  /**
   * Sends emotion values to SuperCollider through OSC
   * 
   * @param {Object} emotions - Object containing emotion values
   * @returns {boolean} - True if successful, false if bridge not connected
   */
  sendEmotionValues(emotions) {
    if (!this.oscBridge || !this.oscBridge.connected) {
      console.warn('AudioSystem: Cannot send emotion values - bridge not connected');
      return false;
    }
    
    try {
      // Normalize the emotions object to ensure we get all values regardless of case
      const normalizedEmotions = this.normalizeEmotions(emotions);
      
      // Extract emotion values with proper fallbacks
      const joyValue = normalizedEmotions.joy || 0;
      const sadnessValue = normalizedEmotions.sadness || 0;
      const angerValue = normalizedEmotions.anger || 0;
      const fearValue = normalizedEmotions.fear || 0;
      const disgustValue = normalizedEmotions.disgust || 0;
      const surpriseValue = normalizedEmotions.surprise || 0;
      const anticipationValue = normalizedEmotions.anticipation || 0;
      const trustValue = normalizedEmotions.trust || 0;
      
      // Check for all-zero values which indicates a potential issue
      const sum = joyValue + sadnessValue + angerValue + fearValue + 
                  disgustValue + surpriseValue + anticipationValue + trustValue;
      
      if (sum === 0) {
        console.warn('AudioSystem: All emotion values are zero - this may indicate missing data');
        console.warn('AudioSystem: Original emotions object:', emotions);
        console.warn('AudioSystem: Normalized emotions object:', normalizedEmotions);
      }
      
      // Log the emotion values we're sending
      console.log('AudioSystem: Sending emotion values to SuperCollider:');
      console.log(`  - Joy: ${joyValue.toFixed(2)}`);
      console.log(`  - Sadness: ${sadnessValue.toFixed(2)}`);
      console.log(`  - Anger: ${angerValue.toFixed(2)}`);
      console.log(`  - Fear: ${fearValue.toFixed(2)}`);
      console.log(`  - Disgust: ${disgustValue.toFixed(2)}`);
      console.log(`  - Surprise: ${surpriseValue.toFixed(2)}`);
      console.log(`  - Anticipation: ${anticipationValue.toFixed(2)}`);
      console.log(`  - Trust: ${trustValue.toFixed(2)}`);
      
      // Send the emotion values to SuperCollider via OSC
      const oscMessage = {
        address: "/warhol/entry/emotions",
        values: [
          joyValue,
          sadnessValue,
          angerValue,
          fearValue,
          disgustValue,
          surpriseValue,
          anticipationValue,
          trustValue
        ]
      };
      
      this.oscBridge.socket.send(JSON.stringify(oscMessage));
      
      // Track that we've sent a message
      this.lastOscSentTime = Date.now();
      
      return true;
    } catch (error) {
      console.error('AudioSystem: Error sending emotion values:', error);
      return false;
    }
  }
  
  /**
   * Normalizes emotion object to handle different case formats
   * 
   * @param {Object} emotions - Original emotions object
   * @returns {Object} - Normalized emotions object with lowercase keys
   */
  normalizeEmotions(emotions) {
    if (!emotions) {
      console.warn('AudioSystem: Emotions object is null or undefined');
      return {
        joy: 0, sadness: 0, anger: 0, fear: 0,
        disgust: 0, surprise: 0, anticipation: 0, trust: 0
      };
    }
    
    // Create a new object with all lowercase keys
    const normalized = {};
    
    // List of emotion names we're looking for
    const emotionNames = [
      'joy', 'sadness', 'anger', 'fear',
      'disgust', 'surprise', 'anticipation', 'trust'
    ];
    
    // Check for each emotion in various case formats
    emotionNames.forEach(emotion => {
      // Try lowercase version (e.g., "joy")
      if (typeof emotions[emotion] === 'number') {
        normalized[emotion] = emotions[emotion];
      }
      // Try uppercase version (e.g., "Joy")
      else if (typeof emotions[emotion.charAt(0).toUpperCase() + emotion.slice(1)] === 'number') {
        normalized[emotion] = emotions[emotion.charAt(0).toUpperCase() + emotion.slice(1)];
      }
      // Try all uppercase (e.g., "JOY")
      else if (typeof emotions[emotion.toUpperCase()] === 'number') {
        normalized[emotion] = emotions[emotion.toUpperCase()];
      }
      // No valid value found, use 0
      else {
        console.warn(`AudioSystem: No valid value found for emotion: ${emotion}`);
        normalized[emotion] = 0;
      }
      
      // Validate the emotion value is between 0 and 1
      if (normalized[emotion] < 0 || normalized[emotion] > 1) {
        console.warn(`AudioSystem: Invalid emotion value for ${emotion}: ${normalized[emotion]}, clamping to range [0,1]`);
        normalized[emotion] = Math.max(0, Math.min(1, normalized[emotion]));
      }
    });
    
    return normalized;
  }
}

export default AudioSystem; 