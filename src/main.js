import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import DataLoader from './utils/data-loader.js';
import EntryPanel from './components/EntryPanel.js';
import VRController from './controllers/VRController.js';
import DesktopControls from './controllers/DesktopControls.js';
import Minimap from './ui/Minimap.js';
import EmotionLegend from './ui/EmotionLegend.js';
import Notifications from './ui/Notifications.js';
import OrbVisualizer from './visualizers/OrbVisualizer.js';
import InteractionManager from './utils/InteractionManager.js';
import AudioSystem from './utils/AudioSystem.js';
import AudioControls from './ui/AudioControls.js';
import PerformanceOptimizer from './utils/PerformanceOptimizer.js';
import PerformanceMonitor from './ui/PerformanceMonitor.js';
import UIManager from './core/UIManager.js';

/**
 * Main class for the WebXR application
 */
class WarholJournalViz {
  constructor() {
    // Core THREE.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Controllers and interaction
    this.vrController = null;
    this.desktopControls = null;
    this.interactionManager = null;
    
    // Visualizers and UI components
    this.orbVisualizer = null;
    this.minimap = null;
    this.emotionLegend = null;
    this.entryPanel = null;
    this.notifications = null;
    this.audioControls = null;
    this.uiManager = null;
    
    // Audio system
    this.audioSystem = null;
    
    // Performance optimization
    this.performanceOptimizer = null;
    this.performanceMonitor = null;
    
    // Data management
    this.dataLoader = new DataLoader();
    this.journalEntries = [];
    
    // Initialize the application
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
    
    // Add VR button AFTER renderer is in DOM
    document.getElementById('app').appendChild(VRButton.createButton(this.renderer));
    
    // Set up notifications
    this.notifications = new Notifications();
    
    // Create audio system
    this.audioSystem = new AudioSystem();
    
    // Create audio controls (pass audioSystem reference)
    this.audioControls = new AudioControls(this.camera, this.scene, this.audioSystem);
    
    // Create orb visualizer
    this.orbVisualizer = new OrbVisualizer(this.scene);
    
    // Set up interaction manager
    this.interactionManager = new InteractionManager({
      visualizer: this.orbVisualizer,
      getInteractiveObjects: () => this.getInteractiveObjects(),
      onSelect: this.handleSelection.bind(this),
      onDeselect: this.handleDeselection.bind(this)
    });
    
    // Set up VR controllers
    this.vrController = new VRController(this.scene, this.renderer, this.camera, {
      onSelect: (object) => this.interactionManager.handleSelection(object),
      onRayIntersection: (controller, intersection, object) => {
        // Check for audio controls interaction
        if (this.audioControls && this.audioControls.visible) {
          const audioInteraction = this.audioControls.handleInteraction(intersection);
          if (audioInteraction) {
            return;
          }
        }
        
        if (this.entryPanel) {
          const interaction = this.entryPanel.checkInteraction(intersection);
          if (interaction) {
            this.handlePanelInteraction(interaction);
            return;
          }
        }
        this.interactionManager.handleHover(object);
      },
      getInteractiveObjects: () => this.getInteractiveObjects(),
      
      // Pass UIManager toggle functions for VR controller buttons
      onAButtonPressed: () => this.uiManager.toggleEmotionLegend(),       // Right A -> Emotion Legend
      onBButtonPressed: () => this.uiManager.togglePerformanceOptimizer(), // Right B -> Performance Optimizer
      onXButtonPressed: () => this.uiManager.togglePerformanceMonitor(),  // Left X -> Performance Monitor
      onYButtonPressed: () => this.uiManager.toggleAudioMute()            // Left Y -> Audio Mute
    });
    
    // Set up desktop controls
    this.desktopControls = new DesktopControls(this.camera, this.renderer.domElement, {
      onSelect: (intersection) => {
        // Check for audio controls interaction
        if (this.audioControls && this.audioControls.visible && intersection) {
          const audioInteraction = this.audioControls.handleInteraction(intersection);
          if (audioInteraction) {
            return;
          }
        }
        
        if (intersection && this.entryPanel) {
          const interaction = this.entryPanel.checkInteraction(intersection);
          if (interaction) {
            this.handlePanelInteraction(interaction);
            return;
          }
        }
        if (intersection) {
          this.interactionManager.handleSelection(intersection.object);
        } else {
          this.interactionManager.deselectObject();
        }
      },
      onHover: (intersection) => {
        // Check for audio controls interaction
        if (this.audioControls && this.audioControls.visible && intersection) {
          const audioObjects = [
            this.audioControls.muteButton,
            this.audioControls.sliderBackground,
            this.audioControls.sliderHandle
          ];
          
          if (intersection.object && audioObjects.includes(intersection.object)) {
            this.renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
        
        if (intersection && this.entryPanel) {
          const interaction = this.entryPanel.checkInteraction(intersection);
          if (interaction) {
            // Update cursor based on interaction type
            this.renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
        if (intersection) {
          this.interactionManager.handleHover(intersection.object);
          this.renderer.domElement.style.cursor = 'pointer';
        } else {
          this.interactionManager.handleHover(null);
          this.renderer.domElement.style.cursor = 'grab';
        }
      },
      getRaycaster: () => this.interactionManager.raycaster,
      getInteractiveObjects: () => this.getInteractiveObjects()
    });
    
    // Add basic lighting
    this.addLighting();
    
    // Add a simple test cube to confirm the scene is working
    this.addTestCube();
    
    // Initialize empty entry panel
    this.entryPanel = new EntryPanel({
      camera: this.camera,
      scene: this.scene
    });
    
    // Load data and create visualization
    this.loadData();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add listener to trigger audio initialization on first interaction
    const handleFirstInteraction = async () => {
      if (!this.audioSystem.initialized) {
        await this.audioSystem.initContextAndSounds({
          journalEntries: this.journalEntries,
          camera: this.camera,
          notifications: this.notifications,
          audioControls: this.audioControls
        });
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
    
    // Create performance monitor
    this.performanceMonitor = new PerformanceMonitor({
      updateInterval: 1000,
      avgSamples: 30,
      showPanel: true
    });
    
    // Create UI Manager AFTER all UI components are initialized
    this.uiManager = new UIManager({
      audioControls: this.audioControls,
      minimap: this.minimap, // Will be created in createVisualization
      emotionLegend: this.emotionLegend, // Will be created in createVisualization
      performanceOptimizer: this.performanceOptimizer, // Will be created later
      performanceMonitor: this.performanceMonitor,
      notifications: this.notifications,
      audioSystem: this.audioSystem,
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera
    });

    // Add keyboard listener managed by UIManager
    document.addEventListener('keydown', (event) => this.uiManager.handleKeyboardShortcuts(event));
    
    // Start the animation loop using the built-in WebXR animation loop
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }
  
  addLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 1, 1).normalize();
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
    if (this.minimap) {
      this.minimap.onWindowResize();
    }
  }
  
  animate(timestamp) {
    // Start performance monitoring for this frame
    if (this.performanceMonitor) {
      this.performanceMonitor.begin();
    }
    
    // Update VR controller
    if (this.vrController) {
      this.vrController.update();
    }
    
    // Update desktop controls
    if (this.desktopControls) {
      // Tell desktop controls if we're in VR mode
      this.desktopControls.setVRStatus(this.renderer.xr.isPresenting);
      this.desktopControls.update();
    }
    
    // Get camera position for audio and other position-based features
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    
    // Update audio system
    if (this.audioSystem && this.audioSystem.audioContext && this.audioSystem.audioContext.state === 'running') {
      this.audioSystem.updateAudioMix(cameraPosition);
    }
    
    // Update orb visualizer
    if (this.orbVisualizer) {
      this.orbVisualizer.update();
    }
    
    // Update minimap
    if (this.minimap) {
      this.minimap.update();
    }
    
    // Update emotion legend position
    if (this.emotionLegend) {
      this.emotionLegend.updatePosition();
    }
    
    // Update entry panel position
    if (this.entryPanel) {
      this.entryPanel.updatePosition();
    }
    
    // Update audio controls position
    if (this.audioControls && this.audioControls.visible) {
      this.audioControls.updatePosition();
    }
    
    // Update performance optimizer
    if (this.performanceOptimizer) {
      this.performanceOptimizer.update();
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // End performance monitoring for this frame
    if (this.performanceMonitor && this.performanceOptimizer) {
      this.performanceMonitor.end(
        this.performanceOptimizer.visibleCount,
        this.performanceOptimizer.culledCount,
        this.performanceOptimizer.isEnabled
      );
    }
  }
  
  /**
   * Get a list of all interactive objects in the scene
   * @returns {Array} Array of interactive objects
   */
  getInteractiveObjects() {
    const interactiveObjects = [];
    
    // Check the test cube if it exists
    if (this.testCube && this.testCube.userData.interactive) {
      interactiveObjects.push(this.testCube);
    }
    
    // Get orb objects
    if (this.orbVisualizer) {
      interactiveObjects.push(...this.orbVisualizer.getInteractiveObjects());
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
    
    // Add audio control interactive elements
    if (this.audioControls && this.audioControls.visible) {
      if (this.audioControls.muteButton) {
        interactiveObjects.push(this.audioControls.muteButton);
      }
      if (this.audioControls.sliderBackground) {
        interactiveObjects.push(this.audioControls.sliderBackground);
      }
      if (this.audioControls.sliderHandle) {
        interactiveObjects.push(this.audioControls.sliderHandle);
      }
    }
    
    return interactiveObjects;
  }
  
  /**
   * Handle panel interaction (close, scroll)
   * @param {string} interaction - The interaction type
   */
  handlePanelInteraction(interaction) {
    if (!this.entryPanel) return;
    
    switch (interaction) {
      case 'close':
        this.entryPanel.hide();
        break;
      case 'scroll-up':
        this.entryPanel.scroll('up');
        break;
      case 'scroll-down':
        this.entryPanel.scroll('down');
        break;
    }
  }
  
  /**
   * Handle selection of an object
   * @param {Object} selectedObj - The selected object
   */
  handleSelection(selectedObj) {
    if (!selectedObj) {
      console.log('handleSelection called with null object');
      return;
    }
    
    console.log('Selected object:', selectedObj.uuid, 'Type:', selectedObj.userData?.type);
    
    // First, completely disable performance optimization if it's enabled
    if (this.performanceOptimizer && this.performanceOptimizer.isEnabled) {
      console.log('Temporarily disabling performance optimization for selection');
      this.performanceOptimizer.temporarilyDisable();
      
      // Force a render cycle to ensure all objects are properly restored
      this.renderer.render(this.scene, this.camera);
    }
    
    // Play selection sound
    if (this.audioSystem && this.audioSystem.initialized) {
      this.audioSystem.playSelectSound();
    }
    
    if (selectedObj.userData && selectedObj.userData.type === 'journal-entry') {
      console.log('Journal entry selected:', selectedObj.userData.entry?.id);
      
      // Ensure we have valid entry data
      if (!selectedObj.userData.entry) {
        console.warn('Selected orb has no entry data');
        this.notifications.show('Error: Selected orb has no entry data');
        return;
      }
      
      try {
        // Explicitly mark the object as selected (for the performance optimizer)
        selectedObj.userData.selected = true;
        
        // Highlight related entries
        if (this.orbVisualizer) {
          this.orbVisualizer.highlightRelatedEntries(selectedObj);
        }
        
        // Get the entry data for audio processing
        const entry = selectedObj.userData.entry;
        
        // Send entry emotion data to the audio system
        if (this.audioSystem && this.audioSystem.initialized) {
          // Clone the entry data to avoid any reference issues
          const entryCopy = this.cloneEntryData(entry);
          // Play entry audio based on emotions
          this.audioSystem.playEntryAudio(entryCopy);
          // Store the entry for replay after unmuting
          this.audioSystem.setLastSelectedEntry(entryCopy);
        }
        
        // Use a timeout to ensure rendering has fully completed before showing the panel
        setTimeout(() => {
          try {
            // Display the entry panel with error handling
            if (this.entryPanel) {
              // Validate entry data before showing
              if (!entry.text) {
                console.warn('Entry is missing text content:', entry);
                this.notifications.show('Error: Entry is missing text content');
                return;
              }
              
              // Clone the entry data to avoid any reference issues
              const entryCopy = this.cloneEntryData(entry);
              this.entryPanel.showEntry(entryCopy);
            }
            
            // Show brief notification
            const date = selectedObj.userData.entry.date ? 
                        new Date(selectedObj.userData.entry.date).toLocaleDateString() : 'Unknown date';
            this.notifications.show(`Selected: ${date}`);
          } catch (error) {
            console.error('Error displaying entry panel:', error);
            this.notifications.show('Error displaying entry. Try another one.');
            
            // Cleanup in case of error
            if (this.entryPanel && this.entryPanel.isVisible()) {
              this.entryPanel.hide();
            }
          }
        }, 50); // Small timeout to ensure state is fully updated
        
      } catch (error) {
        console.error('Error in entry selection handling:', error);
        this.notifications.show('Error selecting entry. Please try another one.');
      }
    } else if (selectedObj.userData && selectedObj.userData.type === 'test-cube') {
      console.log('Selected test cube');
      this.notifications.show('Test cube selected!');
    } else {
      console.log('Selected object with unknown type:', selectedObj.userData?.type);
    }
  }
  
  /**
   * Create a safe clone of entry data to avoid reference issues
   * @param {Object} entry - The original entry data
   * @returns {Object} A clone of the entry
   */
  cloneEntryData(entry) {
    try {
      const cloned = {
        id: entry.id,
        date: entry.date,
        text: entry.text,
        location: entry.location,
        topics: Array.isArray(entry.topics) ? [...entry.topics] : [],
        emotions: entry.emotions ? {...entry.emotions} : {},
        entities: {}
      };
      
      // Clone entities if they exist
      if (entry.entities) {
        cloned.entities = {};
        if (Array.isArray(entry.entities.people)) cloned.entities.people = [...entry.entities.people];
        if (Array.isArray(entry.entities.places)) cloned.entities.places = [...entry.entities.places];
      }
      
      // Copy coordinates but don't include in panel display
      if (entry.coordinates) {
        cloned.coordinates = {...entry.coordinates};
      }
      
      // Copy related entries array but don't include in panel display
      if (Array.isArray(entry.relatedEntries)) {
        cloned.relatedEntries = [...entry.relatedEntries];
      }
      
      return cloned;
    } catch (error) {
      console.error('Error cloning entry data:', error);
      // Return the original if cloning fails
      return entry;
    }
  }
  
  /**
   * Handle deselection of an object
   * @param {Object} deselectedObj - The deselected object
   */
  handleDeselection(deselectedObj) {
    // Clear selected flag if present
    if (deselectedObj && deselectedObj.userData) {
      deselectedObj.userData.selected = false;
    }
    
    // Clean up related entry highlighting
    if (this.orbVisualizer) {
      this.orbVisualizer.cleanupRelatedEntries();
    }
    
    // Stop audio playback if using SuperCollider
    if (this.audioSystem && this.audioSystem.initialized && this.audioSystem.useOsc && !this.audioSystem.useFallback) {
      if (this.audioSystem.oscBridge) {
        this.audioSystem.oscBridge.stopAllSounds();
      }
    }
    
    // Hide the entry panel
    if (this.entryPanel) {
      this.entryPanel.hide();
    }
    
    // Resume performance optimizations if they were temporarily disabled
    if (this.performanceOptimizer && this.performanceOptimizer.temporarilyDisabled) {
      // Use a timeout to ensure all cleanup is complete
      setTimeout(() => {
        console.log('Resuming performance optimizations after deselection');
        this.performanceOptimizer.resumeOptimizations();
      }, 100);
    }
  }
  
  /**
   * Load journal data and create visualization
   */
  async loadData() {
    try {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('loading-text').textContent = 'Loading journal data...';
      
      // First try to load the optimized dataset
      try {
        console.log('Attempting to load the optimized dataset...');
        const data = await this.dataLoader.loadData('/data/warhol_final_optimized.json');
        
        // Validate data for missing relatedEntries
        if (data.entries) {
          let fixedCount = 0;
          data.entries.forEach(entry => {
            if (!entry.relatedEntries || !Array.isArray(entry.relatedEntries)) {
              entry.relatedEntries = [];
              fixedCount++;
            }
          });
          if (fixedCount > 0) {
            console.log(`Fixed ${fixedCount} entries with missing relatedEntries arrays`);
          }
        }
        
        this.journalEntries = data.entries;
        console.log(`Successfully loaded ${this.journalEntries.length} entries from optimized dataset`);
      } catch (optimizedError) {
        console.error('Error loading optimized dataset:', optimizedError);
        
        // Fall back to the original dataset
        try {
          console.log('Falling back to original dataset...');
          document.getElementById('loading-text').textContent = 'Loading original dataset instead...';
          
          const originalData = await this.dataLoader.loadData('/data/warhol_final_optimized.json');
          
          // Validate data for missing relatedEntries
          if (originalData.entries) {
            let fixedCount = 0;
            originalData.entries.forEach(entry => {
              if (!entry.relatedEntries || !Array.isArray(entry.relatedEntries)) {
                entry.relatedEntries = [];
                fixedCount++;
              }
            });
            if (fixedCount > 0) {
              console.log(`Fixed ${fixedCount} entries with missing relatedEntries arrays`);
            }
          }
          
          this.journalEntries = originalData.entries;
          console.log(`Successfully loaded ${this.journalEntries.length} entries from original dataset`);
        } catch (originalError) {
          console.error('Error loading original dataset:', originalError);
          
          // Fall back to the sample dataset
          document.getElementById('loading-text').textContent = 'Loading sample dataset instead...';
          console.log('Falling back to sample dataset...');
          
          try {
            const sampleData = await this.dataLoader.loadData('/data/sample.json');
            this.journalEntries = sampleData.entries;
            console.log(`Successfully loaded ${this.journalEntries.length} sample entries`);
            
            // Show a notification that we're using sample data
            this.notifications.show('Using sample dataset - full dataset could not be loaded.');
          } catch (sampleError) {
            console.error('Error loading sample dataset:', sampleError);
            throw new Error('Failed to load all datasets');
          }
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
   * Validate and fix journal data structure
   * @param {Object} data - The data object to validate
   */
  validateAndFixData(data) {
    if (!data || !data.entries || !Array.isArray(data.entries)) {
      console.error('Invalid data format: missing entries array');
      return;
    }
    
    console.log(`Validating ${data.entries.length} entries...`);
    
    // Count issues
    let missingCoordinates = 0;
    let missingRelatedEntries = 0;
    let fixedRelatedEntries = 0;
    
    // Process each entry
    data.entries.forEach((entry, index) => {
      // Check for missing coordinates
      if (!entry.coordinates) {
        missingCoordinates++;
        console.warn(`Entry ${entry.id || index} is missing coordinates`);
        
        // Provide a default position to prevent issues
        entry.coordinates = { x: 0, y: 0, z: 0 };
      }
      
      // Check for missing relatedEntries array
      if (!entry.relatedEntries || !Array.isArray(entry.relatedEntries)) {
        missingRelatedEntries++;
        
        // Fix by creating an empty array
        entry.relatedEntries = [];
        fixedRelatedEntries++;
      }
    });
    
    // Log validation results
    if (missingCoordinates > 0) {
      console.warn(`Fixed ${missingCoordinates} entries missing coordinates`);
    }
    
    if (missingRelatedEntries > 0) {
      console.warn(`Fixed ${missingRelatedEntries} entries missing relatedEntries`);
    }
    
    console.log(`Validation complete: fixed ${fixedRelatedEntries} issues`);
  }
  
  /**
   * Create the 3D visualization of journal entries
   */
  createVisualization() {
    if (!this.journalEntries || this.journalEntries.length === 0) {
      console.warn('No journal entries to visualize');
      return;
    }
    
    // Create orbs with the visualizer
    const orbStats = this.orbVisualizer.createOrbs(this.journalEntries);
    
    // Position camera based on orb statistics
    if (orbStats.avgPosition) {
      const { x, y, z } = orbStats.avgPosition;
      this.camera.position.set(x, y + 1.6, z + 5); // Position camera near the center with some offset
      this.camera.lookAt(x, y, z);
      console.log(`Positioned camera at: ${x.toFixed(2)}, ${(y + 1.6).toFixed(2)}, ${(z + 5).toFixed(2)}`);
    }
    
    // Create minimap with proper Y range
    this.minimap = new Minimap(this.camera, this.scene, {
      yRangeMin: orbStats.yRange ? orbStats.yRange.min - 2 : -10,
      yRangeMax: orbStats.yRange ? orbStats.yRange.max + 2 : 30
    });
    console.log('Minimap created');
    
    // Add data points to minimap
    if (this.minimap && this.journalEntries) {
      this.journalEntries.forEach(entry => {
        if (entry.coordinates) {
          const emotionColor = this.orbVisualizer.blendEmotionColors(entry.emotions);
          this.minimap.addPoint(
            entry.coordinates.x,
            entry.coordinates.z,
            {
              y: entry.coordinates.y,
              color: emotionColor,
              showHeight: true
            }
          );
        }
      });
    }
    
    // Create emotion legend
    this.emotionLegend = new EmotionLegend(this.camera, this.scene, {
      colorMap: this.orbVisualizer.emotionColorsRGB
    });
    console.log('Emotion legend created');
    
    // Set up audio emotion centers if audio system is available 
    if (this.audioSystem && this.audioSystem.audioContext) {
      this.audioSystem.calculateEmotionCenters(this.journalEntries);
    }
    
    // Hide test cube if it exists
    if (this.testCube) {
      this.testCube.visible = false;
    }
    
    // Add some debug elements for testing audio
    this.addAudioDebugElements();
    
    // Initialize performance optimizer
    this.initPerformanceOptimizer();
    
    // Show welcome notification
    this.notifications.show('Warhol Journal Visualization loaded. Click/press to select entries.');
    
    // Update UI Manager with components created after initial setup
    this.uiManager.minimap = this.minimap;
    this.uiManager.emotionLegend = this.emotionLegend;
  }
  
  /**
   * Initialize the performance optimizer
   */
  initPerformanceOptimizer() {
    // Create performance optimizer
    this.performanceOptimizer = new PerformanceOptimizer({
      cullingDistance: 20,
      updateFrequency: 5,
      lodDistances: [5, 10, 20],
      lodDetailLevels: [16, 12, 8, 4],
      lodMaterialSimplify: true,
      debug: false
    });
    
    // Get all orbs to optimize
    const orbsToOptimize = [];
    if (this.orbVisualizer) {
      // Add all orbs from orbVisualizer
      this.orbVisualizer.orbObjects.forEach((orb) => {
        orbsToOptimize.push(orb);
      });
    }
    
    // Initialize with orbs and camera
    this.performanceOptimizer.init(orbsToOptimize, this.camera);
    
    // Update UI Manager with the performance optimizer
    this.uiManager.performanceOptimizer = this.performanceOptimizer;
  }
  
  /**
   * Add debug elements to help with audio testing
   */
  addAudioDebugElements() {
    // Add emotion center spheres to visualize audio positions
    if (this.audioSystem && Object.keys(this.audioSystem.emotionCenters).length > 0) {
      const emotionColors = {
        'joy': 0xFFFF00, // Yellow
        'trust': 0x00FF00, // Green
        'fear': 0xFF00FF, // Magenta
        'surprise': 0x00FFFF, // Cyan
        'sadness': 0x0000FF, // Blue
        'disgust': 0xFF00AA, // Pink
        'anger': 0xFF0000, // Red
        'anticipation': 0xFF8800 // Orange
      };
      
      Object.entries(this.audioSystem.emotionCenters).forEach(([emotion, position]) => {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
          color: emotionColors[emotion] || 0xFFFFFF,
          transparent: true,
          opacity: 0.5,
          wireframe: true
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        
        // Add text label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(emotion, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(2, 1);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true,
          depthTest: false,
          side: THREE.DoubleSide
        });
        
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(0, 1.0, 0);
        
        sphere.add(label);
        this.scene.add(sphere);
        
        console.log(`Added debug marker for ${emotion} at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
      });
    }
  }
  
  /**
   * Clean up and dispose resources when application is closed
   */
  dispose() {
    // Dispose visualizer resources
    if (this.orbVisualizer) {
      this.orbVisualizer.dispose();
    }
    
    // Dispose UI components
    if (this.minimap) this.minimap.dispose();
    if (this.emotionLegend) this.emotionLegend.dispose();
    if (this.entryPanel) this.entryPanel.dispose();
    if (this.notifications) this.notifications.dispose();
    if (this.audioControls) this.audioControls.dispose();
    if (this.performanceMonitor) this.performanceMonitor.dispose();
    
    // Dispose controllers
    if (this.vrController) this.vrController.dispose();
    if (this.desktopControls) this.desktopControls.dispose();
    
    // Dispose interaction manager
    if (this.interactionManager) this.interactionManager.dispose();
    
    // Dispose audio system
    if (this.audioSystem) this.audioSystem.dispose();
    
    // Dispose performance optimizer
    if (this.performanceOptimizer) {
      this.performanceOptimizer.dispose();
    }
    
    // Stop animation loop
    this.renderer.setAnimationLoop(null);
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose scene and renderer
    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 