import * as THREE from 'three';

/**
 * Handles performance optimizations for the 3D visualization
 * Implements frustum culling and level-of-detail techniques
 */
export default class PerformanceOptimizer {
  constructor(options = {}) {
    // Configuration options with defaults
    this.options = Object.assign({
      cullingDistance: 20,              // Distance beyond which to cull objects
      updateFrequency: 10,              // Update culling every N frames
      lodDistances: [5, 10, 20],        // Distances for LOD levels
      lodDetailLevels: [16, 12, 8, 4],  // Sphere segments for each detail level
      lodMaterialSimplify: true,        // Whether to simplify materials for distant objects
      debug: false                      // Show debug info
    }, options);
    
    // Frustum for culling
    this.frustum = new THREE.Frustum();
    
    // Performance tracking
    this.frameCount = 0;
    this.visibleCount = 0;
    this.culledCount = 0;
    
    // LOD tracking
    this.lodLevels = new Map(); // Store current LOD level for each object
    
    // Geometry cache for different LOD levels
    this.geometryCache = new Map();
    
    // Reference to objects being optimized
    this.objectsToOptimize = [];
    this.camera = null;
    
    // Debug helpers
    this.debugObjects = [];
    
    // Enable/disable flag
    this.isEnabled = true;
    
    // Temporary disable flag used when orbs are selected
    this.temporarilyDisabled = false;
    
    // Track if we've done a full restoration
    this.hasRestoredAll = false;
  }
  
  /**
   * Initialize the optimizer with objects and camera
   * @param {Array} objects - Array of objects to optimize
   * @param {THREE.Camera} camera - Camera for frustum culling
   */
  init(objects, camera) {
    this.objectsToOptimize = objects;
    this.camera = camera;
    
    // Create cached geometries for LOD
    this.createGeometryCache();
    
    // Initialize LOD levels for all objects
    this.initLodLevels();
    
    console.log(`Performance optimizer initialized with ${objects.length} objects`);
  }
  
  /**
   * Enable performance optimizations
   */
  enable() {
    if (this.isEnabled) return;
    
    // Check if any objects are currently selected
    const anySelected = this.checkForSelectedOrbs();
    if (anySelected) {
      console.log('Cannot enable optimizations when orbs are selected');
      return;
    }
    
    this.isEnabled = true;
    this.temporarilyDisabled = false;
    this.hasRestoredAll = false;
    console.log('Performance optimizations enabled');
    
    // Force update
    this.frameCount = 0;
    this.update();
  }
  
  /**
   * Disable performance optimizations
   */
  disable() {
    if (!this.isEnabled && !this.temporarilyDisabled) return;
    
    this.isEnabled = false;
    this.temporarilyDisabled = false;
    console.log('Performance optimizations disabled');
    
    // Restore original state
    this.restoreAll();
  }
  
  /**
   * Temporarily disable optimizations (used during selection)
   */
  temporarilyDisable() {
    if (this.temporarilyDisabled) return;
    
    console.log('Temporarily disabling performance optimizations for selection');
    this.temporarilyDisabled = true;
    
    // Restore everything to original state
    if (!this.hasRestoredAll) {
      this.restoreAll();
      this.hasRestoredAll = true;
    }
  }
  
  /**
   * Resume optimizations after temporary disable
   */
  resumeOptimizations() {
    if (!this.temporarilyDisabled || !this.isEnabled) return;
    
    // Check if any objects are still selected
    const anySelected = this.checkForSelectedOrbs();
    if (anySelected) {
      console.log('Cannot resume optimizations while orbs are still selected');
      return;
    }
    
    console.log('Resuming performance optimizations');
    this.temporarilyDisabled = false;
    this.hasRestoredAll = false;
    
    // Force update
    this.frameCount = 0;
    this.update();
  }
  
  /**
   * Check if any orbs are currently selected
   * @returns {boolean} Whether any orbs are selected
   */
  checkForSelectedOrbs() {
    return this.objectsToOptimize.some(obj => 
      obj && obj.userData && (obj.userData.selected || obj.userData.related)
    );
  }
  
  /**
   * Create geometries for different LOD levels
   */
  createGeometryCache() {
    this.geometryCache.clear();
    
    // Create sphere geometries with different detail levels
    for (const segments of this.options.lodDetailLevels) {
      // Create cache entry for different sizes
      const segmentCache = new Map();
      
      // We'll create specific sizes on demand
      this.geometryCache.set(segments, segmentCache);
    }
  }
  
  /**
   * Get cached geometry for a specific radius and detail level
   * @param {number} radius - Sphere radius
   * @param {number} segments - Sphere segments (detail)
   * @returns {THREE.SphereGeometry} - Cached or newly created geometry
   */
  getGeometry(radius, segments) {
    const segmentCache = this.geometryCache.get(segments);
    if (!segmentCache) return null;
    
    // Round radius to nearest 0.01 to limit cache size
    const roundedRadius = Math.round(radius * 100) / 100;
    
    if (!segmentCache.has(roundedRadius)) {
      // Create and cache the geometry
      const geometry = new THREE.SphereGeometry(roundedRadius, segments, segments);
      segmentCache.set(roundedRadius, geometry);
    }
    
    return segmentCache.get(roundedRadius);
  }
  
  /**
   * Initialize LOD levels for all objects
   */
  initLodLevels() {
    this.lodLevels.clear();
    
    // Store initial LOD level for each object (highest detail)
    for (const obj of this.objectsToOptimize) {
      if (obj.userData && obj.userData.type === 'journal-entry') {
        this.lodLevels.set(obj.id, 0); // Start at highest detail
      }
    }
  }
  
  /**
   * Update frustum culling and LOD for the current frame
   */
  update() {
    // Skip if disabled or no objects/camera
    if (!this.camera || this.objectsToOptimize.length === 0 || !this.isEnabled || this.temporarilyDisabled) {
      // If disabled, ensure all objects are visible
      if (!this.isEnabled || this.temporarilyDisabled) {
        this.ensureAllVisible();
      }
      return;
    }
    
    // Only update every N frames for performance
    this.frameCount++;
    if (this.frameCount % this.options.updateFrequency !== 0) return;
    
    // Check for any selected objects - if found, temporarily disable optimizations
    const anySelected = this.checkForSelectedOrbs();
    if (anySelected) {
      this.temporarilyDisable();
      return;
    }
    
    // Update camera frustum
    this.updateFrustum();
    
    // Reset counts
    this.visibleCount = 0;
    this.culledCount = 0;
    
    // Get camera position for distance checks
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    
    // Process each object
    for (const obj of this.objectsToOptimize) {
      // Skip invalid objects
      if (!obj || !obj.userData || obj.userData.type !== 'journal-entry') continue;
      
      // Skip selected or related objects
      if (obj.userData.selected || obj.userData.related) {
        this.restoreOriginal(obj);
        obj.visible = true;
        this.visibleCount++;
        continue;
      }
      
      try {
        // Calculate distance to camera
        const distance = obj.position.distanceTo(cameraPosition);
        
        // Apply frustum culling for distant objects
        if (distance > this.options.cullingDistance) {
          // Check if object is in view frustum
          const inFrustum = this.frustum.containsPoint(obj.position);
          obj.visible = inFrustum;
          
          if (inFrustum) {
            this.visibleCount++;
          } else {
            this.culledCount++;
          }
        } else {
          // Always show nearby objects
          obj.visible = true;
          this.visibleCount++;
        }
        
        // Apply LOD if object is visible
        if (obj.visible) {
          this.applyLOD(obj, distance);
        }
      } catch (error) {
        console.error('Error processing object in performance optimizer:', error);
        // Ensure object is visible in case of error
        obj.visible = true;
        this.visibleCount++;
        
        // Restore original state
        this.restoreOriginal(obj);
      }
    }
    
    if (this.options.debug && this.frameCount % 60 === 0) {
      console.log(`Performance: Visible: ${this.visibleCount}, Culled: ${this.culledCount}`);
    }
  }
  
  /**
   * Update the camera frustum for culling calculations
   */
  updateFrustum() {
    // Update the projection matrix
    this.camera.updateMatrixWorld();
    
    // Extract frustum from camera
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    
    this.frustum.setFromProjectionMatrix(projScreenMatrix);
  }
  
  /**
   * Apply level-of-detail changes based on distance
   * @param {THREE.Object3D} obj - The object to apply LOD to
   * @param {number} distance - Distance from camera to object
   */
  applyLOD(obj, distance) {
    // Skip if target is invalid or disabled
    if (!obj || !obj.visible || obj.userData?.optimizationDisabled) {
      return;
    }
    
    // Skip if object is currently selected or related to selection
    if (obj.userData?.selected || obj.userData?.related) {
      // Force object to be visible and at high detail
      this.restoreFull(obj);
      return;
    }
    
    // Get the appropriate LOD level based on distance
    let newLodLevel = 0; // Default to highest detail
    
    for (let i = 0; i < this.options.lodDistances.length; i++) {
      if (distance > this.options.lodDistances[i]) {
        newLodLevel = i + 1;
      }
    }
    
    // Check if LOD level has changed
    const currentLodLevel = this.lodLevels.get(obj.id);
    if (currentLodLevel === newLodLevel) return;
    
    // Store new LOD level
    this.lodLevels.set(obj.id, newLodLevel);
    
    try {
      // Apply the appropriate geometry based on LOD level
      this.updateObjectGeometry(obj, newLodLevel);
      
      // Apply material simplification for distant objects if enabled
      if (this.options.lodMaterialSimplify) {
        this.updateObjectMaterial(obj, newLodLevel);
      }
    } catch (error) {
      console.error('Error applying LOD to object:', error);
      // Restore to original state in case of error
      this.restoreOriginal(obj);
    }
  }
  
  /**
   * Fully restores an object to its original state
   * @param {Object} target - Target to restore
   */
  restoreFull(target) {
    try {
      if (!target) return;
      
      // Ensure visibility
      target.visible = true;
      
      // Reset any LOD properties
      if (target.userData) {
        // Store current optimization state
        const wasOptimized = target.userData.optimized;
        
        // Reset optimization flags
        target.userData.optimized = false;
        target.userData.detail = 'high';
        
        // Restore original properties if they were saved
        if (wasOptimized && target.userData.originalGeometry) {
          target.geometry?.dispose();
          target.geometry = target.userData.originalGeometry;
          delete target.userData.originalGeometry;
        }
        
        // Remove any optimization flags
        delete target.userData.optimizedDistance;
        delete target.userData.lodLevel;
      }
      
      // Re-enable any children that might have been hidden
      if (target.children && target.children.length > 0) {
        target.children.forEach(child => {
          if (child) {
            child.visible = true;
            
            // Recursively restore child objects if they have optimization props
            if (child.userData && (child.userData.optimized || child.userData.originalGeometry)) {
              this.restoreFull(child);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error restoring object:', error);
    }
  }
  
  /**
   * Restore an object to its original state
   * @param {THREE.Object3D} obj - The object to restore
   */
  restoreOriginal(obj) {
    if (!obj || !obj.userData) return;
    
    try {
      // Skip if already restored
      if (!obj.userData.originalGeometry && !obj.userData.originalMaterial) {
        return;
      }
      
      // Restore original geometry if saved
      if (obj.userData.originalGeometry) {
        obj.geometry = obj.userData.originalGeometry;
        delete obj.userData.originalGeometry;
      }
      
      // Restore original material if saved
      if (obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial.clone();
        obj.userData.materialSimplified = false;
        delete obj.userData.originalMaterial;
      }
      
      // Reset LOD level
      this.lodLevels.set(obj.id, 0);
    } catch (error) {
      console.error('Error restoring original object:', error);
    }
  }
  
  /**
   * Update object's geometry based on LOD level
   * @param {THREE.Mesh} obj - The object to update
   * @param {number} lodLevel - The LOD level (0 = highest detail)
   */
  updateObjectGeometry(obj, lodLevel) {
    if (!obj.geometry || !obj.geometry.parameters || !obj.geometry.parameters.radius) {
      return; // Not a sphere or missing parameters
    }
    
    // Get the appropriate detail level
    const detailLevel = this.options.lodDetailLevels[
      Math.min(lodLevel, this.options.lodDetailLevels.length - 1)
    ];
    
    // Get radius from existing geometry
    const radius = obj.geometry.parameters.radius;
    
    // Get cached geometry
    const newGeometry = this.getGeometry(radius, detailLevel);
    if (newGeometry && obj.geometry !== newGeometry) {
      // Store original geometry if not already stored
      if (!obj.userData.originalGeometry) {
        obj.userData.originalGeometry = obj.geometry;
      }
      
      // Update geometry
      obj.geometry = newGeometry;
    }
  }
  
  /**
   * Update object's material based on LOD level
   * @param {THREE.Mesh} obj - The object to update
   * @param {number} lodLevel - The LOD level (0 = highest detail)
   */
  updateObjectMaterial(obj, lodLevel) {
    // Store original material if not already stored
    if (!obj.userData.originalMaterial && obj.material) {
      obj.userData.originalMaterial = obj.material.clone();
    }
    
    // Only simplify for distant objects (LOD level > 1)
    if (lodLevel <= 1 || !obj.userData.originalMaterial) {
      // Restore original material if we're going back to high detail
      if (obj.userData.materialSimplified && obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial.clone();
        obj.userData.materialSimplified = false;
      }
      return;
    }
    
    // Skip if already simplified
    if (obj.userData.materialSimplified) return;
    
    try {
      // For distant objects, create a simpler material
      const simpleMaterial = new THREE.MeshBasicMaterial({
        color: obj.material.color ? obj.material.color.clone() : new THREE.Color(0.7, 0.7, 0.7),
        transparent: true,
        opacity: obj.material.opacity * 0.8  // Reduce opacity slightly
      });
      
      // Apply the simplified material
      obj.material = simpleMaterial;
      obj.userData.materialSimplified = true;
    } catch (error) {
      console.error('Error updating object material:', error);
      // In case of error, ensure we don't leave the object in a bad state
      if (obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial.clone();
      }
    }
  }
  
  /**
   * Restore all objects to their original state
   */
  restoreAll() {
    console.log('Restoring all objects to original state');
    
    for (const obj of this.objectsToOptimize) {
      if (!obj || !obj.userData) continue;
      
      try {
        // Restore original geometry
        if (obj.userData.originalGeometry) {
          obj.geometry.dispose(); // Clean up the simplified geometry
          obj.geometry = obj.userData.originalGeometry;
          delete obj.userData.originalGeometry;
        }
        
        // Restore original material
        if (obj.userData.originalMaterial) {
          if (obj.material) obj.material.dispose(); // Clean up simplified material
          obj.material = obj.userData.originalMaterial.clone();
          delete obj.userData.originalMaterial;
        }
        
        // Reset visibility
        obj.visible = true;
        
        // Reset LOD flags
        obj.userData.materialSimplified = false;
        this.lodLevels.set(obj.id, 0);
      } catch (error) {
        console.error('Error restoring object state:', error);
      }
    }
    
    this.hasRestoredAll = true;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Restore original state
    this.restoreAll();
    
    // Clear geometry cache
    for (const segmentCache of this.geometryCache.values()) {
      for (const geometry of segmentCache.values()) {
        geometry.dispose();
      }
      segmentCache.clear();
    }
    this.geometryCache.clear();
    
    // Clear references
    this.objectsToOptimize = [];
    this.camera = null;
    this.lodLevels.clear();
    
    // Clean up debug objects
    for (const obj of this.debugObjects) {
      obj.parent?.remove(obj);
      if (obj.material) obj.material.dispose();
      if (obj.geometry) obj.geometry.dispose();
    }
    this.debugObjects = [];
  }
  
  /**
   * Ensure all objects are visible (used when disabling optimizations)
   */
  ensureAllVisible() {
    for (const obj of this.objectsToOptimize) {
      if (obj) obj.visible = true;
    }
  }
} 