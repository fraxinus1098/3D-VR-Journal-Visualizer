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
      
      // Try to connect to SuperCollider via WebSocket-OSC bridge
      try {
        // Wrap with a timeout to prevent blocking if connection fails
        const connectPromise = this.oscBridge.connect();
        
        // Set a timeout for the connection attempt
        const timeoutPromise = new Promise(resolve => {
          setTimeout(() => {
            console.warn('AudioSystem: WebSocket connection timeout');
            resolve(false);
          }, 3000); // 3 second timeout
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
          console.warn('SuperCollider connection unavailable - audio features will be limited');
        }
      } catch (oscError) {
        console.error('AudioSystem: Error connecting to WebSocket-OSC bridge:', oscError);
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
   * Play entry audio based on emotion values
   * @param {Object} entryData - The journal entry data
   * @returns {boolean} Success of playback initiation
   */
  playEntryAudio(entryData) {
    if (!this.initialized) {
      console.error('Cannot play entry audio: Audio system not initialized');
      return false;
    }
    
    // Check if we have emotion data
    if (!entryData || !entryData.emotions) {
      console.error('Cannot play entry audio: No emotion data in entry', entryData);
      return false;
    }
    
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
          
          // Register this audio system with the UI controls
          if (audioControls) {
            audioControls.setAudioSystem(this);
          }
          
          // Show status notification about audio
          if (notifications) {
            if (this.oscBridge && this.oscBridge.connected) {
              notifications.show('SuperCollider audio connected via WebSocket!');
            } else {
              notifications.show('SuperCollider connection failed - no audio available');
              
              // Add a delayed second notification explaining how to fix
              setTimeout(() => {
                notifications.show('For audio, run SuperCollider and bridge server as explained in README');
              }, 5000);
            }
          }
        } catch (innerError) {
          console.error('Error during audio initialization:', innerError);
          if (notifications) {
            notifications.show('Audio initialization failed, but app will continue');
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
}

export default AudioSystem; 