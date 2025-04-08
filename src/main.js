import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import DataLoader from './utils/data-loader.js';

// Main class for the WebXR application
class WarholJournalViz {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controllers = [];
    this.controllerGrips = [];
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    this.movementVector = new THREE.Vector3();
    this.movementEnabled = true;
    this.movementSpeed = 0.05;
    
    // Desktop control variables
    this.keys = {};
    this.mouseDown = false;
    this.mouseSensitivity = 0.002;
    this.previousMousePosition = { x: 0, y: 0 };
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    
    // Data and visualization variables
    this.dataLoader = new DataLoader();
    this.journalEntries = [];
    this.orbObjects = new Map(); // Map entry IDs to Three.js objects
    
    this.init();
  }

  init() {
    // Create a scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011); // Dark blue background
    
    // Create a camera
    this.camera = new THREE.PerspectiveCamera(
      75,                                    // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1,                                   // Near clipping plane
      1000                                   // Far clipping plane
    );
    this.camera.position.set(0, 1.6, 3);     // Position camera at eye level
    
    // Create a renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,                       // Enable antialiasing
      alpha: true                            // Enable transparency
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;         // Enable WebXR
    
    // Append the renderer's canvas to the DOM
    document.getElementById('app').appendChild(this.renderer.domElement);
    
    // Add VR button
    document.getElementById('app').appendChild(VRButton.createButton(this.renderer));
    
    // Set up XR controllers
    this.setupControllers();
    
    // Set up desktop controls
    this.setupDesktopControls();
    
    // Add basic lighting
    this.addLighting();
    
    // Add a simple test cube to confirm the scene is working
    this.addTestCube();
    
    // Load data and create visualization
    this.loadData();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Start the animation loop using the built-in WebXR animation loop
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }
  
  setupDesktopControls() {
    // Add keyboard event listeners
    window.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
    });
    
    // Add mouse event listeners for rotation
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Left mouse button
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
        // Restore the cursor
        canvas.style.cursor = 'grab';
      }
    });
    
    canvas.addEventListener('mouseleave', () => {
      this.mouseDown = false;
      canvas.style.cursor = 'grab';
    });
    
    window.addEventListener('mousemove', (event) => {
      if (this.mouseDown) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        // Update camera rotation based on mouse movement
        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= deltaX * this.mouseSensitivity;
        this.euler.x -= deltaY * this.mouseSensitivity;
        
        // Limit vertical rotation to avoid flipping
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
        
        this.camera.quaternion.setFromEuler(this.euler);
        
        this.previousMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
      }
    });
    
    // Set initial cursor style
    canvas.style.cursor = 'grab';
    
    // Add pointer lock for smoother mouse control (optional)
    canvas.addEventListener('click', () => {
      if (!this.renderer.xr.isPresenting) {
        canvas.requestPointerLock = canvas.requestPointerLock || 
                                    canvas.mozRequestPointerLock ||
                                    canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
      }
    });
  }
  
  processDesktopControls() {
    if (this.renderer.xr.isPresenting) return; // Skip if in VR mode
    
    const speed = 0.1;
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
  
  setupControllers() {
    // Controller model factory to load appropriate controller models
    const controllerModelFactory = new XRControllerModelFactory();
    
    // Setup controller 0 (right hand)
    this.controller0 = this.renderer.xr.getController(0);
    this.controller0.addEventListener('selectstart', this.onSelectStart.bind(this));
    this.controller0.addEventListener('selectend', this.onSelectEnd.bind(this));
    this.scene.add(this.controller0);
    this.controllers.push(this.controller0);
    
    // Setup controller 1 (left hand)
    this.controller1 = this.renderer.xr.getController(1);
    this.controller1.addEventListener('selectstart', this.onSelectStart.bind(this));
    this.controller1.addEventListener('selectend', this.onSelectEnd.bind(this));
    this.scene.add(this.controller1);
    this.controllers.push(this.controller1);
    
    // Controller grips (visual models)
    this.controllerGrip0 = this.renderer.xr.getControllerGrip(0);
    this.controllerGrip0.add(controllerModelFactory.createControllerModel(this.controllerGrip0));
    this.scene.add(this.controllerGrip0);
    this.controllerGrips.push(this.controllerGrip0);
    
    this.controllerGrip1 = this.renderer.xr.getControllerGrip(1);
    this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
    this.scene.add(this.controllerGrip1);
    this.controllerGrips.push(this.controllerGrip1);
    
    // Add ray visualization to controllers
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    geometry.scale(1, 1, 5); // Make the ray 5 units long
    
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    
    const line = new THREE.Line(geometry, material);
    line.name = 'ray';
    line.scale.z = 5;
    
    this.controller0.add(line.clone());
    this.controller1.add(line.clone());
    
    // Add event listeners for thumbstick movement
    this.controller0.addEventListener('squeezestart', this.onSqueezeStart.bind(this));
    this.controller0.addEventListener('squeezeend', this.onSqueezeEnd.bind(this));
    this.controller1.addEventListener('squeezestart', this.onSqueezeStart.bind(this));
    this.controller1.addEventListener('squeezeend', this.onSqueezeEnd.bind(this));
    
    // Listen for thumbstick movement
    this.renderer.xr.addEventListener('inputsourceschange', this.onInputSourcesChange.bind(this));
  }
  
  onInputSourcesChange(event) {
    const session = this.renderer.xr.getSession();
    if (!session) return;
    
    session.inputSources.forEach(inputSource => {
      if (inputSource.gamepad) {
        // Store reference to the gamepad for thumbstick movement
        if (inputSource.handedness === 'left') {
          this.leftGamepad = inputSource.gamepad;
        } else if (inputSource.handedness === 'right') {
          this.rightGamepad = inputSource.gamepad;
        }
      }
    });
  }
  
  onSelectStart(event) {
    const controller = event.target;
    controller.userData.isSelecting = true;
    
    // Highlight if ray intersects with an interactive object
    this.handleRayIntersection(controller);
  }
  
  onSelectEnd(event) {
    const controller = event.target;
    controller.userData.isSelecting = false;
    
    // Handle selection interaction (select object, etc.)
    // This will be expanded in Phase 3.2
  }
  
  onSqueezeStart(event) {
    const controller = event.target;
    controller.userData.isSqueezing = true;
  }
  
  onSqueezeEnd(event) {
    const controller = event.target;
    controller.userData.isSqueezing = false;
  }
  
  handleRayIntersection(controller) {
    // Set raycaster from controller position and orientation
    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    
    // Get intersections with interactive objects
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Find first interactive object
    const interactive = intersects.find(intersect => 
      intersect.object.userData && 
      intersect.object.userData.interactive
    );
    
    return interactive;
  }
  
  processControllerInput() {
    // Process thumbstick input for movement
    if (this.leftGamepad) {
      const axes = this.leftGamepad.axes;
      if (axes.length >= 2) {
        // Get horizontal and vertical thumbstick values (-1 to 1)
        const horizontal = axes[0];
        const vertical = axes[1];
        
        // Only process if thumbstick is being moved significantly
        if (Math.abs(horizontal) > 0.2 || Math.abs(vertical) > 0.2) {
          // Get camera direction and orientation for movement
          const cameraDirection = new THREE.Vector3(0, 0, -1);
          cameraDirection.applyQuaternion(this.camera.quaternion);
          cameraDirection.y = 0; // Keep movement horizontal
          cameraDirection.normalize();
          
          // Get right vector relative to camera
          const rightVector = new THREE.Vector3(1, 0, 0);
          rightVector.applyQuaternion(this.camera.quaternion);
          rightVector.y = 0;
          rightVector.normalize();
          
          // Calculate movement vector based on thumbstick input
          this.movementVector.set(0, 0, 0);
          this.movementVector.add(cameraDirection.multiplyScalar(-vertical)); // Forward/backward
          this.movementVector.add(rightVector.multiplyScalar(horizontal));    // Left/right
          this.movementVector.normalize().multiplyScalar(this.movementSpeed);
          
          // Apply movement to camera position
          if (this.movementEnabled) {
            this.camera.position.add(this.movementVector);
          }
        }
      }
    }
  }
  
  addLighting() {
    // Add ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Add directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);
  }
  
  addTestCube() {
    // Create a simple cube to verify the scene is working
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x003300,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7
    });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.position.set(0, 1.6, -2); // Position in front of the camera
    this.testCube.userData.interactive = true;
    this.testCube.userData.type = 'test-cube';
    this.scene.add(this.testCube);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate(timestamp, frame) {
    // Process desktop controls if not in VR
    if (!this.renderer.xr.isPresenting) {
      this.processDesktopControls();
    }
    
    // Process controller input in VR
    if (this.renderer.xr.isPresenting) {
      this.processControllerInput();
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Load journal data and create visualization
   */
  async loadData() {
    try {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('loading-text').textContent = 'Loading journal data...';
      
      // Load the full dataset
      const data = await this.dataLoader.loadData('/data/warhol_final.json');
      this.journalEntries = data.entries;
      
      // Create visualization once data is loaded
      this.createVisualization();
      
      document.getElementById('loading').style.display = 'none';
    } catch (error) {
      console.error('Error loading data:', error);
      document.getElementById('loading-text').textContent = 'Error loading data. Please refresh and try again.';
    }
  }
  
  /**
   * Create the 3D visualization of journal entries
   */
  createVisualization() {
    if (!this.journalEntries || this.journalEntries.length === 0) {
      console.warn('No journal entries to visualize');
      return;
    }
    
    console.log(`Creating visualization for ${this.journalEntries.length} entries`);
    
    // Create a group to hold all orbs
    this.orbGroup = new THREE.Group();
    this.scene.add(this.orbGroup);
    
    // Create orbs for each journal entry
    this.journalEntries.forEach(entry => {
      const orb = this.createOrb(entry);
      this.orbGroup.add(orb);
      this.orbObjects.set(entry.id, orb);
    });
    
    // Hide test cube if it exists
    if (this.testCube) {
      this.testCube.visible = false;
    }
  }
  
  /**
   * Create a single orb representing a journal entry
   * @param {Object} entry - Journal entry data
   * @returns {THREE.Mesh} - The created orb mesh
   */
  createOrb(entry) {
    // Determine radius based on emotional intensity
    const emotionValues = Object.values(entry.emotions);
    const emotionalIntensity = Math.max(...emotionValues);
    const radius = 0.1 + (emotionalIntensity * 0.1); // Base size + emotion-based scaling
    
    // Create sphere geometry with detail proportional to size
    const segments = Math.max(16, Math.floor(radius * 100));
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    // Determine color based on dominant emotion
    const dominantEmotion = this.getDominantEmotion(entry.emotions);
    const color = this.getEmotionColor(dominantEmotion);
    
    // Create material with emissive properties for glow effect
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.3
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
   * Determine the dominant emotion in an emotion object
   * @param {Object} emotions - Object with emotion names as keys and intensities as values
   * @returns {string} - The name of the dominant emotion
   */
  getDominantEmotion(emotions) {
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
   * Get a color for an emotion based on Plutchik's wheel
   * @param {string} emotion - Emotion name
   * @returns {THREE.Color} - Color for the emotion
   */
  getEmotionColor(emotion) {
    // Define colors based on Plutchik's wheel
    const emotionColors = {
      joy: 0xFFFF00,         // Yellow
      trust: 0x00FF00,       // Green
      fear: 0x00FF00,        // Green (darker shade)
      surprise: 0x00FFFF,    // Cyan
      sadness: 0x0000FF,     // Blue
      disgust: 0x800080,     // Purple
      anger: 0xFF0000,       // Red
      anticipation: 0xFFA500, // Orange
      neutral: 0xCCCCCC      // Gray
    };
    
    return new THREE.Color(emotionColors[emotion] || emotionColors.neutral);
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 