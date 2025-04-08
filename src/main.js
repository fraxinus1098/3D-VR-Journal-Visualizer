import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

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
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
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
    // This will be expanded in Phase 3.2 with more detailed interaction
    // Basic implementation for Phase 2.3
    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    
    // Detect interactive objects will be implemented in later phases
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
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00aaff,
      emissive: 0x003366,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1.6, -3); // Position in front of the camera
    this.scene.add(cube);
    
    // Store reference to animate it
    this.testCube = cube;
  }
  
  onWindowResize() {
    // Update camera aspect ratio and renderer size when window is resized
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate(timestamp, frame) {
    // Process desktop controls when not in VR
    if (!this.renderer.xr.isPresenting) {
      this.processDesktopControls();
    }
    // Process controller input for movement in VR
    else if (frame) {
      this.processControllerInput();
    }
    
    // Animate test cube
    if (this.testCube) {
      this.testCube.rotation.x += 0.01;
      this.testCube.rotation.y += 0.01;
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 