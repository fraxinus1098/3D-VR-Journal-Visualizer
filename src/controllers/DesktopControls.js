import * as THREE from 'three';

/**
 * Manages desktop (mouse/keyboard) controls for non-VR use
 */
export default class DesktopControls {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Desktop control variables
    this.keys = {};
    this.mouseDown = false;
    this.isDragging = false;
    this.mouseSensitivity = options.mouseSensitivity || 0.002;
    this.movementSpeed = options.movementSpeed || 0.1;
    this.previousMousePosition = { x: 0, y: 0 };
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.mouse = new THREE.Vector2(); // For desktop raycasting
    
    // Selection and interaction callbacks
    this.onSelect = options.onSelect || null;
    this.onHover = options.onHover || null;
    this.getRaycaster = options.getRaycaster || (() => new THREE.Raycaster());
    this.getInteractiveObjects = options.getInteractiveObjects || (() => []);
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Add keyboard event listeners
    window.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
    });
    
    // Add mouse event listeners for rotation
    const canvas = this.domElement;
    
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Left mouse button
        // Check if this is a click (for selection) or a drag (for camera rotation)
        if (!this.isDragging) {
          // Update mouse position for raycasting
          this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
          
          // Perform raycasting for selection
          this.handleSelection();
        }
        
        this.mouseDown = true;
        this.previousMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
        // Hide the cursor during rotation
        canvas.style.cursor = 'grabbing';
      }
    });
    
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) { // Left mouse button
        this.mouseDown = false;
        this.isDragging = false;
        // Restore the cursor
        canvas.style.cursor = 'grab';
      }
    });
    
    canvas.addEventListener('mouseleave', () => {
      this.mouseDown = false;
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mousemove', (event) => {
      // Update mouse position for hover effects
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      if (this.mouseDown) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        // If the mouse has moved a significant amount, consider it a drag
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
          this.isDragging = true;
        }
        
        if (this.isDragging) {
          // Update camera rotation based on mouse movement
          this.euler.setFromQuaternion(this.camera.quaternion);
          this.euler.y -= deltaX * this.mouseSensitivity;
          this.euler.x -= deltaY * this.mouseSensitivity;
          
          // Limit vertical rotation to avoid flipping
          this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
          
          this.camera.quaternion.setFromEuler(this.euler);
        }
        
        this.previousMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
      } else {
        // Handle hover effect when mouse is not being pressed
        this.handleHover();
      }
    });
    
    // Set initial cursor style
    canvas.style.cursor = 'grab';
    
    // Add pointer lock for smoother mouse control (optional)
    canvas.addEventListener('click', () => {
      // Only request pointer lock if it's enabled and we're not in VR
      if (this._pointerLockEnabled && !this._isVRPresenting) {
        canvas.requestPointerLock = canvas.requestPointerLock || 
                                   canvas.mozRequestPointerLock ||
                                   canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
      }
    });
  }
  
  setVRStatus(isPresenting) {
    this._isVRPresenting = isPresenting;
  }
  
  enablePointerLock(enabled) {
    this._pointerLockEnabled = enabled;
  }
  
  processControls() {
    // Skip if in VR mode
    if (this._isVRPresenting) return;
    
    const speed = this.movementSpeed;
    const direction = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    
    // Forward direction (without y component for horizontal movement)
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Right direction
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(this.camera.quaternion);
    rightVector.y = 0;
    rightVector.normalize();
    
    // Process WASD and arrow keys
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      direction.add(cameraDirection);
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      direction.sub(cameraDirection);
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      direction.sub(rightVector);
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      direction.add(rightVector);
    }
    
    // Optional: Add vertical movement with Space and Shift
    if (this.keys['Space']) {
      direction.y += 1;
    }
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
      direction.y -= 1;
    }
    
    // Apply movement if direction vector is not zero
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(speed);
      this.camera.position.add(direction);
    }
  }
  
  handleSelection() {
    // Skip if in VR mode
    if (this._isVRPresenting) return;
    
    // Get raycaster
    const raycaster = this.getRaycaster();
    
    // Update raycaster with mouse position
    raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get only interactive objects for better performance
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting
    const intersects = raycaster.intersectObjects(interactiveObjects, false);
    
    // Find first interactive object
    const intersection = intersects.length > 0 ? intersects[0] : null;
    
    // Call onSelect callback if provided
    if (this.onSelect) {
      this.onSelect(intersection);
    }
  }
  
  handleHover() {
    // Skip if in VR mode
    if (this._isVRPresenting) return;
    
    // Get raycaster
    const raycaster = this.getRaycaster();
    
    // Update raycaster with mouse position
    raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get only interactive objects for better performance
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting
    const intersects = raycaster.intersectObjects(interactiveObjects, false);
    
    // Find first interactive object
    const intersection = intersects.length > 0 ? intersects[0] : null;
    
    // Call onHover callback if provided
    if (this.onHover) {
      this.onHover(intersection);
    }
    
    // Update cursor style based on intersection
    if (intersection) {
      this.domElement.style.cursor = 'pointer';
    } else {
      this.domElement.style.cursor = 'grab';
    }
  }
  
  update() {
    // Process desktop controls
    if (!this._isVRPresenting) {
      this.processControls();
      
      // Update hover state every few frames for performance
      if (!this._lastHoverCheck) this._lastHoverCheck = 0;
      this._lastHoverCheck++;
      
      if (this._lastHoverCheck % 3 === 0) {
        this.handleHover();
      }
    }
  }
} 