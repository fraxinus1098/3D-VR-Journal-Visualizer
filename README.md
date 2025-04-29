# Andy Warhol 3D Journal Visualization

An immersive WebXR experience visualizing Andy Warhol's journals as a 3D mindmap. Primarily designed for desktop interaction, with experimental WebXR support.

## Project Overview

This application analyzes approximately 2,000 journal entries from "The Andy Warhol Diaries" using NLP to create an interactive emotional and thematic landscape that users can explore in a 3D environment.

## Project Context

This project was developed as part of the Yale course "Nature, AI and Performance" (THST 359), taught by Matthew Suttor in Spring 2025. The course explored translating data from various sources – including natural phenomena and, in this case, textual archives – into artistic and performative expressions using AI and visualization technologies.

You can read more about the course and related projects in this Yale News article: [Novel course translates data from the natural world into art](https://news.yale.edu/2025/04/24/novel-course-translates-data-natural-world-art)

## Current Status: Project Complete (Desktop Focus)

**Phases 1, 2, 3, 4.1, and 4.4 are complete.** The project successfully processes journal data, sets up a basic WebXR environment, implements core visualization features, includes performance optimizations, and incorporates bug fixes.

- **Data:** The final, size-optimized data is available in `public/data/warhol_final_optimized.json`.
- **Visualization:** Core features like emotional coloring, interaction, entry display, and related entry highlighting are implemented.
- **Audio:** Uses the Web Audio API for ambient soundscapes based on emotional clusters (Phase 3.5 implementation).
- **Performance:** Includes optimizations like frustum culling and LOD (Phase 4.1), along with bug fixes (Phase 4.4).

**Key Changes & Limitations:**
- **Phase 5 (SuperCollider Audio) Abandoned:** Initial steps were completed (SynthDefs created in `supercollider/warholEmotions.scd`, OSC bridge tested locally), but integration with the WebXR front-end failed. The project reverted to the pre-existing Web Audio API system (Phase 3.5) using static sound files in `public/sounds/`.
- **Phase 4.2 & 4.3 Skipped:** Development optimization for demonstration and dedicated presentation setup were not undertaken.
- **VR Optimization Incomplete:** While WebXR is enabled, optimization for Oculus Quest 3 (or similar devices) was not fully realized due to unresolved bugs and performance issues with VR controllers and rendering lag. **The primary intended experience is via desktop browser.**

## Setup

### Prerequisites

- Node.js (v14+)
- npm (v6+)
- A modern web browser with WebGL support.
- (Optional) A WebXR-compatible device and browser for experimental VR viewing.

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Access the application via the provided URL in your browser.

5. **(Experimental) VR Mode:**
   - If using a VR device like Quest 3, ensure it's on the same network.
   - Navigate to the development server URL in the VR browser.
   - Click the VR button. *Note: Expect potential performance issues or controller problems.*

## Project Structure

```
/
├── public/                     # Static files served directly
│   ├── data/
│   │   ├── warhol_final.json   # Final processed data (large file, includes embeddings)
│   │   ├── warhol_final_optimized.json # Size-optimized data (used by app)
│   │   ├── sample.json         # Smaller sample data for testing
│   │   └── .gitattributes      # Git LFS configuration for large data file
│   └── sounds/                 # Background audio loops for emotions (used by Web Audio API)
│       ├── 1 - Joy.mp3
│       ├── ... (8 files total)
│       └── 8 - Anticipation.mp3
├── src/                        # Source code for the WebXR application
│   ├── controllers/
│   │   ├── DesktopControls.js  # Handles keyboard/mouse navigation
│   │   └── VRController.js     # Handles VR controller input (experimental/buggy)
│   ├── ui/
│   │   ├── AudioControls.js    # UI for managing audio settings
│   │   ├── EmotionLegend.js    # Displays the color legend for emotions
│   │   ├── Minimap.js          # Renders a 2D minimap of the 3D space
│   │   └── Notifications.js    # Handles displaying in-app messages
│   ├── utils/
│   │   ├── AudioSystem.js      # Manages Web Audio API playback
│   │   ├── InteractionManager.js # Handles raycasting and object selection
│   │   └── data-loader.js      # Loads the main journal data (`warhol_final_optimized.json`)
│   ├── visualizers/
│   │   └── OrbVisualizer.js    # Creates and manages the 3D orbs representing entries
│   └── main.js                 # Main application entry point, initializes Three.js/WebXR
├── supercollider/              # SuperCollider files (implemented but not integrated)
│   ├── warholEmotions.scd      # SuperCollider definitions for emotional instruments
│   ├── test_values.scd         # Script for testing SynthDefs
│   └── README.md               # Notes on SuperCollider setup
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
│   ├── warhol_final.json       # Final data (copied to public/data)
│   └── warhol_final_optimized.json # Optimized data (copied to public/data)
├── index.html                  # HTML entry point for the web app
├── vite.config.js              # Vite build configuration
├── package.json                # Node.js project dependencies and scripts
├── masterplan.md               # Detailed project plan (reflects final state)
├── README.md                   # This file (project overview)
└── .gitignore                  # Git ignore rules
```

## Technologies

- Three.js and WebXR for 3D visualization
- Vite for fast development
- **Web Audio API** for sound playback
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