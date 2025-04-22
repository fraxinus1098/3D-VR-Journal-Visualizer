import * as THREE from 'three';
import OrbVisualizer from '../visualizers/OrbVisualizer.js';
import EntryPanel from './EntryPanel.js';

/**
 * JournalViz - Main component that handles journal visualization and
 * coordinates sending data to SuperCollider audio
 */
export default class JournalViz {
  /**
   * Constructor for JournalViz
   * @param {Object} params Configuration parameters
   * @param {THREE.Scene} params.scene Scene to add visualization to
   * @param {THREE.Camera} params.camera Camera for positioning panels
   * @param {AudioSystem} params.audioSystem Audio system for sound generation
   */
  constructor({ scene, camera, audioSystem }) {
    this.scene = scene;
    this.camera = camera;
    this.audioSystem = audioSystem;
    
    // Visualizers
    this.orbVisualizer = new OrbVisualizer(scene);
    
    // UI Components
    this.entryPanel = null;
    
    // Journal data
    this.journalEntries = [];
    this.selectedEntry = null;
    
    // Interaction state
    this.hoveredObject = null;
    this.selectedObject = null;
    
    // Visualization statistics
    this.visualizationStats = {
      entryCount: 0,
      avgPosition: null,
      yRange: { min: 0, max: 0 }
    };
    
    // Initialize the entry panel for displaying entries
    this.initEntryPanel();
  }
  
  /**
   * Initialize the entry panel for displaying journal entries
   */
  initEntryPanel() {
    this.entryPanel = new EntryPanel({
      camera: this.camera,
      scene: this.scene
    });
  }
  
  /**
   * Create journal entry visualization from data
   * @param {Array} journalEntries Journal entry data
   * @returns {Object} Visualization statistics
   */
  createVisualization(journalEntries) {
    if (!journalEntries || journalEntries.length === 0) {
      console.warn('No journal entries to visualize');
      return {
        count: 0,
        avgPosition: null,
        yRange: { min: 0, max: 0 }
      };
    }
    
    // Store entries for reference
    this.journalEntries = journalEntries;
    
    // Validate entries before visualization
    const validatedEntries = this.validateEntries(journalEntries);
    console.log(`JournalViz: Creating visualization with ${validatedEntries.length} validated entries`);
    
    // Create orbs using the visualizer
    const orbStats = this.orbVisualizer.createOrbs(validatedEntries);
    this.visualizationStats = orbStats;
    
    // Calculate emotion centers for audio if available
    if (this.audioSystem) {
      this.audioSystem.calculateEmotionCenters(validatedEntries);
    }
    
    return orbStats;
  }
  
  /**
   * Validate entries before visualization to ensure all required properties exist
   * @param {Array} entries Journal entries to validate
   * @returns {Array} Validated entries with fallback values for missing properties
   */
  validateEntries(entries) {
    return entries.map(entry => {
      // Create a copy to avoid modifying original
      const validatedEntry = { ...entry };
      
      // Ensure ID exists
      if (!validatedEntry.id) {
        validatedEntry.id = `entry_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Ensure coordinates exist
      if (!validatedEntry.coordinates) {
        validatedEntry.coordinates = { x: 0, y: 0, z: 0 };
        console.warn(`Entry ${validatedEntry.id} missing coordinates, using default (0,0,0)`);
      }
      
      // Ensure emotions exist with all 8 Plutchik emotions
      if (!validatedEntry.emotions || typeof validatedEntry.emotions !== 'object') {
        validatedEntry.emotions = {};
      }
      
      // Ensure all 8 emotions are present with fallback to 0
      const requiredEmotions = [
        'joy', 'trust', 'fear', 'surprise',
        'sadness', 'disgust', 'anger', 'anticipation'
      ];
      
      requiredEmotions.forEach(emotion => {
        // Convert to number and validate range between 0-1
        const value = parseFloat(validatedEntry.emotions[emotion] || 0);
        validatedEntry.emotions[emotion] = isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
      });
      
      return validatedEntry;
    });
  }
  
  /**
   * Handle entry selection to show details and trigger audio
   * @param {THREE.Object3D} selectedObj The selected 3D object
   */
  handleEntrySelection(selectedObj) {
    if (!selectedObj || !selectedObj.userData || !selectedObj.userData.entry) {
      return;
    }
    
    // Store selection state
    this.selectedObject = selectedObj;
    const entryData = selectedObj.userData.entry;
    this.selectedEntry = entryData;
    
    // Display entry details
    if (this.entryPanel) {
      this.entryPanel.showEntry(entryData);
      this.entryPanel.show();
    }
    
    // Highlight in visualizer
    if (this.orbVisualizer) {
      this.orbVisualizer.applySelectionEffect(selectedObj);
      this.orbVisualizer.highlightRelatedEntries(selectedObj);
    }
    
    // Trigger SuperCollider audio if available
    if (this.audioSystem) {
      // First stop any previously playing sounds to avoid resource issues
      this.audioSystem.stopAllSounds().then(() => {
        // Create a validated copy of entry emotions to ensure all required values
        const validatedEmotions = this.validateEmotions(entryData.emotions);
        
        // Clone entry to avoid modifying the original, and set validated emotions
        const audioEntry = { ...entryData, emotions: validatedEmotions };
        
        // Log emotion values for debugging
        console.log('JournalViz: Sending emotion values to audio system:', 
          JSON.stringify(validatedEmotions, null, 2));
          
        // Play the entry audio with validated emotions
        this.audioSystem.playEntryAudio(audioEntry);
      });
    }
  }
  
  /**
   * Validate emotions to ensure all required values exist
   * @param {Object} emotions Emotion values from entry
   * @returns {Object} Validated emotions with fallback values
   */
  validateEmotions(emotions) {
    const validatedEmotions = { ...emotions };
    
    // Ensure all 8 emotions are present with fallback to 0
    const requiredEmotions = [
      'joy', 'trust', 'fear', 'surprise',
      'sadness', 'disgust', 'anger', 'anticipation'
    ];
    
    requiredEmotions.forEach(emotion => {
      // Convert to number and validate range between 0-1
      const value = parseFloat(validatedEmotions[emotion] || 0);
      validatedEmotions[emotion] = isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
    });
    
    return validatedEmotions;
  }
  
  /**
   * Handle deselection of entry
   */
  handleEntryDeselection() {
    if (this.selectedObject) {
      // Remove highlights
      if (this.orbVisualizer) {
        this.orbVisualizer.resetObjectMaterial(this.selectedObject);
        this.orbVisualizer.cleanupRelatedEntries();
      }
      
      // Hide entry panel
      if (this.entryPanel) {
        this.entryPanel.hide();
      }
      
      // Stop audio
      if (this.audioSystem) {
        this.audioSystem.stopAllSounds();
      }
      
      // Reset selection state
      this.selectedObject = null;
      this.selectedEntry = null;
    }
  }
  
  /**
   * Handle hover interaction
   * @param {THREE.Object3D} object The hovered object
   */
  handleHover(object) {
    // Skip if same as current hover or selected object
    if (object === this.hoveredObject || object === this.selectedObject) {
      return;
    }
    
    // Reset previous hover
    if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
      this.orbVisualizer.resetObjectMaterial(this.hoveredObject);
    }
    
    // Apply hover effect if it's a journal entry
    if (object && object.userData && object.userData.type === 'journal-entry') {
      this.orbVisualizer.applyHoverEffect(object);
      this.hoveredObject = object;
      
      // Play hover sound if available
      if (this.audioSystem) {
        this.audioSystem.playHoverSound();
      }
    } else {
      this.hoveredObject = null;
    }
  }
  
  /**
   * Get all interactive objects for raycasting
   * @returns {Array} Array of interactive THREE.Object3D objects
   */
  getInteractiveObjects() {
    const interactiveObjects = [];
    
    // Add orb objects
    if (this.orbVisualizer) {
      interactiveObjects.push(...this.orbVisualizer.getInteractiveObjects());
    }
    
    // Add panel interactive elements
    if (this.entryPanel) {
      if (this.entryPanel.closeButton) {
        interactiveObjects.push(this.entryPanel.closeButton);
      }
      if (this.entryPanel.scrollUpButton) {
        interactiveObjects.push(this.entryPanel.scrollUpButton);
      }
      if (this.entryPanel.scrollDownButton) {
        interactiveObjects.push(this.entryPanel.scrollDownButton);
      }
    }
    
    return interactiveObjects;
  }
  
  /**
   * Update animation loop
   */
  update() {
    if (this.orbVisualizer) {
      this.orbVisualizer.update();
    }
    
    if (this.entryPanel && this.entryPanel.visible) {
      this.entryPanel.updatePosition();
    }
  }
  
  /**
   * Clean up and dispose resources
   */
  dispose() {
    if (this.orbVisualizer) {
      this.orbVisualizer.dispose();
    }
    
    if (this.entryPanel) {
      this.entryPanel.dispose();
    }
  }
} 