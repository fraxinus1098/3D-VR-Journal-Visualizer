import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

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
    
    // Selection and interaction callbacks
    this.onSelect = options.onSelect || null;
    this.onRayIntersection = options.onRayIntersection || null;
    this.getInteractiveObjects = options.getInteractiveObjects || (() => []);
    
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
    
    if (interactive && this.onSelect) {
      this.onSelect(interactive.object);
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