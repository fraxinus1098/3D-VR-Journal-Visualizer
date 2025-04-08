# Andy Warhol 3D Journal Visualization

An immersive WebXR experience visualizing Andy Warhol's journals as a 3D mindmap, viewable on the Oculus Quest 3.

## Project Overview

This application analyzes approximately 2,000 journal entries from "The Andy Warhol Diaries" using NLP to create an interactive emotional and thematic landscape that users can explore in VR.

## Setup

### Prerequisites

- Node.js (v14+)
- npm (v6+)
- A WebXR-compatible device (like Oculus Quest 3) or browser for testing

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

4. For VR testing:
   - Connect your Oculus Quest 3 to the same network as your development machine
   - Navigate to the development server URL on the Quest browser
   - Click the VR button to enter immersive mode

## Project Structure

```
/
├── public/            # Static files
│   └── data/          # Processed journal data
├── src/               # Source code
│   ├── components/    # Three.js and UI components
│   ├── utils/         # Utility functions
│   └── main.js        # Entry point
├── index.html         # HTML template
└── vite.config.js     # Vite configuration
```

## Technologies

- Three.js and WebXR for 3D visualization
- Vite for fast development
- Web Audio API for spatial audio
- Processed data from OpenAI APIs

## License

This project is created as a class assignment and is not licensed for public use.