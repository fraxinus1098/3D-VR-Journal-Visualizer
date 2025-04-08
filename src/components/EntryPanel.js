import * as THREE from 'three';
import { Text } from 'troika-three-text';

/**
 * EntryPanel class for displaying journal entry details in VR
 * Creates a floating panel with entry text, date, topics, and entities
 */
export default class EntryPanel {
  /**
   * Constructor for the EntryPanel
   * @param {Object} params Configuration parameters
   * @param {THREE.Camera} params.camera Camera for positioning the panel
   * @param {THREE.Scene} params.scene Scene to add the panel to
   */
  constructor({ camera, scene }) {
    this.camera = camera;
    this.scene = scene;
    this.panel = null;
    this.textElements = [];
    this.visible = false;
    this.distanceFromCamera = 1.5; // Distance in front of the camera
    this.followCamera = true;
    this.currentEntry = null;
    this.scrollOffset = 0;
    this.maxScrollOffset = 0;
    this.scrollSpeed = 0.05;
    this.textContainer = null;
    
    // Create panel elements
    this.createPanel();
  }

  /**
   * Create the panel and its components
   */
  createPanel() {
    // Create a group to hold all panel elements
    this.panel = new THREE.Group();
    
    // Set panel to a very high rendering order to ensure it's in front of other UI elements
    this.panel.renderOrder = 100;
    
    // Create background panel - LARGER SIZE (increased height)
    const panelGeometry = new THREE.PlaneGeometry(1.5, 1.4);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: false, // MAKE SOLID
      side: THREE.DoubleSide,
      depthTest: false, // Ensure it renders on top regardless of depth
      depthWrite: false // Don't write to depth buffer
    });
    
    this.panelBackground = new THREE.Mesh(panelGeometry, panelMaterial);
    this.panel.add(this.panelBackground);
    this.panelBackground.renderOrder = 100;
    
    // Create text container for scrolling
    this.textContainer = new THREE.Group();
    this.textContainer.renderOrder = 101; // Higher than panel background
    this.panel.add(this.textContainer);
    
    // Create scroll area mask - restrict visible area
    this.createScrollMask();
    
    // Create close button
    const closeButtonGeometry = new THREE.CircleGeometry(0.04, 32);
    const closeButtonMaterial = new THREE.MeshBasicMaterial({
      color: 0xbb3333,
      transparent: false,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    this.closeButton = new THREE.Mesh(closeButtonGeometry, closeButtonMaterial);
    this.closeButton.position.set(0.7, 0.64, 0.01); // Top right corner, in front
    this.closeButton.userData.type = 'close-button';
    this.closeButton.userData.interactive = true;
    this.closeButton.renderOrder = 102; // Ensure it's in front of the panel
    this.panel.add(this.closeButton);
    
    // Add X to close button
    const closeX = new Text();
    closeX.text = '✕';
    closeX.fontSize = 0.04;
    closeX.position.set(0, 0, 0.001);
    closeX.color = 0xffffff;
    closeX.anchorX = 'center';
    closeX.anchorY = 'middle';
    closeX.renderOrder = 103;
    closeX.sync();
    this.closeButton.add(closeX);
    
    // Create panel border
    const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({ 
      color: 0x666666,
      transparent: false,
      depthTest: false,
      depthWrite: false
    });
    
    this.panelBorder = new THREE.LineSegments(borderGeometry, borderMaterial);
    this.panelBorder.position.set(0, 0, 0.001);
    this.panelBorder.renderOrder = 101;
    this.panel.add(this.panelBorder);
    
    // Add scroll buttons
    this.createScrollButtons();
    
    // Hide panel initially
    this.panel.visible = false;
    
    // Add panel to scene
    this.scene.add(this.panel);
  }

  /**
   * Create a mask for the scroll area
   */
  createScrollMask() {
    // Visual indicator for scrollable area
    const scrollBarGeometry = new THREE.PlaneGeometry(0.03, 1.2);
    const scrollBarMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: false,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    this.scrollBar = new THREE.Mesh(scrollBarGeometry, scrollBarMaterial);
    this.scrollBar.position.set(0.7, 0, 0.005);
    this.scrollBar.renderOrder = 101;
    this.panel.add(this.scrollBar);
    
    // Scroll indicator that moves to show position
    const scrollIndicatorGeometry = new THREE.PlaneGeometry(0.025, 0.15);
    const scrollIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: false,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    this.scrollIndicator = new THREE.Mesh(scrollIndicatorGeometry, scrollIndicatorMaterial);
    this.scrollIndicator.position.set(0, 0, 0.001);
    this.scrollIndicator.renderOrder = 102;
    this.scrollBar.add(this.scrollIndicator);
  }

  /**
   * Create scroll buttons for panel
   */
  createScrollButtons() {
    // Scroll up button
    const buttonGeometry = new THREE.CircleGeometry(0.03, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: false,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    // Up button
    this.scrollUpButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
    this.scrollUpButton.position.set(0.7, 0.55, 0.01);
    this.scrollUpButton.userData.type = 'scroll-up-button';
    this.scrollUpButton.userData.interactive = true;
    this.scrollUpButton.renderOrder = 102;
    this.panel.add(this.scrollUpButton);
    
    // Up arrow
    const upArrow = new Text();
    upArrow.text = '▲';
    upArrow.fontSize = 0.03;
    upArrow.position.set(0, 0, 0.001);
    upArrow.color = 0xffffff;
    upArrow.anchorX = 'center';
    upArrow.anchorY = 'middle';
    upArrow.renderOrder = 103;
    upArrow.sync();
    this.scrollUpButton.add(upArrow);
    
    // Down button
    this.scrollDownButton = new THREE.Mesh(buttonGeometry.clone(), buttonMaterial.clone());
    this.scrollDownButton.position.set(0.7, -0.55, 0.01);
    this.scrollDownButton.userData.type = 'scroll-down-button';
    this.scrollDownButton.userData.interactive = true;
    this.scrollDownButton.renderOrder = 102;
    this.panel.add(this.scrollDownButton);
    
    // Down arrow
    const downArrow = new Text();
    downArrow.text = '▼';
    downArrow.fontSize = 0.03;
    downArrow.position.set(0, 0, 0.001);
    downArrow.color = 0xffffff;
    downArrow.anchorX = 'center';
    downArrow.anchorY = 'middle';
    downArrow.renderOrder = 103;
    downArrow.sync();
    this.scrollDownButton.add(downArrow);
  }

  /**
   * Update the panel position to follow the camera
   */
  updatePosition() {
    if (!this.visible || !this.panel) return;
    
    if (this.followCamera) {
      // Position panel in front of the camera
      const panelDistance = this.distanceFromCamera;
      
      // Get camera direction
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      
      // Calculate position in front of camera
      const panelPosition = new THREE.Vector3()
        .copy(this.camera.position)
        .add(cameraDirection.multiplyScalar(panelDistance));
      
      // Apply position to panel
      this.panel.position.copy(panelPosition);
      
      // Make panel face the camera
      this.panel.quaternion.copy(this.camera.quaternion);
    }
  }

  /**
   * Scroll the panel content up or down
   * @param {string} direction - 'up' or 'down'
   */
  scroll(direction) {
    if (direction === 'up') {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.scrollSpeed);
    } else if (direction === 'down') {
      this.scrollOffset = Math.min(this.maxScrollOffset, this.scrollOffset + this.scrollSpeed);
    }
    
    // Update text container position
    if (this.textContainer) {
      this.textContainer.position.y = this.scrollOffset;
    }
    
    // Update scroll indicator position
    if (this.scrollIndicator && this.maxScrollOffset > 0) {
      const scrollPercent = this.scrollOffset / this.maxScrollOffset;
      const scrollRange = 0.85; // Range of movement for indicator
      this.scrollIndicator.position.y = (scrollRange * -scrollPercent) + (scrollRange / 2);
    }
  }

  /**
   * Check if a point intersects with interactive elements
   * @param {THREE.Intersection} intersection Raycaster intersection
   * @returns {string|null} Action to perform or null if no interaction
   */
  checkInteraction(intersection) {
    if (!this.visible) return null;
    
    const object = intersection.object;
    
    if (object === this.closeButton) {
      return 'close';
    } else if (object === this.scrollUpButton) {
      return 'scroll-up';
    } else if (object === this.scrollDownButton) {
      return 'scroll-down';
    }
    
    return null;
  }

  /**
   * Display entry details on the panel
   * @param {Object} entry Journal entry data
   */
  showEntry(entry) {
    if (!entry) return;
    
    this.currentEntry = entry;
    
    // Clear any existing text elements
    this.clearText();
    
    // Reset scroll position
    this.scrollOffset = 0;
    if (this.textContainer) {
      this.textContainer.position.y = 0;
    }
    
    // Date header
    const dateStr = entry.date ? new Date(entry.date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Unknown Date';
    
    this.addText({
      text: dateStr,
      position: [0, 0.58, 0.01],
      fontSize: 0.07,
      color: 0xffffff,
      font: 'bold'
    });

    // Location if available
    if (entry.location) {
      this.addText({
        text: entry.location,
        position: [0, 0.45, 0.01],
        fontSize: 0.05,
        color: 0xcccccc
      });
    }
    
    // Journal entry text (full text for scrolling)
    this.addText({
      text: entry.text,
      position: [0, 0.15, 0.01],
      fontSize: 0.04,
      color: 0xffffff,
      maxWidth: 1.3,
      lineHeight: 1.3,
      textAlign: 'justify'
    });
    
    // Topics section
    if (entry.topics && entry.topics.length > 0) {
      const yPosition = -0.6 - (entry.text.length * 0.0001); // Position below the text
      
      this.addText({
        text: 'Topics:',
        position: [-0.65, yPosition, 0.01],
        fontSize: 0.045,
        color: 0xaaccff,
        anchorX: 'left'
      });
      
      this.addText({
        text: entry.topics.join(', '),
        position: [-0.65, yPosition - 0.07, 0.01],
        fontSize: 0.04,
        color: 0xcccccc,
        anchorX: 'left',
        maxWidth: 1.3
      });
    }
    
    // People section
    if (entry.entities && entry.entities.people && entry.entities.people.length > 0) {
      const yPosition = -0.8 - (entry.text.length * 0.0001); // Position below topics
      
      this.addText({
        text: 'People:',
        position: [-0.65, yPosition, 0.01],
        fontSize: 0.045,
        color: 0xffaa88,
        anchorX: 'left'
      });
      
      this.addText({
        text: entry.entities.people.join(', '),
        position: [-0.65, yPosition - 0.07, 0.01],
        fontSize: 0.04,
        color: 0xcccccc,
        anchorX: 'left',
        maxWidth: 1.3
      });
    }
    
    // Calculate the total height of the content to determine if scrolling is needed
    this.calculateContentHeight();
    
    // Make panel visible
    this.show();
  }

  /**
   * Calculate the total height of content to determine scroll limits
   */
  calculateContentHeight() {
    // Simple calculation based on text length
    if (this.currentEntry) {
      const textLength = this.currentEntry.text.length;
      const estimatedLines = textLength / 30; // Rough estimate: 30 chars per line
      const lineHeight = 0.05;
      const contentHeight = estimatedLines * lineHeight;
      
      // Add extra space for topics and people sections
      const extraSections = 0.5;
      
      // Panel visible height: ~1.2 (accounting for header space)
      const visibleHeight = 1.2;
      
      // Max scroll offset (0 if content fits within panel)
      this.maxScrollOffset = Math.max(0, contentHeight + extraSections - visibleHeight);
      
      // Update scroll indicator visibility
      if (this.scrollIndicator && this.scrollUpButton && this.scrollDownButton) {
        const showScroll = this.maxScrollOffset > 0;
        this.scrollIndicator.visible = showScroll;
        this.scrollUpButton.visible = showScroll;
        this.scrollDownButton.visible = showScroll;
        this.scrollBar.visible = showScroll;
      }
    }
  }

  /**
   * Add text element to the panel
   * @param {Object} params Text parameters
   */
  addText({ text, position = [0, 0, 0], fontSize = 0.05, color = 0xffffff, maxWidth, lineHeight, 
            textAlign = 'center', font, anchorX = 'center', anchorY = 'middle' }) {
    const textElement = new Text();
    
    textElement.text = text;
    textElement.fontSize = fontSize;
    textElement.position.set(...position);
    textElement.color = color;
    textElement.anchorX = anchorX;
    textElement.anchorY = anchorY;
    textElement.font = font;
    textElement.renderOrder = 102; // Ensure text is above panel
    textElement.depthTest = false; // Make sure it always renders on top
    
    if (maxWidth) {
      textElement.maxWidth = maxWidth;
    }
    
    if (lineHeight) {
      textElement.lineHeight = lineHeight;
    }
    
    if (textAlign) {
      textElement.textAlign = textAlign;
    }
    
    textElement.sync();
    
    // Add to text container for scrolling
    this.textContainer.add(textElement);
    this.textElements.push(textElement);
    
    return textElement;
  }

  /**
   * Clear all text elements from the panel
   */
  clearText() {
    // Remove all text elements from the panel
    this.textElements.forEach(text => {
      this.textContainer.remove(text);
      text.dispose();
    });
    
    this.textElements = [];
  }

  /**
   * Show the panel
   */
  show() {
    this.visible = true;
    this.panel.visible = true;
    this.updatePosition(); // Position panel correctly before showing
  }

  /**
   * Hide the panel
   */
  hide() {
    this.visible = false;
    this.panel.visible = false;
    this.currentEntry = null;
  }

  /**
   * Check if a point intersects with the close button
   * @param {THREE.Intersection} intersection Raycaster intersection
   * @returns {Boolean} True if close button was clicked
   */
  checkCloseButtonClick(intersection) {
    if (!this.visible) return false;
    
    return intersection.object === this.closeButton;
  }

  /**
   * Clean up resources used by the panel
   */
  dispose() {
    this.clearText();
    
    // Dispose of geometries and materials
    if (this.panelBackground) {
      this.panelBackground.geometry.dispose();
      this.panelBackground.material.dispose();
    }
    
    if (this.closeButton) {
      this.closeButton.geometry.dispose();
      this.closeButton.material.dispose();
    }
    
    if (this.panelBorder) {
      this.panelBorder.geometry.dispose();
      this.panelBorder.material.dispose();
    }
    
    if (this.scrollUpButton) {
      this.scrollUpButton.geometry.dispose();
      this.scrollUpButton.material.dispose();
    }
    
    if (this.scrollDownButton) {
      this.scrollDownButton.geometry.dispose();
      this.scrollDownButton.material.dispose();
    }
    
    if (this.scrollBar) {
      this.scrollBar.geometry.dispose();
      this.scrollBar.material.dispose();
    }
    
    if (this.scrollIndicator) {
      this.scrollIndicator.geometry.dispose();
      this.scrollIndicator.material.dispose();
    }
    
    // Remove from scene
    if (this.panel) {
      this.scene.remove(this.panel);
    }
  }
} 