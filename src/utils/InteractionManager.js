import * as THREE from 'three';

/**
 * Manages interactions with objects in the 3D scene
 */
export default class InteractionManager {
  constructor(options = {}) {
    // Raycaster for intersection testing
    this.raycaster = new THREE.Raycaster();
    
    // Selection and interaction variables
    this.selectedObject = null;
    this.hoveredObject = null;
    
    // Callbacks
    this.onSelect = options.onSelect || null;
    this.onDeselect = options.onDeselect || null;
    this.onHover = options.onHover || null;
    this.onHoverEnd = options.onHoverEnd || null;
    
    // Function to get interactive objects
    this.getInteractiveObjects = options.getInteractiveObjects || (() => []);
    
    // Optional visualizer for material effects
    this.visualizer = options.visualizer || null;
  }
  
  /**
   * Handle selection of an object
   * @param {Object} selectedObj - The object to select
   */
  handleSelection(selectedObj) {
    // If clicking the already selected object, deselect it
    if (this.selectedObject === selectedObj) {
      this.deselectObject();
      return;
    }
    
    // If there was a previously selected object, deselect it
    if (this.selectedObject) {
      this.deselectObject();
    }
    
    // Select new object
    this.selectedObject = selectedObj;
    
    // Apply selection effect if visualizer is available
    if (this.visualizer) {
      this.visualizer.applySelectionEffect(selectedObj);
    }
    
    // Call onSelect callback if provided
    if (this.onSelect) {
      this.onSelect(selectedObj);
    }
  }
  
  /**
   * Deselect the currently selected object
   */
  deselectObject() {
    if (this.selectedObject) {
      // Reset the object's material if visualizer is available
      if (this.visualizer) {
        this.visualizer.resetObjectMaterial(this.selectedObject);
      }
      
      // Store the object being deselected for the callback
      const deselectedObject = this.selectedObject;
      this.selectedObject = null;
      
      // Call onDeselect callback if provided
      if (this.onDeselect) {
        this.onDeselect(deselectedObject);
      }
    }
  }
  
  /**
   * Handle object hover effect
   * @param {Object} object - The object to hover
   */
  handleHover(object) {
    // If object is already hovered or selected, do nothing
    if (this.hoveredObject === object || this.selectedObject === object) {
      return;
    }
    
    // Remove hover effect from previous object
    if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
      if (this.visualizer) {
        this.visualizer.resetObjectMaterial(this.hoveredObject);
      }
      
      // Call onHoverEnd callback if provided
      if (this.onHoverEnd) {
        this.onHoverEnd(this.hoveredObject);
      }
    }
    
    // Apply hover effect to new object if it's not selected
    if (object && object !== this.selectedObject) {
      if (this.visualizer) {
        this.visualizer.applyHoverEffect(object);
      }
      
      // Call onHover callback if provided
      if (this.onHover) {
        this.onHover(object);
      }
    }
    
    this.hoveredObject = object;
  }
  
  /**
   * Process desktop selection based on mouse coordinates
   * @param {THREE.Vector2} mouse - Normalized mouse coordinates
   * @param {THREE.Camera} camera - The camera to use for raycasting
   */
  processDesktopSelection(mouse, camera) {
    // Update raycaster with mouse position
    this.raycaster.setFromCamera(mouse, camera);
    
    // Get only interactive objects for better performance
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(interactiveObjects, false);
    
    // Find first interactive object
    const intersectedObject = intersects.length > 0 ? intersects[0].object : null;
    
    // Handle selection
    if (intersectedObject) {
      this.handleSelection(intersectedObject);
    } else {
      // Deselect if clicking away from objects
      this.deselectObject();
    }
  }
  
  /**
   * Process desktop hover effect based on mouse coordinates
   * @param {THREE.Vector2} mouse - Normalized mouse coordinates
   * @param {THREE.Camera} camera - The camera to use for raycasting
   * @returns {boolean} Whether an interactive object is being hovered
   */
  processDesktopHover(mouse, camera) {
    // Update raycaster with mouse position
    this.raycaster.setFromCamera(mouse, camera);
    
    // Get only interactive objects for better performance
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(interactiveObjects, false);
    
    // Find first interactive object
    const intersectedObject = intersects.length > 0 ? intersects[0].object : null;
    
    // Handle hover effect
    this.handleHover(intersectedObject);
    
    // Return true if hovering over an interactive object
    return !!intersectedObject;
  }
  
  /**
   * Process VR controller intersection
   * @param {Object} intersection - The intersection result from controller raycasting
   */
  processVRSelection(intersection) {
    if (intersection) {
      this.handleSelection(intersection.object);
    } else {
      // Deselect if not pointing at anything
      this.deselectObject();
    }
  }
  
  /**
   * Process VR controller hover
   * @param {Object} intersection - The intersection result from controller raycasting
   */
  processVRHover(intersection) {
    if (intersection) {
      this.handleHover(intersection.object);
    } else {
      // Remove hover if not pointing at anything
      this.handleHover(null);
    }
  }
  
  /**
   * Get the currently selected object
   * @returns {Object} The selected object
   */
  getSelectedObject() {
    return this.selectedObject;
  }
  
  /**
   * Get the currently hovered object
   * @returns {Object} The hovered object
   */
  getHoveredObject() {
    return this.hoveredObject;
  }
  
  /**
   * Clean up any references
   */
  dispose() {
    this.deselectObject();
    this.hoveredObject = null;
    this.selectedObject = null;
  }
} 