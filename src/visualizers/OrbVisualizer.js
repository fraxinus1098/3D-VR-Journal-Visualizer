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
    let skippedCount = 0;
    
    // Create orbs for each journal entry
    journalEntries.forEach((entry, index) => {
      // Validate entry data
      if (!entry || !entry.id || !entry.coordinates) {
        console.warn(`Skipping invalid entry at index ${index}:`, entry);
        skippedCount++;
        return;
      }
      
      try {
        const orb = this.createOrb(entry);
        
        if (orb) {
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
        } else {
          console.warn(`Failed to create orb for entry ${entry.id}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error creating orb for entry ${entry.id || index}:`, error);
        skippedCount++;
      }
    });
    
    console.log(`Created ${count} orbs, skipped ${skippedCount} invalid entries`);
    
    // Return statistics about created orbs
    return {
      count,
      skippedCount,
      avgPosition: count > 0 ? { x: sumX / count, y: sumY / count, z: sumZ / count } : null,
      yRange: { min: minY !== Infinity ? minY : 0, max: maxY !== -Infinity ? maxY : 0 }
    };
  }
  
  /**
   * Create a single orb representing a journal entry
   * @param {Object} entry - Journal entry data
   * @returns {THREE.Mesh} - The created orb mesh
   */
  createOrb(entry) {
    if (!entry || !entry.id || !entry.coordinates) {
      console.warn('Cannot create orb: Invalid entry data', entry);
      return null;
    }
    
    console.log(`Creating orb for entry ${entry.id}`);
    
    // Calculate emotional intensity for sizing
    const emotionalIntensity = this.getEmotionIntensity(entry.emotions);
    const radius = this.options.baseSphereRadius + (emotionalIntensity * this.options.emotionScaleFactor);
    
    // Create sphere geometry with detail proportional to size
    const segments = Math.max(8, Math.min(this.options.baseSphereSegments, Math.floor(radius * 100)));
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
    orb.userData = {
      entry: entry,
      interactive: true,
      type: 'journal-entry',
      originalColor: color.clone()
    };
    
    // Ensure orb has a unique ID for raycasting
    orb.uuid = THREE.MathUtils.generateUUID();
    
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
   * Apply the highlight effect to show orb is selected
   * @param {THREE.Object3D} object - The object to highlight
   */
  applySelectionEffect(object) {
    if (!object || !object.userData || object.userData.type !== 'journal-entry') {
      console.warn('Invalid object passed to applySelectionEffect:', object);
      return;
    }

    try {
      // Store original material if not already stored
      if (!this.originalMaterials.has(object.uuid)) {
        this.originalMaterials.set(object.uuid, object.material.clone());
      }

      // Create selection material based on original
      const selectionMaterial = object.material.clone();
      
      // Make the selection more vivid with increased emissive and glow
      selectionMaterial.emissive = object.material.color ? 
        object.material.color.clone() : 
        new THREE.Color(1, 1, 1);
      selectionMaterial.emissiveIntensity = 1.0;
      
      // Add a white outline with higher opacity
      selectionMaterial.opacity = 1.0;
      
      // Apply selection material
      object.material = selectionMaterial;
      
      // Add the object to related entries to ensure cleanup
      this.relatedEntryObjects.push(object);
      
      // Log selection for debugging
      console.log(`Selected object: ${object.uuid}`, object.userData.entry ? object.userData.entry.id : 'No entry');
    } catch (error) {
      console.error('Error applying selection effect:', error, object);
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
   * Highlight related entries when one entry is selected
   * @param {THREE.Object3D} selectedObj - The selected object
   */
  highlightRelatedEntries(selectedObj) {
    // First, make sure any previous related entries are cleaned up
    this.cleanupRelatedEntries();
    
    // Validate the selected object
    if (!selectedObj || !selectedObj.userData || !selectedObj.userData.entry) {
      console.warn('Cannot highlight related entries: Invalid selection or missing entry data');
      return;
    }
    
    try {
      // Get the performance optimizer from the scene if available
      const performanceOptimizer = this.scene.userData?.performanceOptimizer;
      if (performanceOptimizer) {
        // Temporarily disable performance optimizations during selection
        performanceOptimizer.temporarilyDisable();
      }
      
      // Apply selection effect to the selected object
      this.applySelectionEffect(selectedObj);
      
      // Mark as selected for performance optimizer
      selectedObj.userData.selected = true;
      selectedObj.userData.optimizationDisabled = true;
      
      const selectedEntry = selectedObj.userData.entry;
      console.log(`Highlighting entries related to: ${selectedEntry.id}`);
      
      // Skip if no related entries
      if (!selectedEntry.relatedEntries || selectedEntry.relatedEntries.length === 0) {
        console.log('Entry has no related entries defined');
        return;
      }
      
      console.log(`Found ${selectedEntry.relatedEntries.length} related entries`);
      
      // Track connections that we've made to avoid duplicates
      const connections = new Set();
      
      // Process each related entry
      selectedEntry.relatedEntries.forEach(relatedId => {
        try {
          // Find the related orb object
          const relatedOrb = this.orbObjects.get(relatedId);
          
          if (!relatedOrb) {
            console.warn(`Related entry not found: ${relatedId}`);
            return;
          }
          
          // Ensure the orb is visible
          relatedOrb.visible = true;
          
          // Mark as related for performance optimization
          relatedOrb.userData.related = true;
          relatedOrb.userData.optimizationDisabled = true;
          
          // Store original material if not already stored
          if (!this.originalMaterials.has(relatedOrb.uuid)) {
            this.originalMaterials.set(relatedOrb.uuid, relatedOrb.material.clone());
          }
          
          // Create related entry effect (less intense than selection)
          const relatedMaterial = relatedOrb.material.clone();
          relatedMaterial.emissive = relatedOrb.material.color ? 
            relatedOrb.material.color.clone() : 
            new THREE.Color(0.7, 0.7, 1.0);
          relatedMaterial.emissiveIntensity = 0.7;
          
          // Apply related entry material
          relatedOrb.material = relatedMaterial;
          
          // Track this object for later cleanup
          this.relatedEntryObjects.push(relatedOrb);
          
          // Create a connection line between selected and related orbs
          const connectionKey = [selectedObj.uuid, relatedOrb.uuid].sort().join('-');
          if (!connections.has(connectionKey)) {
            const line = this.createConnectionLine(selectedObj, relatedOrb);
            if (line) {
              this.connectionLines.push(line);
              connections.add(connectionKey);
            }
          }
        } catch (error) {
          console.error(`Error processing related entry ${relatedId}:`, error);
        }
      });
    } catch (error) {
      console.error('Error highlighting related entries:', error);
      
      // Clean up in case of error
      this.cleanupRelatedEntries();
    }
  }
  
  /**
   * Create a connection line between two objects
   * @param {THREE.Object3D} sourceObj - Source object
   * @param {THREE.Object3D} targetObj - Target object
   * @returns {THREE.Line} The created line
   */
  createConnectionLine(sourceObj, targetObj) {
    try {
      // Create line material
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.6,
        depthTest: true 
      });
      
      // Create geometry for the line connecting the two points
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        sourceObj.position.clone(),
        targetObj.position.clone()
      ];
      lineGeometry.setFromPoints(points);
      
      // Create the line and add to scene
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
      
      return line;
    } catch (error) {
      console.error('Error creating connection line:', error);
      return null;
    }
  }
  
  /**
   * Clean up related entries highlighting
   */
  cleanupRelatedEntries() {
    try {
      // Reset material for all related objects
      this.relatedEntryObjects.forEach(obj => {
        if (!obj) return;
        
        // Reset to original material if available
        if (this.originalMaterials.has(obj.uuid)) {
          // Dispose of current material to prevent memory leaks
          if (obj.material) obj.material.dispose();
          
          // Restore original material
          obj.material = this.originalMaterials.get(obj.uuid).clone();
          this.originalMaterials.delete(obj.uuid);
        }
        
        // Remove performance flags
        if (obj.userData) {
          obj.userData.related = false;
          obj.userData.selected = false;
          obj.userData.optimizationDisabled = false;
        }
      });
      
      // Clear the tracking array
      this.relatedEntryObjects = [];
      
      // Remove connection lines
      this.connectionLines.forEach(line => {
        if (!line) return;
        
        // Dispose of line resources
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
        
        // Remove from scene
        this.scene.remove(line);
      });
      
      // Clear the tracking array
      this.connectionLines = [];
      
      // Resume performance optimizations if available
      const performanceOptimizer = this.scene.userData?.performanceOptimizer;
      if (performanceOptimizer) {
        // Allow optimizations to resume
        performanceOptimizer.resumeOptimizations();
      }
    } catch (error) {
      console.error('Error cleaning up related entries:', error);
    }
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