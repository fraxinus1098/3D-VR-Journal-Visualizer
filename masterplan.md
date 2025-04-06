# Andy Warhol 3D Journal Visualization - Project Masterplan

## 1. Project Overview
This project creates an immersive WebXR experience visualizing Andy Warhol's journals as a 3D mindmap viewable on the Oculus Quest 3. The application analyzes ~4,000 journal entries from "The Andy Warhol Diaries" using NLP to create an interactive emotional and thematic landscape that users can explore in VR.

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

#### Phase 1.1: Environment Setup and PDF Extraction
**Tasks:**
- Set up Python development environment
- Create project structure
- Implement PDF text extraction with pdfplumber

**Key Points:**
- Extract full text from "The Andy Warhol Diaries" PDF

#### Phase 1.2: Entry Parsing and Structure
**Tasks:**
- Develop regex pattern to identify journal entries
- Parse text into structured entries
- Create basic data structure for entries

**Key Points:**
- Focus on pattern matching for "Day, Month DD, YYYY" format
- Extract location information when available
- Store entries in a structured format (e.g., list of dictionaries)

#### Phase 1.3: OpenAI Integration for Analysis
**Tasks:**
- Set up OpenAI API credentials
- Group entries by year for batch processing
- Implement sentiment analysis, topic extraction, and entity recognition with GPT-4o mini in batches
- Generate embeddings with text-embedding-3-large in batches
- Save interim results by batch and year

**Key Points:**
- Process entries in batches of per each year to stay within API token limits
- Group by year for logical processing units and checkpointing
- Extract Plutchik's 8 emotions with 0.0-1.0 scale
- Extract topics and entities (people, places) in the same API call
- Implement proper error handling and retry logic for API calls
- Save interim results regularly to prevent data loss
- Maintain original 3,072 dimension embeddings for UMAP processing

#### Phase 1.4: Dimensionality Reduction and Final Data
**Tasks:**
- Apply UMAP for 3D coordinate generation
- Generate related entries based on embedding similarity
- Structure and save final JSON output

**Key Points:**
- Use 3 components in UMAP for 3D visualization
- Calculate entry relationships based on cosine similarity
- Scale coordinates appropriately for Three.js visualization
- Create comprehensive JSON structure with all required fields

### Phase 2: Basic WebXR Environment (Estimated time: 2-3 hours)

#### Phase 2.1: Project Setup and Three.js Initialization
**Tasks:**
- Set up Vite project
- Install Three.js dependencies
- Create basic project structure

**Key Points:**
- Use Vite for fast development experience
- Organize code with clear component separation
- Copy processed data to public directory

#### Phase 2.2: Basic Scene and Camera Configuration
**Tasks:**
- Create Three.js scene
- Set up camera and renderer
- Add basic lighting for the environment

**Key Points:**
- Use dark space-like background
- Position camera at typical standing height
- Add ambient and directional lighting
- Implement window resize handling

#### Phase 2.3: WebXR and Controller Setup
**Tasks:**
- Enable WebXR in Three.js
- Add VR button for immersive experience
- Set up controller models and interactions
- Implement continuous movement controls

**Key Points:**
- Import WebXR components from Three.js examples
- Set up controller event listeners
- Add ray visualization for interaction guidance
- Configure continuous movement with appropriate speed and controls

#### Phase 2.4: Data Loading and Basic Visualization
**Tasks:**
- Create data loading utility
- Generate basic orbs for journal entries
- Position orbs according to UMAP coordinates

**Key Points:**
- Load JSON data asynchronously
- Create spheres for each journal entry
- Position according to pre-calculated coordinates
- Store entry data with each orb for later interaction

### Phase 3: Visualization Features (Estimated time: 2-3 hours)

#### Phase 3.1: Emotion Color Mapping and Orb Styling
**Tasks:**
- Create color mapping for Plutchik's emotions
- Update orb materials with emotion colors
- Add visual effects based on emotion intensity

**Key Points:**
- Assign distinctive colors to each emotion
- Use emissive materials for glow effect
- Scale orb size based on emotional intensity
- Implement function to determine dominant emotion

#### Phase 3.2: Selection and Interaction System
**Tasks:**
- Implement raycaster for selecting orbs
- Create interaction events
- Add visual feedback for selection

**Key Points:**
- Set up controller-based raycasting
- Create event system for selection notifications
- Add highlight effect for selected orbs
- Store selection state for other components to access

#### Phase 3.3: Entry Panel Display
**Tasks:**
- Create floating panel for entry display
- Add text rendering system
- Implement panel positioning and controls

**Key Points:**
- Position panel at comfortable reading distance
- Make panel follow user's gaze/position
- Format entry text with date, content, topics, and entities
- Add close button for dismissing panel
- Ensure text is readable in VR

#### Phase 3.4: Related Entries Highlighting
**Tasks:**
- Implement highlighting of related entries
- Create visual connections between entries
- Add toggle functionality

**Key Points:**
- Highlight related orbs when an entry is selected
- Create lines connecting related entries
- Create map for quick lookup of orbs by entry ID
- Implement cleanup when deselecting entries

#### Phase 3.5: Audio System Implementation
**Tasks:**
- Create audio system with ambient sounds
- Implement proximity-based audio blending
- Add interaction sounds for feedback

**Key Points:**
- Use Web Audio API for spatial audio
- Create different audio characteristics for each emotion
- Implement crossfading based on proximity to emotional clusters
- Add subtle interaction sounds for selections

### Phase 4: Refinement & Testing (Estimated time: 1-2 hours)

#### Phase 4.1: Performance Optimizations
**Tasks:**
- Implement frustum culling for distant objects
- Apply level-of-detail techniques
- Optimize render performance

**Key Points:**
- Only render objects in the camera's view frustum
- Use simpler materials for distant objects
- Consider instanced meshes for similar orbs if performance issues arise
- Test performance on Quest 3 hardware

#### Phase 4.2: Deployment Preparation
**Tasks:**
- Set up GitHub repository
- Configure build process for production
- Create deployment scripts

**Key Points:**
- Initialize Git repository
- Configure Vite for GitHub Pages base path
- Add appropriate scripts to package.json
- Create proper .gitignore file

#### Phase 4.3: Testing and Final Deployment
**Tasks:**
- Test locally with WebXR emulator
- Build for production
- Deploy to GitHub Pages
- Test on Quest 3

**Key Points:**
- Add fallback controls for non-VR testing
- Create production build with optimizations
- Deploy to GitHub Pages
- Test thoroughly on Quest 3 device
- Document the testing process

## 9. Technical Implementation Details

### Data Processing
```python
# Key components for Python processing script

# 1. PDF text extraction
import pdfplumber

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

# 2. Entry parsing
import re

def parse_entries(text):
    # Pattern for entry headers: Day, Month DD, YYYY
    pattern = r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})'
    
    # Split by pattern
    entries = []
    # Implementation details...
    
    return entries

# 3. OpenAI API integration with batch processing
import openai
import time
from tqdm import tqdm

def analyze_entries_batch(entries_batch):
    # Prepare batch of entries for analysis
    entries_text = "\n\n".join([f"[{entry['id']}]: {entry['text']}" for entry in entries_batch])
    
    comprehensive_prompt = f"""
    Analyze the following journal entries from Andy Warhol and provide:
    
    1. Emotion rating: Rate the intensity of each emotion on a scale of 0.0 to 1.0:
       - Anger
       - Anticipation
       - Joy
       - Trust
       - Fear
       - Surprise
       - Sadness
       - Disgust
    
    2. Topics: Identify 1-5 main topics discussed in each entry (e.g., art, business, celebrities, etc.)
    
    3. Entities: Extract named entities in these categories:
       - People: Names of individuals mentioned
       - Places: Locations mentioned
    
    Return a JSON array where each object contains:
    - "id" field matching the entry ID
    - "emotions" object with the emotions as keys and intensities as values
    - "topics" array with topic strings
    - "entities" object with "people" and "places" arrays
    
    Entries:
    {entries_text}
    """
    
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You analyze text and return structured JSON."},
                {"role": "user", "content": comprehensive_prompt}
            ]
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error in API call: {e}")
        time.sleep(20)  # Simple backoff
        return None

def get_embeddings_batch(texts):
    # Process embeddings in batches
    try:
        response = openai.embeddings.create(
            model="text-embedding-3-large",
            input=texts
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"Error in embeddings API call: {e}")
        time.sleep(20)  # Simple backoff
        return None

# Process entries by year
entries_by_year = {}  # Group entries by year
for entry in entries:
    year = entry['date'].split('-')[0]
    if year not in entries_by_year:
        entries_by_year[year] = []
    entries_by_year[year].append(entry)

# Process each year's entries
all_processed_entries = []
for year, year_entries in entries_by_year.items():
    print(f"Processing {len(year_entries)} entries from {year}...")
    
    # Process in smaller batches
    batch_size = 30  # Adjust based on average entry length
    for i in range(0, len(year_entries), batch_size):
        current_batch = year_entries[i:i+batch_size]
        
        # 1. Get comprehensive analysis (emotions, topics, entities)
        analysis_results = analyze_entries_batch(current_batch)
        if not analysis_results:
            continue
            
        # 2. Get embeddings (smaller batches for embeddings if needed)
        embedding_texts = [entry["text"] for entry in current_batch]
        embedding_batch_size = 10
        all_embeddings = []
        
        for j in range(0, len(embedding_texts), embedding_batch_size):
            batch_texts = embedding_texts[j:j+embedding_batch_size]
            batch_embeddings = get_embeddings_batch(batch_texts)
            if batch_embeddings:
                all_embeddings.extend(batch_embeddings)
        
        # 3. Combine results
        for idx, entry in enumerate(current_batch):
            if idx < len(analysis_results) and idx < len(all_embeddings):
                entry_analysis = next((e for e in analysis_results if e["id"] == entry["id"]), None)
                if entry_analysis:
                    processed_entry = entry.copy()
                    processed_entry["emotions"] = entry_analysis["emotions"]
                    processed_entry["topics"] = entry_analysis["topics"]
                    processed_entry["entities"] = entry_analysis["entities"]
                    processed_entry["embedding"] = all_embeddings[idx]
                    all_processed_entries.append(processed_entry)
        
        # Save interim results for this batch
        with open(f'warhol_{year}_batch_{i}.json', 'w') as f:
            json.dump(all_processed_entries, f)
            
    # Save year results
    with open(f'warhol_{year}_processed.json', 'w') as f:
        json.dump(all_processed_entries, f)

# Final merge into one file
with open('warhol_complete.json', 'w') as f:
    json.dump({"entries": all_processed_entries}, f)

# 4. Dimensionality reduction
from umap import UMAP

def generate_coordinates(embeddings):
    umap_3d = UMAP(n_components=3, random_state=42)
    coordinates = umap_3d.fit_transform(embeddings)
    return coordinates
```

### WebXR Implementation
```javascript
// Key components for Three.js implementation

// 1. Basic setup
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 3);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  
  // Controller setup, navigation, etc.
}

// 2. Data visualization
function createVisualization(data) {
  // Create orbs for each entry
  data.entries.forEach(entry => {
    const orb = createOrb(entry);
    scene.add(orb);
  });
}

function createOrb(entry) {
  // Create sphere with emotion-based color
  const emotionColor = getEmotionColor(entry.emotions);
  const geometry = new THREE.SphereGeometry(0.1, 32, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: emotionColor,
    emissive: emotionColor,
    emissiveIntensity: 0.5
  });
  
  const orb = new THREE.Mesh(geometry, material);
  orb.position.set(entry.coordinates.x, entry.coordinates.y, entry.coordinates.z);
  
  // Add interaction capabilities
  orb.userData.entry = entry;
  orb.userData.interactive = true;
  
  return orb;
}

// 3. Entry display panel
function createEntryPanel(entry) {
  // Create floating panel with entry text
  const panel = new THREE.Group();
  
  // Background panel
  const panelGeometry = new THREE.PlaneGeometry(1, 0.8);
  const panelMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x111111,
    transparent: true,
    opacity: 0.8
  });
  const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.add(panelMesh);
  
  // Text implementation (using HTML and CSS in a WebGLRenderer)
  // Alternative: three-mesh-ui or troika-three-text
  
  return panel;
}

// 4. Audio implementation
function setupAudio() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const emotionSounds = {};
  
  // Load emotion sound loops
  const emotions = ['anger', 'anticipation', 'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust'];
  emotions.forEach(emotion => {
    loadSound(emotion);
  });
  
  function loadSound(emotion) {
    const request = new XMLHttpRequest();
    request.open('GET', `sounds/${emotion}.mp3`, true);
    request.responseType = 'arraybuffer';
    
    request.onload = function() {
      audioContext.decodeAudioData(request.response, function(buffer) {
        emotionSounds[emotion] = {
          buffer: buffer,
          source: null,
          gain: audioContext.createGain()
        };
        emotionSounds[emotion].gain.connect(audioContext.destination);
      });
    };
    request.send();
  }
  
  function updateAudio(position) {
    // Calculate distances to emotion clusters
    // Update gain nodes for crossfading
  }
  
  return {
    updateAudio,
    playInteractionSound: () => { /* Implementation */ }
  };
}
```

## 10. Performance Considerations
- Limit concurrent audio sources to preserve performance
- Implement level-of-detail for distant orbs
- Optimize raycasting for interaction
- Implement frustum culling for distant objects