import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// Standard Gamepad Mapping Buttons (indices)
const TRIGGER_BUTTON = 0;
const SQUEEZE_BUTTON = 1; // Grip
const THUMBSTICK_BUTTON = 3;
const X_BUTTON = 4; // Left Controller 'X'
const Y_BUTTON = 5; // Left Controller 'Y'
const A_BUTTON = 4; // Right Controller 'A' (Same index as X on Left)
const B_BUTTON = 5; // Right Controller 'B' (Same index as Y on Left)

/**
 * Manages VR controllers and interactions
 */
export default class VRController {
  constructor(scene, renderer, camera, options = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    this.movementVector = new THREE.Vector3();
    this.movementEnabled = true;
    this.movementSpeed = options.movementSpeed || 0.05;
    
    this.controllers = [];
    this.controllerGrips = [];
    this.leftGamepad = null;
    this.rightGamepad = null;
    
    // Button state tracking to prevent multiple triggers per press
    this.leftButtonStates = {};
    this.rightButtonStates = {};
    
    // Selection and interaction callbacks
    this.onSelect = options.onSelect || null;
    this.onRayIntersection = options.onRayIntersection || null;
    this.getInteractiveObjects = options.getInteractiveObjects || (() => []);
    
    // Callbacks for new button presses
    this.onAButtonPressed = options.onAButtonPressed || null; // Right 'A'
    this.onBButtonPressed = options.onBButtonPressed || null; // Right 'B'
    this.onXButtonPressed = options.onXButtonPressed || null; // Left 'X'
    this.onYButtonPressed = options.onYButtonPressed || null; // Left 'Y'
    
    this.setupControllers();
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
    
    // Listen for input sources change to get gamepad references
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
          this.resetButtonStates(this.leftButtonStates, this.leftGamepad.buttons.length);
        } else if (inputSource.handedness === 'right') {
          this.rightGamepad = inputSource.gamepad;
          this.resetButtonStates(this.rightButtonStates, this.rightGamepad.buttons.length);
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
    
    if (interactive && this.onSelect) {
      this.onSelect(interactive.object);
    }
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
      controller.userData.line = controller.getObjectByName('ray');
      if (controller.userData.line) {
        controller.userData.line.scale.z = intersection.distance;
      }
      
      // Call custom ray intersection handler if provided
      if (this.onRayIntersection) {
        this.onRayIntersection(controller, intersection, object);
      }
      
      // Change ray color to indicate interactive object
      if (controller.userData.line) {
        controller.userData.lineColor = 0x00ff00; // Green for interactive objects
        controller.userData.line.material.color.set(controller.userData.lineColor);
      }
      
      return intersection;
    } else {
      // Reset controller ray color to default
      controller.userData.line = controller.getObjectByName('ray');
      if (controller.userData.line) {
        controller.userData.lineColor = 0xffffff; // White for no intersection
        controller.userData.line.material.color.set(controller.userData.lineColor);
        controller.userData.line.scale.z = 5; // Reset to default length
      }
      
      return null;
    }
  }
  
  // Helper to initialize button states
  resetButtonStates(buttonStates, numButtons) {
    for (let i = 0; i < numButtons; i++) {
      buttonStates[i] = { pressed: false, justPressed: false };
    }
  }
  
  // Helper function to check for button press (rising edge)
  checkButtonPress(buttonStates, buttonIndex, gamepad) {
    if (!gamepad || buttonIndex >= gamepad.buttons.length) {
      return false;
    }

    const button = gamepad.buttons[buttonIndex];
    const state = buttonStates[buttonIndex];

    if (button.pressed && !state.pressed) {
      state.pressed = true;
      state.justPressed = true; // Mark as just pressed
      return true; // Rising edge detected
    }

    if (!button.pressed && state.pressed) {
      state.pressed = false;
      state.justPressed = false; // Reset just pressed flag
    } else if (state.justPressed) {
      // Ensure justPressed is reset on the next frame even if held
      state.justPressed = false;
    }

    return false; // Not a rising edge press
  }
  
  processControllerInput() {
    // Process Left Controller Input
    if (this.leftGamepad) {
      // Thumbstick Movement
      const axes = this.leftGamepad.axes;
      if (axes.length >= 2) {
        const horizontal = axes[2] || axes[0]; // Standard thumbstick axes are 2 and 3
        const vertical = axes[3] || axes[1];   // Fallback to 0 and 1 if needed
        const deadZone = 0.1; // Increased deadzone

        if (Math.abs(horizontal) > deadZone || Math.abs(vertical) > deadZone) {
          const cameraDirection = new THREE.Vector3(0, 0, -1);
          this.camera.getWorldDirection(cameraDirection); // Use world direction
          cameraDirection.y = 0;
          cameraDirection.normalize();

          const rightVector = new THREE.Vector3();
          rightVector.crossVectors(this.camera.up, cameraDirection).normalize(); // Correct right vector calculation

          this.movementVector.set(0, 0, 0);
          // Vertical axis is often inverted (-1 is forward)
          this.movementVector.add(cameraDirection.multiplyScalar(-vertical * this.movementSpeed));
          this.movementVector.add(rightVector.multiplyScalar(horizontal * this.movementSpeed));

          if (this.movementEnabled) {
            // Apply movement relative to the camera RIG (parent of camera) if available, else camera directly
            const target = this.camera.parent || this.camera;
            target.position.add(this.movementVector);
          }
        }
      }

      // Button Presses (Left Hand)
      if (this.onXButtonPressed && this.checkButtonPress(this.leftButtonStates, X_BUTTON, this.leftGamepad)) {
        this.onXButtonPressed();
      }
      if (this.onYButtonPressed && this.checkButtonPress(this.leftButtonStates, Y_BUTTON, this.leftGamepad)) {
        this.onYButtonPressed();
      }
    }

    // Process Right Controller Input
    if (this.rightGamepad) {
      // Button Presses (Right Hand)
      if (this.onAButtonPressed && this.checkButtonPress(this.rightButtonStates, A_BUTTON, this.rightGamepad)) {
        this.onAButtonPressed();
      }
      if (this.onBButtonPressed && this.checkButtonPress(this.rightButtonStates, B_BUTTON, this.rightGamepad)) {
        this.onBButtonPressed();
      }
    }
  }
  
  update() {
    // Process controller input in VR
    if (this.renderer.xr.isPresenting) {
      this.processControllerInput();
      
      // Update hover state for controllers
      for (const controller of this.controllers) {
        this.handleRayIntersection(controller);
      }
    }
  }
} 