import * as THREE from 'three';

/**
 * AudioSystem - Handles all audio functionality for the visualization
 * 
 * Features:
 * - Loads and plays emotion-based ambient tracks
 * - Implements spatial audio and proximity-based mixing
 * - Adds interaction sounds for feedback
 */
class AudioSystem {
  constructor() {
    // Audio context
    this.audioContext = null;
    
    // Audio sources by emotion
    this.emotionSounds = {
      joy: null,
      trust: null,
      fear: null,
      surprise: null,
      sadness: null,
      disgust: null,
      anger: null,
      anticipation: null
    };
    
    // Interaction sounds
    this.interactionSounds = {
      select: null,
      hover: null
    };
    
    // Audio state
    this.initialized = false;
    this.muted = false;
    this.masterGain = null;
    
    // Cache for emotion centers (for performance)
    this.emotionCenters = {};
    
    // Init method must be called explicitly (after user interaction)
    // due to browser autoplay policy
  }
  
  /**
   * Initialize the audio system (call after user interaction)
   * @returns {Promise} Promise that resolves when audio is initialized
   */
  async init() {
    if (this.initialized) return Promise.resolve();
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume AudioContext (required in many browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5; // Start at half volume
      this.masterGain.connect(this.audioContext.destination);
      
      // Load all emotion sounds
      await this.loadEmotionSounds();
      
      // Load interaction sounds
      await this.loadInteractionSounds();
      
      this.initialized = true;
      console.log('Audio system initialized');
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Load all emotion ambient sounds
   * @returns {Promise} Promise that resolves when all sounds are loaded
   */
  async loadEmotionSounds() {
    const emotionNames = [
      'joy', 'trust', 'fear', 'surprise', 
      'sadness', 'disgust', 'anger', 'anticipation'
    ];
    
    const loadPromises = emotionNames.map(emotion => {
      const index = this.getEmotionIndex(emotion);
      return this.loadEmotionSound(emotion, `/sounds/${index} - ${this.capitalizeFirstLetter(emotion)}.mp3`);
    });
    
    return Promise.all(loadPromises);
  }
  
  /**
   * Get the numeric index for an emotion name
   * @param {string} emotion - The emotion name
   * @returns {number} The index (1-8)
   */
  getEmotionIndex(emotion) {
    const emotionIndices = {
      'joy': 1,
      'trust': 2,
      'fear': 3,
      'surprise': 4,
      'sadness': 5,
      'disgust': 6,
      'anger': 7,
      'anticipation': 8
    };
    return emotionIndices[emotion] || 1;
  }
  
  /**
   * Capitalize the first letter of a string
   * @param {string} str - The string to capitalize
   * @returns {string} The capitalized string
   */
  capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Load a single emotion sound
   * @param {string} emotion - The emotion name
   * @param {string} url - The URL to the sound file
   * @returns {Promise} Promise that resolves when the sound is loaded
   */
  loadEmotionSound(emotion, url) {
    return new Promise((resolve, reject) => {
      console.log(`Loading sound for ${emotion} from ${url}`);
      
      // Create audio element (better for looping background sounds)
      const audio = new Audio();
      audio.src = url;
      audio.loop = true;
      
      // Create an analyser node for visualization
      const audioSource = this.audioContext.createMediaElementSource(audio);
      const gainNode = this.audioContext.createGain();
      const analyser = this.audioContext.createAnalyser();
      
      // Connect nodes
      audioSource.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      // Start with a minimum volume (not zero) to ensure we can hear something
      gainNode.gain.value = 0.05;
      
      // Set initial position in 3D space at origin
      const position = new THREE.Vector3(0, 0, 0);
      
      // Store sound data
      this.emotionSounds[emotion] = {
        audio: audio,
        source: audioSource,
        gain: gainNode,
        analyser: analyser,
        playing: false,
        position: position
      };
      
      // Resolve when audio can play
      audio.oncanplaythrough = () => {
        console.log(`Loaded emotion sound: ${emotion}`);
        resolve();
      };
      
      audio.onerror = (err) => {
        console.error(`Error loading emotion sound ${emotion}:`, err);
        console.error(`Error details: ${audio.error ? audio.error.message : 'Unknown error'}`);
        reject(err);
      };
    });
  }
  
  /**
   * Load all interaction sounds
   * @returns {Promise} Promise that resolves when all sounds are loaded
   */
  async loadInteractionSounds() {
    // For now, just a placeholder for future interaction sounds
    // This could be expanded with actual sound effects
    return Promise.resolve();
  }
  
  /**
   * Play all emotion sounds (initially at 0 volume)
   */
  playAllEmotionSounds() {
    if (!this.initialized) {
      console.error('Cannot play sounds: Audio system not initialized');
      return;
    }
    
    console.log('Starting to play all emotion sounds');
    
    Object.keys(this.emotionSounds).forEach(emotion => {
      const sound = this.emotionSounds[emotion];
      if (sound && sound.audio && !sound.playing) {
        console.log(`Attempting to play ${emotion} sound`);
        
        // Ensure AudioContext is running
        if (this.audioContext.state === 'suspended') {
          console.log('Resuming suspended AudioContext');
          this.audioContext.resume();
        }
        
        sound.audio.play()
          .then(() => {
            sound.playing = true;
            console.log(`Successfully playing ${emotion} sound`);
          })
          .catch(err => {
            console.error(`Error playing ${emotion} sound:`, err);
            // Try again with user interaction
            document.addEventListener('click', () => {
              if (!sound.playing) {
                console.log(`Retrying ${emotion} sound playback after user interaction`);
                sound.audio.play()
                  .then(() => {
                    sound.playing = true;
                    console.log(`Successfully playing ${emotion} sound on retry`);
                  })
                  .catch(retryErr => {
                    console.error(`Failed to play ${emotion} sound on retry:`, retryErr);
                  });
              }
            }, { once: true });
          });
      }
    });
  }
  
  /**
   * Stop all emotion sounds
   */
  stopAllEmotionSounds() {
    if (!this.initialized) return;
    
    Object.keys(this.emotionSounds).forEach(emotion => {
      const sound = this.emotionSounds[emotion];
      if (sound && sound.audio && sound.playing) {
        sound.audio.pause();
        sound.audio.currentTime = 0;
        sound.playing = false;
      }
    });
  }
  
  /**
   * Set the position of an emotion sound in 3D space
   * @param {string} emotion - The emotion name
   * @param {THREE.Vector3} position - The 3D position
   */
  setEmotionPosition(emotion, position) {
    if (!this.initialized || !this.emotionSounds[emotion]) return;
    
    this.emotionSounds[emotion].position = position.clone();
    this.emotionCenters[emotion] = position.clone();
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
        this.setEmotionPosition(emotion, position);
      }
    });
    
    console.log('Emotion centers calculated:', this.emotionCenters);
  }
  
  /**
   * Update audio mix based on camera position
   * @param {THREE.Vector3} position - Camera position
   */
  updateAudioMix(position) {
    if (!this.initialized) return;
    if (this.muted) return;
    
    // Check if any sounds are playing
    let anySoundPlaying = false;
    Object.keys(this.emotionSounds).forEach(emotion => {
      if (this.emotionSounds[emotion] && this.emotionSounds[emotion].playing) {
        anySoundPlaying = true;
      }
    });
    
    // Restart sounds if they stopped playing
    if (!anySoundPlaying) {
      console.log('No sounds are playing - attempting to restart');
      this.playAllEmotionSounds();
      return;
    }
    
    // Calculate distances to each emotion center
    const distances = {};
    let totalDistance = 0;
    
    Object.keys(this.emotionCenters).forEach(emotion => {
      if (this.emotionCenters[emotion]) {
        const distance = position.distanceTo(this.emotionCenters[emotion]);
        // Use inverse square relationship for volume (closer = louder)
        // Use a more aggressive falloff to make spatial changes more noticeable
        const inverseDistance = 1 / Math.max(0.1, distance * distance);
        distances[emotion] = inverseDistance;
        totalDistance += inverseDistance;
      }
    });
    
    // No distances calculated, skip audio updates
    if (totalDistance === 0) {
      console.log('No emotion centers found or total distance is zero');
      // Use a default state to ensure some audio is played
      Object.keys(this.emotionSounds).forEach(emotion => {
        if (this.emotionSounds[emotion] && this.emotionSounds[emotion].gain) {
          // Set all to equal minimum volume
          this.emotionSounds[emotion].gain.gain.value = 0.1;
        }
      });
      return;
    }
    
    // Normalize volumes and apply
    Object.keys(distances).forEach(emotion => {
      const normalizedVolume = distances[emotion] / totalDistance;
      
      // Smooth transition for gain changes
      if (this.emotionSounds[emotion] && this.emotionSounds[emotion].gain) {
        const gainNode = this.emotionSounds[emotion].gain;
        
        // Ensure we're not exceeding the maximum volume
        // Use curves to make this more exponential than linear
        // Increase volume multiplier to make it more noticeable
        const volume = Math.min(0.9, normalizedVolume * 3.0);
        gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.3);
        
        // Log for debugging - remove in production
        if (Math.random() < 0.005) { // Log occasionally to avoid console spam
          console.log(`${emotion} volume: ${volume.toFixed(2)}, distance: ${(1/distances[emotion]).toFixed(2)}`);
        }
      }
    });
  }
  
  /**
   * Play a selection interaction sound
   */
  playSelectSound() {
    // Placeholder for playing a selection sound
    // Would implement actual sound here
  }
  
  /**
   * Play a hover interaction sound
   */
  playHoverSound() {
    // Placeholder for playing a hover sound
    // Would implement actual sound here
  }
  
  /**
   * Toggle muted state of all audio
   * @returns {boolean} The new muted state
   */
  toggleMute() {
    this.muted = !this.muted;
    
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
    }
    
    console.log(`Audio ${this.muted ? 'muted' : 'unmuted'}`);
    return this.muted;
  }
  
  /**
   * Set master volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    if (!this.initialized || !this.masterGain) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = clampedVolume;
    this.muted = (clampedVolume === 0);
  }
  
  /**
   * Get current volume level
   * @returns {number} Current volume (0.0 to 1.0)
   */
  getVolume() {
    if (!this.initialized || !this.masterGain) return 0;
    return this.masterGain.gain.value;
  }
  
  /**
   * Dispose of audio resources
   */
  dispose() {
    this.stopAllEmotionSounds();
    
    // Disconnect all nodes
    Object.keys(this.emotionSounds).forEach(emotion => {
      const sound = this.emotionSounds[emotion];
      if (sound) {
        if (sound.source) sound.source.disconnect();
        if (sound.gain) sound.gain.disconnect();
        if (sound.analyser) sound.analyser.disconnect();
      }
    });
    
    if (this.masterGain) {
      this.masterGain.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.initialized = false;
  }
}

export default AudioSystem; 