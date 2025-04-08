import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import DataLoader from './utils/data-loader.js';
import EntryPanel from './components/EntryPanel.js'; // Import the EntryPanel component

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
    
    // Selection and interaction variables
    this.selectedObject = null;
    this.hoveredObject = null;
    this.originalMaterials = new Map(); // Store original materials for highlighting
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    this.mouse = new THREE.Vector2(); // For desktop raycasting
    
    // Data and visualization variables
    this.dataLoader = new DataLoader();
    this.journalEntries = [];
    this.orbObjects = new Map(); // Map entry IDs to Three.js objects
    
    // Related entries variables
    this.relatedEntryObjects = []; // Store related objects for highlighting
    this.relationLines = []; // Store line objects connecting related entries
    
    // Minimap variables
    this.minimapCamera = null;
    this.minimapScene = null;
    this.minimapRenderer = null;
    this.playerMarker = null;
    
    // Entry panel for displaying journal details
    this.entryPanel = null;
    
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
    // Camera will be positioned correctly after data is loaded
    this.camera.position.set(0, 1.6, 3);     // Initial position at eye level
    
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
    
    // Set up minimap
    this.setupMinimap();
    
    // Set up emotion color legend
    this.setupEmotionLegend();
    
    // Create entry panel for displaying journal entries
    this.entryPanel = new EntryPanel({
      camera: this.camera,
      scene: this.scene
    });
    
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
        // Check if this is a click (for selection) or a drag (for camera rotation)
        if (!this.isDragging) {
          // Update mouse position for raycasting
          this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
          
          // Perform raycasting for selection
          this.handleDesktopSelection();
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
        this.handleDesktopHover();
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
    
    // Get the object that was targeted when select started
    const interactive = this.handleRayIntersection(controller);
    
    if (interactive) {
      const selectedObj = interactive.object;
      this.handleSelection(selectedObj);
    } else if (this.selectedObject) {
      // Deselect if clicking away from objects
      this.deselectObject();
    }
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
    // Get the controller's position and orientation in world space
    controller.updateMatrixWorld();
    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    // Set raycaster origin and direction based on controller
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    
    // Get all interactive objects in the scene
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(interactiveObjects, false);
    
    // If controller ray is intersecting with something
    if (intersects.length > 0) {
      const intersection = intersects[0];
      const object = intersection.object;
      
      // Update controller visual feedback
      controller.userData.line.scale.z = intersection.distance;
      
      // Check if the intersected object is part of the entry panel
      if (this.entryPanel) {
        const interaction = this.entryPanel.checkInteraction(intersection);
        if (interaction) {
          // Store the interaction type for use in select events
          controller.userData.panelInteraction = interaction;
          
          // Use different colors for different interactions
          if (interaction === 'close') {
            controller.userData.lineColor = 0xff0000; // Red for close
          } else if (interaction === 'scroll-up' || interaction === 'scroll-down') {
            controller.userData.lineColor = 0x00ffff; // Cyan for scroll
          }
          
          controller.userData.line.material.color.set(controller.userData.lineColor);
          return;
        } else {
          controller.userData.panelInteraction = null;
        }
      }
      
      // Regular object interaction
      if (object !== this.hoveredObject) {
        // Reset previous hover effect
        if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
          this.resetObjectMaterial(this.hoveredObject);
        }
        
        // Apply hover effect to new object if it's not already selected
        if (object !== this.selectedObject) {
          this.applyHoverEffect(object);
        }
        
        this.hoveredObject = object;
      }
      
      // Change ray color to indicate interactive object
      controller.userData.lineColor = 0x00ff00; // Green for interactive objects
      controller.userData.line.material.color.set(controller.userData.lineColor);
    } else {
      // Reset hover effect if no intersection and not the selected object
      if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
        this.resetObjectMaterial(this.hoveredObject);
        this.hoveredObject = null;
      }
      
      // Reset controller ray color to default
      controller.userData.lineColor = 0xffffff; // White for no intersection
      controller.userData.line.material.color.set(controller.userData.lineColor);
      
      // Reset panel interaction state
      controller.userData.panelInteraction = null;
      
      // Set ray to default length
      controller.userData.line.scale.z = 5;
    }
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
    
    // Update minimap if it exists
    if (this.minimapCamera) {
      const aspect = window.innerWidth / window.innerHeight;
      const viewSize = 50;
      this.minimapCamera.left = -viewSize * aspect / 4;
      this.minimapCamera.right = viewSize * aspect / 4;
      this.minimapCamera.top = viewSize / 4;
      this.minimapCamera.bottom = -viewSize / 4;
      this.minimapCamera.updateProjectionMatrix();
    }
  }
  
  animate(timestamp, frame) {
    // Process desktop controls if not in VR
    if (!this.renderer.xr.isPresenting) {
      this.processDesktopControls();
      
      // Update hover state for desktop
      this.handleDesktopHover();
    }
    
    // Process controller input in VR
    if (this.renderer.xr.isPresenting) {
      this.processControllerInput();
      
      // Update hover state for controllers
      for (const controller of this.controllers) {
        this.handleRayIntersection(controller);
      }
    }
    
    // Update selection pulse animation
    this.updateSelectionAnimation();
    
    // Update minimap
    this.updateMinimap();
    
    // Update emotion legend position
    this.updateLegendPosition();
    
    // Update entry panel position
    if (this.entryPanel) {
      this.entryPanel.updatePosition();
    }
    
    // Periodic memory cleanup
    this.cleanupMemory();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Set up the minimap for navigation
   */
  setupMinimap() {
    // Create minimap scene
    this.minimapScene = new THREE.Scene();
    this.minimapScene.background = new THREE.Color(0x000022);
    
    // Create orthographic camera for top-down view
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 50;
    this.minimapCamera = new THREE.OrthographicCamera(
      -viewSize * aspect / 4, viewSize * aspect / 4,
      viewSize / 4, -viewSize / 4,
      0.1, 1000
    );
    this.minimapCamera.position.set(0, 50, 0);
    this.minimapCamera.lookAt(0, 0, 0);
    this.minimapCamera.rotation.z = Math.PI; // Proper orientation
    
    // Create minimap renderer
    this.minimapRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.minimapRenderer.setSize(200, 200);
    this.minimapRenderer.domElement.style.position = 'absolute';
    this.minimapRenderer.domElement.style.bottom = '20px';
    this.minimapRenderer.domElement.style.right = '20px';
    this.minimapRenderer.domElement.style.borderRadius = '100px';
    this.minimapRenderer.domElement.style.border = '2px solid white';
    document.getElementById('app').appendChild(this.minimapRenderer.domElement);
    
    // Create elevation gauge for 3D navigation
    this.setupElevationGauge();
    
    // Create player marker for minimap
    const markerGeometry = new THREE.ConeGeometry(0.8, 2, 4);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.playerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.playerMarker.rotation.x = Math.PI / 2;
    this.minimapScene.add(this.playerMarker);
    
    // Add a vertical line from the player marker to indicate elevation
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(6); // 2 points * 3 coordinates
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.elevationLine = new THREE.Line(lineGeometry, lineMaterial);
    this.minimapScene.add(this.elevationLine);
    
    // Add grid to help with spatial orientation
    const gridHelper = new THREE.GridHelper(100, 10, 0x555555, 0x222222);
    gridHelper.rotation.x = Math.PI / 2; // Make it visible from top-down view
    this.minimapScene.add(gridHelper);
    
    // Add cardinal direction indicators
    this.addCardinalDirections();
    
    // Add ambient light to minimap scene
    const light = new THREE.AmbientLight(0xffffff, 1);
    this.minimapScene.add(light);
    
    // Add stats display for current position
    this.setupCoordinateDisplay();
  }
  
  /**
   * Set up the elevation gauge to show Y-axis position
   */
  setupElevationGauge() {
    // Create a vertical gauge container
    const gaugeContainer = document.createElement('div');
    gaugeContainer.style.position = 'absolute';
    gaugeContainer.style.top = '20px';
    gaugeContainer.style.right = '20px';
    gaugeContainer.style.width = '20px';
    gaugeContainer.style.height = '200px';
    gaugeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    gaugeContainer.style.borderRadius = '10px';
    gaugeContainer.style.border = '1px solid white';
    
    // Create the elevation indicator
    this.elevationIndicator = document.createElement('div');
    this.elevationIndicator.style.position = 'absolute';
    this.elevationIndicator.style.width = '16px';
    this.elevationIndicator.style.height = '10px';
    this.elevationIndicator.style.backgroundColor = 'red';
    this.elevationIndicator.style.borderRadius = '5px';
    this.elevationIndicator.style.left = '2px';
    this.elevationIndicator.style.bottom = '2px'; // Will be updated based on camera y position
    
    // Add labels for top and bottom
    const topLabel = document.createElement('div');
    topLabel.style.position = 'absolute';
    topLabel.style.top = '-20px';
    topLabel.style.width = '100%';
    topLabel.style.textAlign = 'center';
    topLabel.style.color = 'white';
    topLabel.style.fontSize = '12px';
    topLabel.textContent = 'Top';
    
    const bottomLabel = document.createElement('div');
    bottomLabel.style.position = 'absolute';
    bottomLabel.style.bottom = '-20px';
    bottomLabel.style.width = '100%';
    bottomLabel.style.textAlign = 'center';
    bottomLabel.style.color = 'white';
    bottomLabel.style.fontSize = '12px';
    bottomLabel.textContent = 'Bottom';
    
    // Add to DOM
    gaugeContainer.appendChild(this.elevationIndicator);
    gaugeContainer.appendChild(topLabel);
    gaugeContainer.appendChild(bottomLabel);
    document.getElementById('app').appendChild(gaugeContainer);
    
    // Store for later use
    this.elevationGauge = gaugeContainer;
    
    // Store min and max y values for scaling
    this.yRangeMin = -10;
    this.yRangeMax = 30;
  }
  
  /**
   * Add cardinal direction indicators to the minimap
   */
  addCardinalDirections() {
    const distance = 22; // Distance from center
    const size = 1.5;
    
    // Create text geometry for N, S, E, W
    const directions = [
      { text: 'N', position: new THREE.Vector3(0, 0, -distance) },
      { text: 'S', position: new THREE.Vector3(0, 0, distance) },
      { text: 'E', position: new THREE.Vector3(distance, 0, 0) },
      { text: 'W', position: new THREE.Vector3(-distance, 0, 0) }
    ];
    
    // Add direction markers using simple boxes
    directions.forEach(dir => {
      const markerGeometry = new THREE.BoxGeometry(size, size, size);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(dir.position);
      this.minimapScene.add(marker);
      
      // Add dot above for better visibility
      const dotGeometry = new THREE.SphereGeometry(size/3, 8, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(dir.position.x, dir.position.y + 2, dir.position.z);
      this.minimapScene.add(dot);
    });
  }
  
  /**
   * Set up coordinate display for debugging and navigation
   */
  setupCoordinateDisplay() {
    this.coordDisplay = document.createElement('div');
    this.coordDisplay.style.position = 'absolute';
    this.coordDisplay.style.bottom = '225px';
    this.coordDisplay.style.right = '20px';
    this.coordDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.coordDisplay.style.color = 'white';
    this.coordDisplay.style.padding = '5px';
    this.coordDisplay.style.borderRadius = '5px';
    this.coordDisplay.style.fontSize = '12px';
    this.coordDisplay.style.fontFamily = 'monospace';
    document.getElementById('app').appendChild(this.coordDisplay);
  }
  
  /**
   * Update the minimap view
   */
  updateMinimap() {
    if (!this.minimapRenderer || !this.playerMarker) return;
    
    // Update player marker position from camera
    this.playerMarker.position.x = this.camera.position.x;
    this.playerMarker.position.z = this.camera.position.z;
    
    // Update player marker rotation from camera
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.playerMarker.rotation.y = Math.atan2(direction.x, direction.z);
    
    // Update elevation line
    if (this.elevationLine) {
      const positions = this.elevationLine.geometry.attributes.position.array;
      positions[0] = this.camera.position.x; // x1
      positions[1] = 0;                      // y1 (ground level)
      positions[2] = this.camera.position.z; // z1
      positions[3] = this.camera.position.x; // x2
      positions[4] = 0;                      // y2 (will be updated with scaled height)
      positions[5] = this.camera.position.z; // z2
      
      // Scale the height for better visibility
      const heightScale = 0.2; // adjust as needed for visibility
      positions[4] = this.camera.position.y * heightScale;
      
      this.elevationLine.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update elevation gauge
    if (this.elevationIndicator) {
      // Calculate position percentage in the y range
      const yRange = this.yRangeMax - this.yRangeMin;
      const yPercentage = (this.camera.position.y - this.yRangeMin) / yRange;
      // Clamp between 0 and 1
      const clampedPercentage = Math.max(0, Math.min(1, yPercentage));
      // Calculate position in pixels (account for indicator height)
      const gaugeHeight = 200 - 10; // container height minus indicator height
      const pixelPosition = clampedPercentage * gaugeHeight;
      // Update indicator position
      this.elevationIndicator.style.bottom = `${pixelPosition}px`;
    }
    
    // Update coordinate display
    if (this.coordDisplay) {
      this.coordDisplay.textContent = `X: ${this.camera.position.x.toFixed(1)} | Y: ${this.camera.position.y.toFixed(1)} | Z: ${this.camera.position.z.toFixed(1)}`;
    }
    
    // Render minimap
    this.minimapRenderer.render(this.minimapScene, this.minimapCamera);
  }
  
  /**
   * Load journal data and create visualization
   */
  async loadData() {
    try {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('loading-text').textContent = 'Loading journal data...';
      
      // First try to load the full dataset
      try {
        console.log('Attempting to load the complete dataset...');
        const data = await this.dataLoader.loadData('/data/warhol_final.json');
        this.journalEntries = data.entries;
        console.log(`Successfully loaded ${this.journalEntries.length} entries`);
      } catch (mainDataError) {
        console.error('Error loading complete dataset:', mainDataError);
        
        // Fall back to the sample dataset
        document.getElementById('loading-text').textContent = 'Loading sample dataset instead...';
        console.log('Falling back to sample dataset...');
        
        try {
          const sampleData = await this.dataLoader.loadData('/data/sample.json');
          this.journalEntries = sampleData.entries;
          console.log(`Successfully loaded ${this.journalEntries.length} sample entries`);
          
          // Show a notification that we're using sample data
          this.showNotification('Using sample dataset - full dataset could not be loaded.');
        } catch (sampleDataError) {
          console.error('Error loading sample dataset:', sampleDataError);
          throw new Error('Failed to load both main and sample datasets');
        }
      }
      
      // Create visualization once data is loaded
      this.createVisualization();
      
      document.getElementById('loading').style.display = 'none';
    } catch (error) {
      console.error('Error loading data:', error);
      document.getElementById('loading-text').textContent = 'Error loading data. Please refresh and try again.';
      
      // Create a more detailed error message
      const errorDetails = document.createElement('div');
      errorDetails.style.fontSize = '14px';
      errorDetails.style.marginTop = '10px';
      errorDetails.style.maxWidth = '80%';
      errorDetails.textContent = `Technical details: ${error.message}`;
      document.getElementById('loading').appendChild(errorDetails);
      
      // Add a reload button
      const reloadButton = document.createElement('button');
      reloadButton.textContent = 'Reload Page';
      reloadButton.style.marginTop = '20px';
      reloadButton.style.padding = '10px 20px';
      reloadButton.style.fontSize = '16px';
      reloadButton.style.cursor = 'pointer';
      reloadButton.addEventListener('click', () => window.location.reload());
      document.getElementById('loading').appendChild(reloadButton);
    }
  }
  
  /**
   * Show a notification to the user (optimized version)
   * @param {string} message - The message to display
   */
  showNotification(message) {
    // Reuse existing notification element if possible
    let notification = document.getElementById('system-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'system-notification';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = '1000';
      notification.style.fontSize = '14px';
      notification.style.transition = 'opacity 1s ease';
      document.body.appendChild(notification);
    }
    
    // Clear any existing timeout to prevent multiple fades
    if (this._notificationTimeout) {
      clearTimeout(this._notificationTimeout);
    }
    
    // Update message and show notification
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Hide notification after 5 seconds
    this._notificationTimeout = setTimeout(() => {
      notification.style.opacity = '0';
    }, 5000);
  }
  
  /**
   * Clean up memory periodically to prevent leaks
   */
  cleanupMemory() {
    // Check if it's time to clean up
    const now = performance.now();
    if (!this._lastCleanup || now - this._lastCleanup > 30000) { // Every 30 seconds
      this._lastCleanup = now;
      
      // Dispose of unused materials that haven't been used recently
      const materialsToKeep = new Map();
      
      // Keep materials for selected and hovered objects
      if (this.selectedObject && this.originalMaterials.has(this.selectedObject.uuid)) {
        materialsToKeep.set(this.selectedObject.uuid, this.originalMaterials.get(this.selectedObject.uuid));
      }
      
      if (this.hoveredObject && this.originalMaterials.has(this.hoveredObject.uuid)) {
        materialsToKeep.set(this.hoveredObject.uuid, this.originalMaterials.get(this.hoveredObject.uuid));
      }
      
      // Dispose of unused materials
      this.originalMaterials.forEach((material, uuid) => {
        if (!materialsToKeep.has(uuid)) {
          material.dispose();
        }
      });
      
      // Replace with clean map
      this.originalMaterials = materialsToKeep;
      
      console.log('Memory cleanup completed. Retained materials:', this.originalMaterials.size);
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
    
    // Prepare to calculate the average position for camera positioning
    let sumX = 0, sumY = 0, sumZ = 0;
    let minY = Infinity, maxY = -Infinity;
    let count = 0;
    
    // Create orbs for each journal entry
    this.journalEntries.forEach(entry => {
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
      
      // Add representation to minimap with height-based color variation
      if (this.minimapScene) {
        // Use height to determine color intensity/variation
        const normalizedHeight = (entry.coordinates.y - minY) / (maxY - minY || 1);
        
        // Create dot with elevation pillar
        const dotGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const emotionColor = this.blendEmotionColors(entry.emotions);
        
        // Adjust brightness based on height
        const heightAdjustedColor = new THREE.Color(emotionColor);
        // Make higher points brighter, lower points darker
        const brightness = 0.5 + (normalizedHeight * 0.5);
        heightAdjustedColor.multiplyScalar(brightness);
        
        const dotMaterial = new THREE.MeshBasicMaterial({ color: heightAdjustedColor });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        
        // Position the dot at the X,Z coordinates but at ground level
        dot.position.set(entry.coordinates.x, 0, entry.coordinates.z);
        this.minimapScene.add(dot);
        
        // Add vertical line to indicate height
        if (Math.abs(entry.coordinates.y) > 1) { // Only add lines for points not at ground level
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: heightAdjustedColor,
            transparent: true,
            opacity: 0.3 + (normalizedHeight * 0.3) // Higher points more visible
          });
          
          const lineGeometry = new THREE.BufferGeometry();
          const lineHeight = Math.max(0.1, Math.abs(entry.coordinates.y) * 0.1); // Scale height for visibility
          const scaled_y = entry.coordinates.y > 0 ? lineHeight : -lineHeight;
          
          const vertices = new Float32Array([
            entry.coordinates.x, 0, entry.coordinates.z, // ground point
            entry.coordinates.x, scaled_y, entry.coordinates.z  // elevated point
          ]);
          
          lineGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          const line = new THREE.Line(lineGeometry, lineMaterial);
          this.minimapScene.add(line);
        }
      }
    });
    
    // Calculate average position
    if (count > 0) {
      const avgX = sumX / count;
      const avgY = sumY / count;
      const avgZ = sumZ / count;
      
      // Position camera near the cluster center with a small offset
      this.camera.position.set(avgX, avgY + 1.6, avgZ + 5);
      this.camera.lookAt(avgX, avgY, avgZ);
      
      console.log(`Positioned camera at: ${avgX.toFixed(2)}, ${(avgY + 1.6).toFixed(2)}, ${(avgZ + 5).toFixed(2)}`);
      
      // Update minimap camera position
      if (this.minimapCamera) {
        this.minimapCamera.position.set(avgX, 50, avgZ);
        this.minimapCamera.lookAt(avgX, 0, avgZ);
      }
      
      // Update elevation gauge range
      this.yRangeMin = minY - 2;
      this.yRangeMax = maxY + 2;
      console.log(`Y range for elevation gauge: ${this.yRangeMin.toFixed(2)} to ${this.yRangeMax.toFixed(2)}`);
    }
    
    // Hide test cube if it exists
    if (this.testCube) {
      this.testCube.visible = false;
    }
  }
  
  /**
   * Create an orb representing a journal entry with emotion-based styling
   * @param {Object} entry - Journal entry data
   * @returns {THREE.Mesh} - The created orb mesh
   */
  createOrb(entry) {
    // Calculate emotional intensity for sizing
    const emotionalIntensity = this.getEmotionIntensity(entry.emotions);
    const radius = 0.1 + (emotionalIntensity * 0.1); // Base size + emotion-based scaling
    
    // Create sphere geometry with detail proportional to size
    const segments = Math.max(16, Math.floor(radius * 100));
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    // Get color based on emotions (supports blending of multiple emotions)
    const color = this.blendEmotionColors(entry.emotions);
    
    // Create material with emissive properties for glow effect
    // Emissive intensity based on emotional intensity
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3 + (emotionalIntensity * 0.7), // More intense emotions glow brighter
      roughness: 0.7,
      metalness: 0.3,
      transparent: true, 
      opacity: 0.7 + (emotionalIntensity * 0.3) // More intense emotions are more opaque
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
    // Create emotion color mapping (RGB values from 0-1)
    if (!this.emotionColorsRGB) {
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
   * Get a color for an emotion based on Plutchik's wheel (simplified version)
   * @param {string} emotion - Emotion name
   * @returns {THREE.Color} - Color for the emotion
   */
  getEmotionColor(emotion) {
    // Create emotion color mapping (legacy method)
    const emotionColors = {
      joy: 0xFFFF00,         // Yellow
      trust: 0x00CC00,       // Green
      fear: 0x99FF99,        // Light green
      surprise: 0x00CCCC,    // Turquoise
      sadness: 0x0000FF,     // Blue
      disgust: 0x800080,     // Purple
      anger: 0xFF0000,       // Red
      anticipation: 0xFF8000, // Orange
      neutral: 0xB3B3B3      // Gray
    };
    
    return new THREE.Color(emotionColors[emotion] || emotionColors.neutral);
  }

  /**
   * Determine the dominant emotion in an emotion object (compatibility method)
   * @param {Object} emotions - Object with emotion names as keys and intensities as values
   * @returns {string} - The name of the dominant emotion
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
   * Set up emotion color legend in the bottom left of view
   */
  setupEmotionLegend() {
    // Create a group for the legend that will follow the camera
    this.legendGroup = new THREE.Group();
    // Set a lower renderOrder for the entire legend group to appear behind the entry panel
    this.legendGroup.renderOrder = 5;
    this.scene.add(this.legendGroup);
    
    // Define emotions in order for Plutchik's wheel
    const emotions = [
      { name: 'Joy', color: [1.0, 1.0, 0.0] },         // yellow (12 o'clock)
      { name: 'Trust', color: [0.0, 0.8, 0.0] },       // green
      { name: 'Fear', color: [0.6, 1.0, 0.6] },        // light green
      { name: 'Surprise', color: [0.0, 0.8, 0.8] },    // turquoise
      { name: 'Sadness', color: [0.0, 0.0, 1.0] },     // blue
      { name: 'Disgust', color: [0.5, 0.0, 0.5] },     // purple
      { name: 'Anger', color: [1.0, 0.0, 0.0] },       // red
      { name: 'Anticipation', color: [1.0, 0.5, 0.0] } // orange
    ];
    
    // Circular background for the entire wheel
    const wheelRadius = 0.3;
    const circleGeometry = new THREE.CircleGeometry(wheelRadius, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthTest: false
    });
    
    const circleBackground = new THREE.Mesh(circleGeometry, circleMaterial);
    circleBackground.position.set(0, 0, 0);
    circleBackground.renderOrder = 5;
    this.legendGroup.add(circleBackground);
    
    // Title for the legend
    const titleCanvas = document.createElement('canvas');
    const titleContext = titleCanvas.getContext('2d');
    titleCanvas.width = 256;
    titleCanvas.height = 32;
    titleContext.fillStyle = '#ffffff';
    titleContext.font = 'bold 20px Arial';
    titleContext.textAlign = 'center';
    titleContext.textBaseline = 'middle';
    titleContext.fillText('EMOTION WHEEL', 128, 16);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMaterial = new THREE.MeshBasicMaterial({
      map: titleTexture,
      transparent: true,
      depthTest: false
    });
    
    const titleGeometry = new THREE.PlaneGeometry(0.4, 0.04);
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, wheelRadius + 0.05, 0.001);
    titleMesh.renderOrder = 5;
    this.legendGroup.add(titleMesh);
    
    // Create wedges for each emotion
    const segments = emotions.length;
    const angleStep = (Math.PI * 2) / segments;
    const innerRadius = wheelRadius * 0.4; // Center hole
    
    for (let i = 0; i < segments; i++) {
      const emotion = emotions[i];
      // Start at 12 o'clock (-Math.PI/2) and go clockwise
      const startAngle = -Math.PI/2 + i * angleStep;
      const endAngle = -Math.PI/2 + (i + 1) * angleStep;
      
      // Create a custom shape for the wedge
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); // Center of the wheel
      
      // Draw the inner arc (small radius)
      shape.absarc(0, 0, innerRadius, startAngle, endAngle, false);
      
      // Draw the outer arc (full radius)
      shape.absarc(0, 0, wheelRadius, endAngle, startAngle, true);
      
      // Close the shape
      shape.closePath();
      
      // Create the wedge geometry from the shape
      const wedgeGeometry = new THREE.ShapeGeometry(shape);
      const wedgeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(emotion.color[0], emotion.color[1], emotion.color[2]),
        emissive: new THREE.Color(emotion.color[0], emotion.color[1], emotion.color[2]),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
        depthTest: false
      });
      
      const wedge = new THREE.Mesh(wedgeGeometry, wedgeMaterial);
      wedge.position.set(0, 0, 0.002); // Slightly in front of the background
      wedge.renderOrder = 5;
      this.legendGroup.add(wedge);
      
      // Add emotion labels
      const middleAngle = (startAngle + endAngle) / 2;
      const labelDistance = wheelRadius * 0.7; // Position labels between inner and outer radius
      
      // Calculate position using sine and cosine
      const labelX = Math.cos(middleAngle) * labelDistance;
      const labelY = Math.sin(middleAngle) * labelDistance;
      
      const labelCanvas = document.createElement('canvas');
      const labelContext = labelCanvas.getContext('2d');
      labelCanvas.width = 512;
      labelCanvas.height = 128; // Increased height for larger text
      // Use white text color with black outline for better visibility
      labelContext.fillStyle = '#ffffff';
      labelContext.font = 'bold 72px Arial'; // 3x larger font size
      labelContext.textAlign = 'center';
      labelContext.textBaseline = 'middle';
      
      // Add thick black outline to make text more readable
      labelContext.strokeStyle = '#000000';
      labelContext.lineWidth = 12;
      labelContext.strokeText(emotion.name, 256, 64);
      labelContext.fillText(emotion.name, 256, 64);
      
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelGeometry = new THREE.PlaneGeometry(0.25, 0.08); // Increased size
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false
      });
      
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(labelX, labelY, 0.003); // Slightly in front of wedges
      label.renderOrder = 5;
      
      // Fix the text orientation so it's always readable from camera's perspective
      // All labels should be right-side up
      
      // Calculate the correct rotation so text is always upright relative to viewer
      // For a circle, we want text on the left side to be rotated 90 degrees,
      // text on the right to be rotated -90 degrees, top 0, bottom 180
      
      // First reset rotation
      label.rotation.z = 0;
      
      // Then calculate angle to keep text upright
      // This ensures all text is oriented toward the outside of the wheel
      // and in the correct reading orientation
      if (labelX < 0) {
        // Left half - rotate 90° counter-clockwise
        label.rotation.z = Math.PI/2;
      } else if (labelX > 0) {
        // Right half - rotate 90° clockwise
        label.rotation.z = -Math.PI/2;
      } else if (labelY < 0) {
        // Bottom - rotate 180°
        label.rotation.z = Math.PI;
      }
      // Top (labelY > 0 && labelX == 0) remains at 0 rotation
      
      this.legendGroup.add(label);
    }
    
    // Position the legend initially
    this.updateLegendPosition();
  }

  /**
   * Update the legend position to stay in the bottom left of the view
   */
  updateLegendPosition() {
    if (!this.legendGroup) return;
    
    // Calculate position in front of and to the left of the camera
    const distance = 1.0;  // Distance in front of camera
    const leftOffset = 0.4; // Offset to the left
    const downOffset = 0.3; // Offset downward
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    this.camera.getWorldDirection(cameraDirection);
    
    // Calculate right vector (perpendicular to camera direction)
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(this.camera.quaternion);
    
    // Calculate up vector
    const upVector = new THREE.Vector3(0, 1, 0);
    
    // Calculate position for the legend
    const position = new THREE.Vector3();
    position.copy(cameraPosition);
    position.addScaledVector(cameraDirection, distance);
    position.addScaledVector(rightVector, -leftOffset);
    position.addScaledVector(upVector, -downOffset);
    
    // Update legend position
    this.legendGroup.position.copy(position);
    
    // Make the legend face the camera
    this.legendGroup.lookAt(cameraPosition);
  }

  /**
   * Handle desktop mouse selection
   */
  handleDesktopSelection() {
    if (this.renderer.xr.isPresenting) return; // Skip if in VR mode
    
    // Update raycaster with mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get only interactive objects for better performance
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting on interactive objects only
    const intersects = this.raycaster.intersectObjects(interactiveObjects, false);
    
    // Find first interactive object
    const interactive = intersects.length > 0 ? intersects[0] : null;
    
    // Check for panel interactions first
    if (this._panelDesktopInteraction && this.entryPanel) {
      const interaction = this._panelDesktopInteraction;
      
      if (interaction === 'close') {
        this.entryPanel.hide();
        return;
      } else if (interaction === 'scroll-up') {
        this.entryPanel.scroll('up');
        return;
      } else if (interaction === 'scroll-down') {
        this.entryPanel.scroll('down');
        return;
      }
    }
    
    // Handle regular object selection
    if (interactive) {
      const selectedObj = interactive.object;
      this.handleSelection(selectedObj);
    } else if (this.selectedObject) {
      // Deselect if clicking away from objects
      this.deselectObject();
    }
  }
  
  /**
   * Handle desktop mouse hover
   */
  handleDesktopHover() {
    if (this.renderer.xr.isPresenting) return; // Skip if in VR mode
    
    // Performance optimization: Only check for hover every few frames
    if (!this._lastHoverCheck) this._lastHoverCheck = 0;
    this._lastHoverCheck++;
    if (this._lastHoverCheck % 3 !== 0 && this.hoveredObject) return; // Skip 2 out of 3 frames if something is already hovered
    
    // Update raycaster with mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get only interactive objects for better performance
    const interactiveObjects = this.getInteractiveObjects();
    
    // Perform raycasting on interactive objects only
    const intersects = this.raycaster.intersectObjects(interactiveObjects, false);
    
    // Find first interactive object
    const interactive = intersects.length > 0 ? intersects[0] : null;
    
    if (interactive) {
      const hoveredObj = interactive.object;
      
      // Check if this is a panel interaction first
      if (this.entryPanel) {
        const interaction = this.entryPanel.checkInteraction(interactive);
        if (interaction) {
          // Update cursor based on interaction type
          if (interaction === 'close') {
            this.renderer.domElement.style.cursor = 'pointer';
          } else if (interaction === 'scroll-up' || interaction === 'scroll-down') {
            this.renderer.domElement.style.cursor = 'pointer';
          }
          
          // Store interaction type for click handling
          this._panelDesktopInteraction = interaction;
          return;
        } else {
          this._panelDesktopInteraction = null;
        }
      }
      
      // If a new object is hovered, update hover state
      if (this.hoveredObject !== hoveredObj) {
        // Reset previous hovered object
        if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
          this.resetObjectMaterial(this.hoveredObject);
        }
        
        // Apply hover effect to new object if it's not selected
        if (hoveredObj !== this.selectedObject) {
          this.applyHoverEffect(hoveredObj);
        }
        
        this.hoveredObject = hoveredObj;
        
        // Update cursor to indicate interactivity
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      // Reset hover state if no intersection
      if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
        this.resetObjectMaterial(this.hoveredObject);
        this.hoveredObject = null;
      }
      
      // Reset interaction type
      this._panelDesktopInteraction = null;
      
      // Reset cursor
      this.renderer.domElement.style.cursor = 'grab';
    }
  }
  
  /**
   * Handle selection of an object (common for VR and desktop)
   */
  handleSelection(selectedObj) {
    // If clicking the already selected object, deselect it
    if (this.selectedObject === selectedObj) {
      this.deselectObject();
      return;
    }
    
    // If there was a previously selected object, reset its material
    if (this.selectedObject) {
      this.deselectObject();
    }
    
    // Select new object
    this.selectedObject = selectedObj;
    
    // Store original material and apply selection effect
    if (!this.originalMaterials.has(selectedObj.uuid)) {
      this.originalMaterials.set(selectedObj.uuid, selectedObj.material.clone());
    }
    
    // Apply selection effect (more dramatic than hover)
    this.applySelectionEffect(selectedObj);
    
    // Handle entry-specific interactions
    if (selectedObj.userData.type === 'journal-entry') {
      // Highlight related entries and create connections
      this.highlightRelatedEntries(selectedObj);
      
      // Display the entry panel
      if (this.entryPanel) {
        this.entryPanel.showEntry(selectedObj.userData.entry);
      }
      
      // Log selection for debugging
      console.log('Selected journal entry:', selectedObj.userData.entry.id);
      
      // Show brief notification
      const date = selectedObj.userData.entry.date ? 
                  new Date(selectedObj.userData.entry.date).toLocaleDateString() : 'Unknown date';
      this.showNotification(`Selected: ${date}`);
    } else if (selectedObj.userData.type === 'test-cube') {
      console.log('Selected test cube');
      this.showNotification('Test cube selected!');
    }
  }
  
  /**
   * Deselect the currently selected object
   */
  deselectObject() {
    if (this.selectedObject) {
      this.resetObjectMaterial(this.selectedObject);
      this.selectedObject = null;
      
      // Clean up related entry highlighting and connections
      this.cleanupRelatedEntries();
      
      // Hide the entry panel
      if (this.entryPanel) {
        this.entryPanel.hide();
      }
    }
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
   * Update the selection pulse animation in a more efficient way
   */
  updateSelectionAnimation() {
    if (this.selectedObject && this.selectedObject.userData.pulseAnimation?.active) {
      try {
        const animation = this.selectedObject.userData.pulseAnimation;
        animation.time += 0.05;
        const pulseFactor = 0.5 + 0.5 * Math.sin(animation.time * 3);
        this.selectedObject.material.emissiveIntensity = animation.baseEmissive * (0.8 + 0.4 * pulseFactor);
      } catch (error) {
        console.error('Error updating selection animation:', error);
        // Stop the animation if there's an error to prevent continuous errors
        if (this.selectedObject && this.selectedObject.userData.pulseAnimation) {
          this.selectedObject.userData.pulseAnimation.active = false;
        }
      }
    }
  }

  /**
   * Get a list of all interactive objects in the scene
   * This is more efficient than checking all scene children during raycasting
   * @returns {Array} Array of interactive objects
   */
  getInteractiveObjects() {
    // Cache the results to avoid recalculating every frame
    if (this._interactiveObjects && this._lastInteractiveUpdate 
        && performance.now() - this._lastInteractiveUpdate < 5000) {
      return this._interactiveObjects;
    }
    
    // Find all interactive objects
    const interactiveObjects = [];
    
    // Check the test cube if it exists
    if (this.testCube && this.testCube.userData.interactive) {
      interactiveObjects.push(this.testCube);
    }
    
    // Check all orbs - use the orbGroup instead of traversing the entire scene
    if (this.orbGroup) {
      this.orbGroup.traverse(object => {
        if (object.userData && object.userData.interactive) {
          interactiveObjects.push(object);
        }
      });
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
    
    // Cache the results
    this._interactiveObjects = interactiveObjects;
    this._lastInteractiveUpdate = performance.now();
    
    return interactiveObjects;
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
    this.relationLines.push(line);
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
    this.relationLines.forEach(line => {
      if (line && line.parent) {
        line.parent.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      }
    });
    this.relationLines = [];
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 