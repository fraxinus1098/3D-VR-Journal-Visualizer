# Andy Warhol 3D Journal Visualization - Project Masterplan

## 1. Project Overview
This project creates an immersive WebXR experience visualizing Andy Warhol's journals as a 3D mindmap viewable on the Oculus Quest 3. The application analyzes ~2,000 journal entries from "The Andy Warhol Diaries" using NLP to create an interactive emotional and thematic landscape that users can explore in VR.

## 2. Objectives
- Process and analyze Andy Warhol's journal entries using OpenAI APIs
- Create a 3D visualization of emotional patterns and thematic connections
- Develop a WebXR application compatible with Oculus Quest 3
- Enable interactive exploration of journal entries in an immersive environment

## 3. Target Audience
- Primary: You (for class project)
- Secondary: Anyone interested in Andy Warhol, data visualization, or VR experiences

## 4. Technical Stack

### Data Processing
- **Language**: Python
- **PDF Processing**: pdfplumber (for text extraction)
- **AI/NLP**: OpenAI APIs
  - GPT-4o mini (text processing)
  - text-embedding-3-large (vector embeddings)
- **Output Format**: JSON

### Visualization Application
- **Framework**: Three.js with WebXR API
- **Build Tool**: Vite
- **Deployment**: GitHub Pages
- **Audio**: Web Audio API
- **Dimensionality Reduction**: UMAP implementation for JavaScript

## 5. Data Architecture

### Data Processing Pipeline
1. Extract text from "The Andy Warhol Diaries" PDF
2. Process entries to identify dates and content
3. Process entries in logical batches (by year or month)
   - Generate sentiment analysis using GPT-4o mini API
   - Extract topics and entities (people, places) using GPT-4o mini API
   - Map to Plutchik's 8 emotions with intensity values (0.0-1.0)
   - Process within token limits (128K context window)
4. Generate embeddings using text-embedding-3-large in batches
   - Process entries within 8,191 token limit per embedding
   - Maintain full 3,072 dimension vectors for all entries
5. Store interim results by batch for processing resilience
6. Merge all processed batches into single comprehensive JSON file
7. Create clustering via UMAP dimensionality reduction on the complete dataset
8. Output final structured JSON for visualization

### Data Output Structure
```json
{
  "entries": [
    {
      "id": "1",
      "date": "1976-11-24",
      "location": "New York",
      "text": "Full journal entry text...",
      "emotions": {
        "joy": 0.7,
        "trust": 0.5,
        "fear": 0.1,
        "surprise": 0.2,
        "sadness": 0.0,
        "disgust": 0.0,
        "anger": 0.0,
        "anticipation": 0.3
      },
      "topics": ["art", "business", "friends"],
      "entities": {
        "people": ["Mick Jagger", "Fred Hughes"],
        "places": ["Factory", "Studio 54"]
      },
      "embedding": [0.23, 0.45, ...],
      "coordinates": {"x": 12.3, "y": 5.6, "z": -3.2},
      "relatedEntries": ["45", "67", "89"]
    }
  ]
}
```

## 6. Visualization Design

### 3D Space Organization
- Primary organization: Thematic clusters via embedding similarity
- Secondary dimension: Chronological progression
- UMAP for dimensionality reduction to 3D space

### Visual Elements
- **Orbs**: Represent individual journal entries
  - Color: Based on dominant emotion from Plutchik's wheel
  - Size: Based on emotional intensity
  - Position: Determined by UMAP clustering
- **Connections**: Visual links between related entries
- **Background**: Abstract space environment (minimalist style)

### Audio Design
- 8 base ambient loops (one per emotion)
- Dynamic crossfading based on proximity to emotional clusters
- Subtle interaction sounds when selecting entries

## 7. User Interaction

### Movement & Navigation
- Continuous movement using standard Quest 3 controllers
- Optional teleportation for quick navigation between distant clusters

### Entry Interaction
- Select orbs to display journal entry content
- Related entries highlighted when viewing specific entry
- Floating panel displays entry text and metadata

### Interface Elements
- Minimalist UI with intuitive controls
- Floating panel for text display
- Close buttons optimized for VR interaction

## 8. Implementation Plan

### Phase 1: Data Processing (Estimated time: 2-3 hours)
**Status:** Complete

#### Phase 1.1: Environment Setup and PDF Extraction
**Tasks:**
- [x] Set up Python development environment
- [x] Create project structure
- [x] Implement PDF text extraction with pdfplumber

#### Phase 1.2: Entry Parsing and Structure
**Tasks:**
- [x] Develop regex pattern to identify journal entries
- [x] Parse text into structured entries
- [x] Create basic data structure for entries

#### Phase 1.3: OpenAI Integration for Analysis
**Tasks:**
- [x] Set up OpenAI API credentials
- [x] Group entries by year for batch processing
- [x] Implement sentiment analysis, topic extraction, and entity recognition with GPT-4o mini in batches
- [x] Generate embeddings with text-embedding-3-large in batches
- [x] Save interim results by batch and year

#### Phase 1.4: Dimensionality Reduction and Final Data
**Tasks:**
- [x] Apply UMAP for 3D coordinate generation
- [x] Generate related entries based on embedding similarity
- [x] Structure and save final JSON output

**Key Points:**
- Use 3 components in UMAP for 3D visualization
- Calculate entry relationships based on cosine similarity
- Scale coordinates appropriately for Three.js visualization
- Create comprehensive JSON structure with all required fields
- Final data file: `public/data/warhol_complete.json`

### Phase 2: Basic WebXR Environment (Estimated time: 2-3 hours)
**Status:** Complete

#### Phase 2.1: Project Setup and Three.js Initialization
**Tasks:**
- [x] Set up Vite project
- [x] Install Three.js dependencies
- [x] Create basic project structure

**Key Points:**
- Use Vite for fast development experience
- Organize code with clear component separation
- Copy processed data to public directory

#### Phase 2.2: Basic Scene and Camera Configuration
**Tasks:**
- [x] Create Three.js scene
- [x] Set up camera and renderer
- [x] Add basic lighting for the environment

**Key Points:**
- Use dark space-like background
- Position camera at typical standing height
- Add ambient and directional lighting
- Implement window resize handling

#### Phase 2.3: WebXR and Controller Setup
**Tasks:**
- [x] Enable WebXR in Three.js
- [x] Add VR button for immersive experience
- [x] Set up controller models and interactions
- [x] Implement continuous movement controls
- [x] Implement desktop controls for non-VR testing

**Key Points:**
- Import WebXR components from Three.js examples
- Set up controller event listeners
- Add ray visualization for interaction guidance
- Configure continuous movement with appropriate speed and controls
- **Desktop Controls:**
  - WASD/Arrow keys for movement in viewing direction
  - Mouse drag for camera rotation (click and drag)
  - Space key to move up, Shift key to move down
  - Desktop controls active only when not in VR mode

#### Phase 2.4: Data Loading and Basic Visualization
**Tasks:**
- [x] Create data loading utility
- [x] Generate basic orbs for journal entries
- [x] Position orbs according to UMAP coordinates

**Key Points:**
- Load JSON data asynchronously
- Create spheres for each journal entry
- Position according to pre-calculated coordinates
- Store entry data with each orb for later interaction

### Phase 3: Visualization Features (Estimated time: 2-3 hours)
**Status:** Complete

#### Phase 3.1: Emotion Color Mapping and Orb Styling
**Tasks:**
- [x] Create color mapping for Plutchik's emotions
- [x] Update orb materials with emotion colors
- [x] Add visual effects based on emotion intensity

**Key Points:**
- Assign distinctive colors to each emotion
- Use emissive materials for glow effect
- Scale orb size based on emotional intensity
- Implement function to determine dominant emotion

#### Phase 3.2: Selection and Interaction System
**Tasks:**
- [x] Implement raycaster for selecting orbs
- [x] Create interaction events
- [x] Add visual feedback for selection

**Key Points:**
- Set up controller-based raycasting
- Create event system for selection notifications
- Add highlight effect for selected orbs
- Store selection state for other components to access

#### Phase 3.3: Entry Panel Display
**Tasks:**
- [x] Create floating panel for entry display
- [x] Add text rendering system
- [x] Implement panel positioning and controls

**Key Points:**
- Position panel at comfortable reading distance
- Make panel follow user's gaze/position
- Format entry text with date, content, topics, and entities
- Add close button for dismissing panel
- Ensure text is readable in VR

#### Phase 3.4: Related Entries Highlighting
**Tasks:**
- [x] Implement highlighting of related entries
- [x] Create visual connections between entries
- [x] Add toggle functionality

**Key Points:**
- Highlight related orbs when an entry is selected
- Create lines connecting related entries
- Create map for quick lookup of orbs by entry ID
- Implement cleanup when deselecting entries

#### Phase 3.5: Audio System Implementation
**Tasks:**
- [x] Create audio system with ambient sounds
- [x] Implement proximity-based audio blending
- [x] Add interaction sounds for feedback

**Key Points:**
- Use Web Audio API for spatial audio
- Create different audio characteristics for each emotion
- Implement crossfading based on proximity to emotional clusters
- Add subtle interaction sounds for selections

### Phase 4: Refinement & Testing (Estimated time: 1-2 hours)

#### Phase 4.1: Performance Optimizations
**Status:** Complete

**Tasks:**
- [x] Implement frustum culling for distant objects
- [x] Apply level-of-detail techniques
- [x] Optimize render performance

**Key Points:**
- Created PerformanceOptimizer class for frustum culling and LOD
- Implemented distance-based level-of-detail for orbs with lower geometry detail
- Added material simplification for distant objects
- Created PerformanceMonitor to visualize performance metrics
- Added keyboard toggles:
  - 'P' key to toggle performance optimizations
  - 'F' key to toggle performance monitor display
  - 'I' key to toggle audio mute (changed from spacebar)
- Implemented smart geometry caching to reduce memory usage
- Only update culling calculations every N frames to reduce CPU usage
- Added resource disposal functions to free memory when objects are no longer needed
- Fixed bug causing orbs to freeze when selected in performance-optimized mode

#### Phase 4.2: Development Optimization for Demonstration
**Tasks:**
- Configure local server for network access
- Optimize data loading for local network
- Create demonstration setup scripts

**Key Points:**
- Configure Vite for optimal local network access with HTTPS for WebXR compatibility
- Implement progressive loading or chunking for the large data file
- Create specific npm scripts for demonstration setup (e.g., `npm run demo`)
- Ensure stable performance across local WiFi networks for presentation

#### Phase 4.3: Testing and Presentation Setup
**Tasks:**
- Test locally with WebXR emulator
- Test on Quest 3 with Oculus Cast
- Prepare projector display setup
- Create user guide for demonstration

**Key Points:**
- Add fallback controls for non-VR testing
- Test Oculus Cast performance and quality for audience viewing
- Configure laptop for simultaneous Quest 3 connection and projector output
- Document step-by-step setup process for smooth presentation
- Create simple guide for presentation mode navigation

#### Phase 4.4: Bug Fixes and Refinements
**Status:** Complete

**Tasks:**
- [x] Fix audio control issues
- [x] Resolve performance optimization bugs
- [x] General stability improvements

**Key Points:**
- Changed audio mute toggle from spacebar to 'I' key to avoid conflicts with other controls
- Fixed bug where orbs would freeze when selected while performance optimizations were enabled
- Improved orb selection and highlighting with proper cleanup of materials and resources
- Enhanced performance optimizer to temporarily disable optimizations during selection interaction
- Added better error handling and recovery in selection workflow
- Implemented proper resource cleanup to prevent memory leaks