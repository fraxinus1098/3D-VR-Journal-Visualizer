import * as THREE from 'three';

/**
 * Creates and manages 3D orbs representing journal entries
 */
export default class OrbVisualizer {
  constructor(scene, options = {}) {
    this.scene = scene;
    
    // Configuration options with defaults
    this.options = Object.assign({
      baseSphereRadius: 0.1,
      baseSphereSegments: 16,
      emotionScaleFactor: 0.1,
      emissiveBase: 0.3,
      emissiveScale: 0.7,
      opacityBase: 0.7,
      opacityScale: 0.3
    }, options);
    
    // Container for all orbs
    this.orbGroup = new THREE.Group();
    this.scene.add(this.orbGroup);
    
    // Map entry IDs to Three.js objects
    this.orbObjects = new Map();
    
    // Track related entries and connection lines
    this.relatedEntryObjects = [];
    this.connectionLines = [];
    
    // Store original materials for highlighting
    this.originalMaterials = new Map();
    
    // Define emotion colors based on Plutchik's wheel
    this.emotionColorsRGB = {
      'joy': [1.0, 1.0, 0.0],         // yellow
      'trust': [0.0, 0.8, 0.0],       // green
      'fear': [0.6, 1.0, 0.6],        // light green
      'surprise': [0.0, 0.8, 0.8],    // turquoise
      'sadness': [0.0, 0.0, 1.0],     // blue
      'disgust': [0.5, 0.0, 0.5],     // purple
      'anger': [1.0, 0.0, 0.0],       // red
      'anticipation': [1.0, 0.5, 0.0] // orange
    };
    
    // Gray color for neutral or unrecognized emotions
    this.grayColor = [0.7, 0.7, 0.7];
  }
  
  /**
   * Create orbs from journal entry data
   * @param {Array} journalEntries - Array of journal entry objects
   * @returns {Object} - Statistics about created orbs
   */
  createOrbs(journalEntries) {
    if (!journalEntries || journalEntries.length === 0) {
      console.warn('No journal entries to visualize');
      return { count: 0 };
    }
    
    console.log(`Creating visualization for ${journalEntries.length} entries`);
    
    // Track statistics for positioning camera
    let sumX = 0, sumY = 0, sumZ = 0;
    let minY = Infinity, maxY = -Infinity;
    let count = 0;
    
    // Create orbs for each journal entry
    journalEntries.forEach(entry => {
      const orb = this.createOrb(entry);
      this.orbGroup.add(orb);
      this.orbObjects.set(entry.id, orb);
      
      // Add orb position to sum for average calculation
      sumX += entry.coordinates.x;
      sumY += entry.coordinates.y;
      sumZ += entry.coordinates.z;
      count++;
      
      // Track min/max Y values for elevation gauge scaling
      minY = Math.min(minY, entry.coordinates.y);
      maxY = Math.max(maxY, entry.coordinates.y);
    });
    
    // Return statistics about created orbs
    return {
      count,
      avgPosition: count > 0 ? { x: sumX / count, y: sumY / count, z: sumZ / count } : null,
      yRange: { min: minY, max: maxY }
    };
  }
  
  /**
   * Create a single orb representing a journal entry
   * @param {Object} entry - Journal entry data
   * @returns {THREE.Mesh} - The created orb mesh
   */
  createOrb(entry) {
    // Calculate emotional intensity for sizing
    const emotionalIntensity = this.getEmotionIntensity(entry.emotions);
    const radius = this.options.baseSphereRadius + (emotionalIntensity * this.options.emotionScaleFactor);
    
    // Create sphere geometry with detail proportional to size
    const segments = Math.max(this.options.baseSphereSegments, Math.floor(radius * 100));
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    // Get color based on emotions (supports blending of multiple emotions)
    const color = this.blendEmotionColors(entry.emotions);
    
    // Create material with emissive properties for glow effect
    // Emissive intensity based on emotional intensity
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: this.options.emissiveBase + (emotionalIntensity * this.options.emissiveScale),
      roughness: 0.7,
      metalness: 0.3,
      transparent: true, 
      opacity: this.options.opacityBase + (emotionalIntensity * this.options.opacityScale)
    });
    
    // Create the mesh and position it based on the entry's coordinates
    const orb = new THREE.Mesh(geometry, material);
    
    // Position the orb according to the entry's coordinates
    orb.position.set(
      entry.coordinates.x,
      entry.coordinates.y,
      entry.coordinates.z
    );
    
    // Store the entry data with the orb for interaction
    orb.userData.entry = entry;
    orb.userData.interactive = true;
    orb.userData.type = 'journal-entry';
    
    return orb;
  }
  
  /**
   * Calculate the overall emotional intensity
   * @param {Object} emotions - Object with emotion names as keys and intensities as values
   * @returns {number} - Emotional intensity value between 0 and 1
   */
  getEmotionIntensity(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) {
      return 0;
    }
    return Object.values(emotions).reduce((sum, val) => sum + val, 0) / Object.keys(emotions).length;
  }
  
  /**
   * Get the dominant emotion from an emotions object
   * @param {Object} emotions - Object with emotion names as keys and intensities as values
   * @returns {string} - Name of the dominant emotion or 'neutral'
   */
  getDominantEmotion(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) {
      return 'neutral';
    }
    
    let maxIntensity = 0;
    let dominantEmotion = 'neutral';
    
    for (const [emotion, intensity] of Object.entries(emotions)) {
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        dominantEmotion = emotion;
      }
    }
    
    return dominantEmotion;
  }
  
  /**
   * Normalize emotion name to handle case sensitivity and variations
   * @param {string} name - The emotion name to normalize
   * @returns {string|null} - Normalized emotion name or null if invalid
   */
  normalizeEmotionName(name) {
    if (!name) {
      return null;
    }
    // Convert to lowercase for matching
    const nameLower = name.toLowerCase();
    
    // Check if it contains any of our known emotions
    for (const emotion of Object.keys(this.emotionColorsRGB)) {
      if (nameLower.includes(emotion)) {
        return emotion;
      }
    }
    return nameLower;
  }
  
  /**
   * Blend multiple emotion colors based on their intensities
   * @param {Object} emotions - Object with emotion names as keys and intensities as values
   * @returns {THREE.Color} - Blended color for the emotions
   */
  blendEmotionColors(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) {
      return new THREE.Color(this.grayColor[0], this.grayColor[1], this.grayColor[2]);
    }
    
    // Normalize emotion names to handle case sensitivity
    const normalizedEmotions = {};
    for (const [emotion, value] of Object.entries(emotions)) {
      const normName = this.normalizeEmotionName(emotion);
      if (normName && this.emotionColorsRGB[normName]) {
        normalizedEmotions[normName] = value;
      }
    }
    
    if (Object.keys(normalizedEmotions).length === 0) {
      return new THREE.Color(this.grayColor[0], this.grayColor[1], this.grayColor[2]);
    }
    
    // Sort emotions by intensity (highest first)
    const sortedEmotions = Object.entries(normalizedEmotions)
      .sort((a, b) => b[1] - a[1]);
    
    // If there's only one emotion or the top one is very dominant (>0.7)
    if (sortedEmotions.length === 1 || sortedEmotions[0][1] > 0.7) {
      const dominantEmotion = sortedEmotions[0][0];
      const color = this.emotionColorsRGB[dominantEmotion];
      return new THREE.Color(color[0], color[1], color[2]);
    }
    
    // Get top two emotions for blending
    const topEmotion = sortedEmotions[0][0];
    const secondEmotion = sortedEmotions.length > 1 ? sortedEmotions[1][0] : topEmotion;
    
    // Calculate weights (normalized to sum to 1.0)
    const topVal = sortedEmotions[0][1];
    const secondVal = sortedEmotions.length > 1 ? sortedEmotions[1][1] : 0;
    
    const total = topVal + secondVal;
    if (total === 0) {
      return new THREE.Color(this.grayColor[0], this.grayColor[1], this.grayColor[2]);
    }
    
    const w1 = topVal / total;
    const w2 = secondVal / total;
    
    // Blend the colors
    const c1 = this.emotionColorsRGB[topEmotion];
    const c2 = this.emotionColorsRGB[secondEmotion];
    
    const blended = [
      c1[0] * w1 + c2[0] * w2,
      c1[1] * w1 + c2[1] * w2,
      c1[2] * w1 + c2[2] * w2
    ];
    
    return new THREE.Color(blended[0], blended[1], blended[2]);
  }
  
  /**
   * Apply hover effect to an object
   */
  applyHoverEffect(object) {
    // Optimization: Skip if object is null or undefined
    if (!object) return;
    
    try {
      // Store original material if not already stored
      if (!this.originalMaterials.has(object.uuid)) {
        this.originalMaterials.set(object.uuid, object.material.clone());
      }
      
      // Create a hover material based on the original
      const hoverMaterial = object.material.clone();
      
      // Make it slightly brighter and more emissive
      hoverMaterial.emissiveIntensity *= 1.5;
      hoverMaterial.emissive.lerp(new THREE.Color(0xffffff), 0.3);
      
      // Apply the hover material
      object.material = hoverMaterial;
    } catch (error) {
      console.error('Error applying hover effect:', error);
      // Fallback to avoid crashing: use original material if available
      if (this.originalMaterials.has(object.uuid)) {
        object.material = this.originalMaterials.get(object.uuid);
      }
    }
  }
  
  /**
   * Apply selection effect to an object
   */
  applySelectionEffect(object) {
    // Optimization: Skip if object is null or undefined
    if (!object) return;
    
    try {
      // Create a selection material based on the original
      const selectionMaterial = object.material.clone();
      
      // Make it significantly brighter and more emissive with a white tint
      selectionMaterial.emissiveIntensity *= 2.0;
      selectionMaterial.emissive.lerp(new THREE.Color(0xffffff), 0.5);
      
      // Add pulsing animation (will be updated in animate method)
      object.userData.pulseAnimation = {
        active: true,
        baseEmissive: selectionMaterial.emissiveIntensity,
        time: 0
      };
      
      // Apply the selection material
      object.material = selectionMaterial;
    } catch (error) {
      console.error('Error applying selection effect:', error);
      // Fallback to avoid crashing: use original material if available
      if (this.originalMaterials.has(object.uuid)) {
        object.material = this.originalMaterials.get(object.uuid);
      }
    }
  }
  
  /**
   * Reset an object's material to its original state
   */
  resetObjectMaterial(object) {
    // Optimization: Skip if object is null or undefined
    if (!object) return;
    
    try {
      if (this.originalMaterials.has(object.uuid)) {
        object.material = this.originalMaterials.get(object.uuid);
        
        // Remove any animation flags
        if (object.userData.pulseAnimation) {
          object.userData.pulseAnimation.active = false;
        }
      }
    } catch (error) {
      console.error('Error resetting object material:', error);
    }
  }
  
  /**
   * Update the selection pulse animation
   */
  updateSelectionAnimation() {
    this.orbGroup.traverse(object => {
      if (object.userData?.pulseAnimation?.active) {
        try {
          const animation = object.userData.pulseAnimation;
          animation.time += 0.05;
          const pulseFactor = 0.5 + 0.5 * Math.sin(animation.time * 3);
          object.material.emissiveIntensity = animation.baseEmissive * (0.8 + 0.4 * pulseFactor);
        } catch (error) {
          console.error('Error updating selection animation:', error);
          // Stop the animation if there's an error to prevent continuous errors
          if (object.userData.pulseAnimation) {
            object.userData.pulseAnimation.active = false;
          }
        }
      }
    });
  }
  
  /**
   * Get all interactive orb objects
   * @returns {Array} Array of interactive objects
   */
  getInteractiveObjects() {
    const objects = [];
    this.orbGroup.traverse(object => {
      if (object.userData && object.userData.interactive) {
        objects.push(object);
      }
    });
    return objects;
  }
  
  /**
   * Highlight related entries when a journal entry is selected
   * @param {Object} selectedObj - The selected Three.js object
   */
  highlightRelatedEntries(selectedObj) {
    // Clean up any existing related entry effects
    this.cleanupRelatedEntries();
    
    // Only proceed if the object is a journal entry
    if (!selectedObj || !selectedObj.userData || selectedObj.userData.type !== 'journal-entry') {
      return;
    }
    
    const entry = selectedObj.userData.entry;
    
    // Skip if the entry doesn't have related entries or is missing required data
    if (!entry || !entry.relatedEntries || !Array.isArray(entry.relatedEntries) || entry.relatedEntries.length === 0) {
      console.warn('No related entries found for selected entry:', entry?.id);
      return;
    }
    
    console.log(`Processing ${entry.relatedEntries.length} related entries for entry ${entry.id}`);
    
    // Get related orb objects using the orbObjects map
    entry.relatedEntries.forEach(relatedId => {
      const relatedOrb = this.orbObjects.get(relatedId);
      
      if (relatedOrb) {
        // Store original material
        if (!this.originalMaterials.has(relatedOrb.uuid)) {
          this.originalMaterials.set(relatedOrb.uuid, relatedOrb.material.clone());
        }
        
        // Apply a subtle highlight effect
        const relatedMaterial = relatedOrb.material.clone();
        relatedMaterial.emissiveIntensity *= 1.3;
        relatedMaterial.emissive.lerp(new THREE.Color(0x00ffff), 0.3); // Cyan tint for related entries
        relatedOrb.material = relatedMaterial;
        
        // Add to the related objects array for cleanup later
        this.relatedEntryObjects.push(relatedOrb);
        
        // Create a line connecting the selected orb to the related orb
        this.createConnectionLine(selectedObj, relatedOrb);
      } else {
        console.warn(`Related entry ${relatedId} not found in orbObjects map`);
      }
    });
  }
  
  /**
   * Create a line connecting the selected entry to a related entry
   * @param {Object} sourceObj - The source (selected) Three.js object
   * @param {Object} targetObj - The target (related) Three.js object
   */
  createConnectionLine(sourceObj, targetObj) {
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cyan color for connections
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });
    
    // Create geometry for the line
    const points = [
      sourceObj.position.clone(),
      targetObj.position.clone()
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create the line
    const line = new THREE.Line(geometry, material);
    line.userData.isConnectionLine = true;
    
    // Add line to the scene and store for later cleanup
    this.scene.add(line);
    this.connectionLines.push(line);
  }
  
  /**
   * Clean up any highlighted related entries and connection lines
   */
  cleanupRelatedEntries() {
    // Reset materials on related orbs
    this.relatedEntryObjects.forEach(orb => {
      this.resetObjectMaterial(orb);
    });
    this.relatedEntryObjects = [];
    
    // Remove connection lines
    this.connectionLines.forEach(line => {
      if (line && line.parent) {
        line.parent.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      }
    });
    this.connectionLines = [];
  }
  
  /**
   * Clean up resources periodically to prevent memory leaks
   */
  cleanupMemory() {
    // Check if it's time to clean up
    const now = performance.now();
    if (!this._lastCleanup || now - this._lastCleanup > 30000) { // Every 30 seconds
      this._lastCleanup = now;
      
      // Dispose of unused materials that haven't been used recently
      const materialsToKeep = new Map();
      
      // Keep only materials that are actively in use
      this.orbGroup.traverse(object => {
        if (object.isMesh && object.material) {
          materialsToKeep.set(object.uuid, object.material);
        }
      });
      
      // Dispose of unused materials
      this.originalMaterials.forEach((material, uuid) => {
        if (!materialsToKeep.has(uuid)) {
          material.dispose();
        }
      });
      
      // Replace with clean map
      this.originalMaterials = new Map();
      materialsToKeep.forEach((material, uuid) => {
        this.originalMaterials.set(uuid, material);
      });
      
      console.log('Memory cleanup completed. Retained materials:', this.originalMaterials.size);
    }
  }
  
  /**
   * Update animation frames
   */
  update() {
    // Update selection pulse animation
    this.updateSelectionAnimation();
    
    // Periodic memory cleanup
    this.cleanupMemory();
  }
  
  /**
   * Clean up all resources
   */
  dispose() {
    // Dispose of all geometries and materials
    this.orbGroup.traverse(object => {
      if (object.isMesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    // Clean up related entries
    this.cleanupRelatedEntries();
    
    // Clear maps
    this.orbObjects.clear();
    this.originalMaterials.clear();
    
    // Remove group from scene
    if (this.orbGroup.parent) {
      this.orbGroup.parent.remove(this.orbGroup);
    }
  }
} 