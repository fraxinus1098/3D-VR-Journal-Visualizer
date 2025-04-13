import * as THREE from 'three';

/**
 * Creates and manages an emotion wheel legend based on Plutchik's wheel
 */
export default class EmotionLegend {
  constructor(camera, scene, options = {}) {
    this.camera = camera;
    this.scene = scene;
    
    // Configuration options with defaults
    this.options = Object.assign({
      position: { distance: 1.0, leftOffset: 0.4, downOffset: 0.3 },
      wheelRadius: 0.3,
      innerRadius: 0.12, // Center hole (40% of wheel radius)
      title: 'EMOTION WHEEL',
      renderOrder: 5
    }, options);
    
    // Define emotions in Plutchik's wheel with colors
    this.emotions = [
      { name: 'Joy', color: [1.0, 1.0, 0.0] },         // yellow (12 o'clock)
      { name: 'Trust', color: [0.0, 0.8, 0.0] },       // green
      { name: 'Fear', color: [0.6, 1.0, 0.6] },        // light green
      { name: 'Surprise', color: [0.0, 0.8, 0.8] },    // turquoise
      { name: 'Sadness', color: [0.0, 0.0, 1.0] },     // blue
      { name: 'Disgust', color: [0.5, 0.0, 0.5] },     // purple
      { name: 'Anger', color: [1.0, 0.0, 0.0] },       // red
      { name: 'Anticipation', color: [1.0, 0.5, 0.0] } // orange
    ];
    
    // Group for all legend elements
    this.legendGroup = null;
    
    // Visibility flag
    this.visible = true;
    
    this.init();
  }
  
  init() {
    // Create a group for the legend that will follow the camera
    this.legendGroup = new THREE.Group();
    // Set a lower renderOrder for the entire legend group to appear behind other UI
    this.legendGroup.renderOrder = this.options.renderOrder;
    this.scene.add(this.legendGroup);
    
    // Create the circular background
    this.createBackground();
    
    // Create legend title
    this.createTitle();
    
    // Create emotion wedges
    this.createEmotionWedges();
    
    // Position the legend initially
    this.updatePosition();
  }
  
  /**
   * Create the circular background for the legend
   */
  createBackground() {
    const circleGeometry = new THREE.CircleGeometry(this.options.wheelRadius, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthTest: false
    });
    
    const circleBackground = new THREE.Mesh(circleGeometry, circleMaterial);
    circleBackground.renderOrder = this.options.renderOrder;
    this.legendGroup.add(circleBackground);
  }
  
  /**
   * Create the title for the legend
   */
  createTitle() {
    const titleCanvas = document.createElement('canvas');
    const titleContext = titleCanvas.getContext('2d');
    titleCanvas.width = 256;
    titleCanvas.height = 32;
    titleContext.fillStyle = '#ffffff';
    titleContext.font = 'bold 20px Arial';
    titleContext.textAlign = 'center';
    titleContext.textBaseline = 'middle';
    titleContext.fillText(this.options.title, 128, 16);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMaterial = new THREE.MeshBasicMaterial({
      map: titleTexture,
      transparent: true,
      depthTest: false
    });
    
    const titleGeometry = new THREE.PlaneGeometry(0.4, 0.04);
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, this.options.wheelRadius + 0.05, 0.001);
    titleMesh.renderOrder = this.options.renderOrder;
    this.legendGroup.add(titleMesh);
  }
  
  /**
   * Create wedges for each emotion in the wheel
   */
  createEmotionWedges() {
    const segments = this.emotions.length;
    const angleStep = (Math.PI * 2) / segments;
    
    for (let i = 0; i < segments; i++) {
      const emotion = this.emotions[i];
      // Start at 12 o'clock (-Math.PI/2) and go clockwise
      const startAngle = -Math.PI/2 + i * angleStep;
      const endAngle = -Math.PI/2 + (i + 1) * angleStep;
      
      // Create a custom shape for the wedge
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); // Center of the wheel
      
      // Draw the inner arc (small radius)
      shape.absarc(0, 0, this.options.innerRadius, startAngle, endAngle, false);
      
      // Draw the outer arc (full radius)
      shape.absarc(0, 0, this.options.wheelRadius, endAngle, startAngle, true);
      
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
      wedge.renderOrder = this.options.renderOrder;
      this.legendGroup.add(wedge);
      
      // Add emotion labels
      this.createEmotionLabel(emotion, startAngle, endAngle);
    }
  }
  
  /**
   * Create a label for an emotion wedge
   */
  createEmotionLabel(emotion, startAngle, endAngle) {
    const middleAngle = (startAngle + endAngle) / 2;
    const labelDistance = this.options.wheelRadius * 0.7; // Position labels between inner and outer radius
    
    // Calculate position using sine and cosine
    const labelX = Math.cos(middleAngle) * labelDistance;
    const labelY = Math.sin(middleAngle) * labelDistance;
    
    const labelCanvas = document.createElement('canvas');
    const labelContext = labelCanvas.getContext('2d');
    labelCanvas.width = 512;
    labelCanvas.height = 128; // Increased height for larger text
    
    // Use white text color with black outline for better visibility
    labelContext.fillStyle = '#ffffff';
    labelContext.font = 'bold 72px Arial'; // Large font size for readability
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
    label.renderOrder = this.options.renderOrder;
    
    // Calculate the correct rotation for text orientation
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
  
  /**
   * Get color for an emotion name
   * @param {string} emotionName - Name of the emotion
   * @returns {THREE.Color} Color object for the emotion
   */
  getColorForEmotion(emotionName) {
    const normalizedName = emotionName.toLowerCase();
    
    // Find matching emotion
    for (const emotion of this.emotions) {
      if (emotion.name.toLowerCase() === normalizedName) {
        return new THREE.Color(
          emotion.color[0],
          emotion.color[1],
          emotion.color[2]
        );
      }
    }
    
    // Return gray for unknown emotions
    return new THREE.Color(0.7, 0.7, 0.7);
  }
  
  /**
   * Blend multiple emotion colors based on their intensities
   * @param {Object} emotions - Object with emotion names as keys and intensities as values
   * @returns {THREE.Color} - Blended color for the emotions
   */
  blendEmotionColors(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) {
      return new THREE.Color(0.7, 0.7, 0.7); // Gray for no emotions
    }
    
    // Normalize emotion names to handle case sensitivity
    const normalizedEmotions = {};
    for (const [emotion, value] of Object.entries(emotions)) {
      const normName = emotion.toLowerCase();
      // Find matching emotion in our defined set
      const matchingEmotion = this.emotions.find(e => 
        e.name.toLowerCase() === normName ||
        normName.includes(e.name.toLowerCase())
      );
      
      if (matchingEmotion) {
        normalizedEmotions[matchingEmotion.name.toLowerCase()] = value;
      }
    }
    
    if (Object.keys(normalizedEmotions).length === 0) {
      return new THREE.Color(0.7, 0.7, 0.7); // Gray for unrecognized emotions
    }
    
    // Sort emotions by intensity (highest first)
    const sortedEmotions = Object.entries(normalizedEmotions)
      .sort((a, b) => b[1] - a[1]);
    
    // If there's only one emotion or the top one is very dominant (>0.7)
    if (sortedEmotions.length === 1 || sortedEmotions[0][1] > 0.7) {
      const dominantEmotionName = sortedEmotions[0][0];
      // Find matching emotion in our defined set
      const dominantEmotion = this.emotions.find(e => 
        e.name.toLowerCase() === dominantEmotionName
      );
      
      if (dominantEmotion) {
        const color = dominantEmotion.color;
        return new THREE.Color(color[0], color[1], color[2]);
      }
      return new THREE.Color(0.7, 0.7, 0.7);
    }
    
    // Get top two emotions for blending
    const topEmotionName = sortedEmotions[0][0];
    const secondEmotionName = sortedEmotions.length > 1 ? sortedEmotions[1][0] : topEmotionName;
    
    // Find matching emotions in our defined set
    const topEmotion = this.emotions.find(e => e.name.toLowerCase() === topEmotionName);
    const secondEmotion = this.emotions.find(e => e.name.toLowerCase() === secondEmotionName);
    
    if (!topEmotion || !secondEmotion) {
      return new THREE.Color(0.7, 0.7, 0.7);
    }
    
    // Calculate weights (normalized to sum to 1.0)
    const topVal = sortedEmotions[0][1];
    const secondVal = sortedEmotions.length > 1 ? sortedEmotions[1][1] : 0;
    
    const total = topVal + secondVal;
    if (total === 0) {
      return new THREE.Color(0.7, 0.7, 0.7);
    }
    
    const w1 = topVal / total;
    const w2 = secondVal / total;
    
    // Blend the colors
    const c1 = topEmotion.color;
    const c2 = secondEmotion.color;
    
    const blended = [
      c1[0] * w1 + c2[0] * w2,
      c1[1] * w1 + c2[1] * w2,
      c1[2] * w1 + c2[2] * w2
    ];
    
    return new THREE.Color(blended[0], blended[1], blended[2]);
  }
  
  /**
   * Update the legend position to follow the camera
   */
  updatePosition() {
    if (!this.legendGroup || !this.visible) return;
    
    try {
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
      position.addScaledVector(cameraDirection, this.options.position.distance);
      position.addScaledVector(rightVector, -this.options.position.leftOffset);
      position.addScaledVector(upVector, -this.options.position.downOffset);
      
      // Update legend position
      this.legendGroup.position.copy(position);
      
      // Make the legend face the camera
      this.legendGroup.lookAt(cameraPosition);
    } catch (error) {
      console.error('Error updating emotion legend position:', error);
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  dispose() {
    if (this.legendGroup) {
      // Properly dispose of all THREE.js resources
      this.legendGroup.traverse((object) => {
        if (object.isMesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      });
      
      // Remove from scene
      if (this.legendGroup.parent) {
        this.legendGroup.parent.remove(this.legendGroup);
      }
    }
  }

  /**
   * Show the emotion legend
   */
  show() {
    if (!this.visible && this.legendGroup) {
      try {
        this.legendGroup.visible = true;
        this.visible = true;
        console.log('EmotionLegend: show');
      } catch (error) {
        console.error('Error showing emotion legend:', error);
      }
    }
  }

  /**
   * Hide the emotion legend
   */
  hide() {
    if (this.visible && this.legendGroup) {
      try {
        this.legendGroup.visible = false;
        this.visible = false;
        console.log('EmotionLegend: hide');
      } catch (error) {
        console.error('Error hiding emotion legend:', error);
      }
    }
  }

  /**
   * Toggle emotion legend visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }
} 