# Andy Warhol 3D Journal Visualization

An immersive WebXR experience visualizing Andy Warhol's journals as a 3D mindmap, viewable on the Oculus Quest 3.

## Project Overview

This application analyzes approximately 2,000 journal entries from "The Andy Warhol Diaries" using NLP to create an interactive emotional and thematic landscape that users can explore in VR.

## Current Status

**Phases 1, 2, and 3: Data Processing, Basic WebXR Environment, and Visualization Features are complete.** The processed journal data is available in `public/data/warhol_complete.json`, the basic WebXR environment is functional, and core visualization features (emotional coloring, interaction, entry display, related entry highlighting, audio) are implemented. The project is now ready for Phase 4: Refinement & Testing.

**Phase 4.4: Bug Fixes and Refinements is complete.** Key improvements include:
- Changed audio mute toggle from spacebar to 'I' key to prevent control conflicts
- Fixed issue where orbs would freeze when selected in performance-optimized mode
- Enhanced error handling and resource management
- Added JSON optimization to reduce file size by removing embeddings

**Phase 5: SuperCollider Audio Implementation is complete.** We've replaced the Web Audio API-based system with a more sophisticated SuperCollider implementation:
- Implemented dynamic, algorithmic compositions based on journal entry emotion values
- Created unique instruments for each emotion with parameterized tempo and timbre
- Established OSC communication between the web application and SuperCollider
- Added volume control via OSC messages
- Simplified the AudioSystem class to focus exclusively on OSC communication
- Enhanced error handling and diagnostic capabilities

## Setup

### Prerequisites

- Node.js (v14+)
- npm (v6+)
- A WebXR-compatible device (like Oculus Quest 3) or browser for testing
- SuperCollider (v3.13+) - required for audio features

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Start the SuperCollider server:
   - Open SuperCollider
   - Open the file `supercollider/warholEmotions.scd`
   - Execute the script (select all and press Ctrl+Enter or Cmd+Enter)
   - Confirm that the server booted successfully in the Post window

4. Start the WebSocket-OSC bridge:
```bash
npm run bridge
```

5. Start the development server:
```bash
npm run dev
```

6. For VR testing:
   - Connect your Oculus Quest 3 to the same network as your development machine
   - Navigate to the development server URL on the Quest browser
   - Click the VR button to enter immersive mode

7. Audio Testing:
   - Select a journal entry orb to trigger SuperCollider audio
   - The application will automatically connect to SuperCollider via the bridge
   - If you see "SuperCollider audio connected via WebSocket!" notification, the connection is working
   - Each journal entry's emotion values will control the audio mix in real-time

## Project Structure

```
/
├── public/                     # Static files served directly
│   ├── data/
│   │   ├── warhol_final.json   # Final processed data for visualization (large file)
│   │   ├── warhol_final_optimized.json # Size-optimized data without embeddings
│   │   └── sample.json         # Smaller sample data for testing
│   └── sounds/                 # (No longer used - replaced by SuperCollider)
├── src/                        # Source code for the WebXR application
│   ├── controllers/
│   │   ├── DesktopControls.js  # Handles keyboard/mouse navigation
│   │   └── VRController.js     # Handles VR controller input and movement
│   ├── ui/
│   │   ├── AudioControls.js    # UI for managing audio settings
│   │   ├── EmotionLegend.js    # Displays the color legend for emotions
│   │   ├── Minimap.js          # Renders a 2D minimap of the 3D space
│   │   └── Notifications.js    # Handles displaying in-app messages
│   ├── utils/
│   │   ├── AudioSystem.js      # OSC communication with SuperCollider
│   │   ├── OscBridge.js        # WebSocket-OSC bridge communication
│   │   ├── InteractionManager.js # Handles raycasting and object selection
│   │   └── data-loader.js      # Loads the main journal data
│   ├── visualizers/
│   │   └── OrbVisualizer.js    # Creates and manages the 3D orbs representing entries
│   └── main.js                 # Main application entry point, initializes Three.js/WebXR
├── supercollider/              # SuperCollider files for audio generation
│   ├── warholEmotions.scd      # SuperCollider synthesis engine for emotion-based audio
│   └── README.md               # Instructions for SuperCollider setup
├── data_processing/            # Python scripts for data extraction & NLP (Runs locally)
│   ├── extract_text.py         # Extracts text from PDF
│   ├── parse_entries.py        # Parses text into structured journal entries
│   ├── process_warhol_entries.py # Analyzes entries with OpenAI (emotions, topics, etc.)
│   ├── final_processing.py     # Generates embeddings, UMAP coordinates, relationships
│   ├── optimize_json.py        # Removes embeddings to create size-optimized JSON
│   ├── visualize_embeddings.py # Utility script for visualizing embeddings (optional)
│   ├── ... (other utility scripts)
│   ├── requirements.txt        # Python dependencies
│   └── README.md               # Specific instructions for data processing
├── output/                     # Intermediate and final outputs from data processing
│   ├── parsed_entries.json     # Initial parsed entries before full NLP
│   ├── warhol_all_processed.json # Intermediate file with all NLP results/embeddings
│   ├── warhol_final.json       # Final data ready for visualization (copied to public/data)
│   └── warhol_final_optimized.json # Optimized data with embeddings removed
├── index.html                  # HTML entry point for the web app
├── vite.config.js              # Vite build configuration
├── package.json                # Node.js project dependencies and scripts
├── masterplan.md               # Detailed project plan
├── README.md                   # This file (project overview)
└── .gitignore                  # Git ignore rules
```

## Technologies

- Three.js and WebXR for 3D visualization
- Vite for fast development
- SuperCollider for algorithmic audio composition
- osc.js and WebSockets for Open Sound Control communication
- **Data Processing:**
  - Python
  - pdfplumber
  - OpenAI APIs (GPT-4o mini, text-embedding-3-large)
  - UMAP (via `umap-learn` library)

## License

This project is created as a class assignment and is not licensed for public use.

## Controls

### Keyboard Controls
- **WASD/Arrow Keys**: Movement in viewing direction
- **Mouse Drag**: Camera rotation
- **Shift**: Move down
- **Space**: Move up
- **T**: Toggle audio controls panel
- **M**: Toggle minimap
- **E**: Toggle emotion legend
- **P**: Toggle performance optimizations
- **F**: Toggle performance monitor
- **I**: Toggle audio mute/unmute